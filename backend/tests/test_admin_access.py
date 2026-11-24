"""Integration tests for the SEO-expert-access (Part A) admin auth work.

These run against the configured test database and
the real env-based owner credentials from settings. They are self-cleaning:
any admin_users row / blog post created here is removed in tearDown/tearDownClass.

Run from the backend directory with:

    uv run python -m unittest discover -s tests -v
"""

import unittest
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from backend.auth import ACCESS_TOKEN_EXPIRE_HOURS, ALGORITHM
from backend.config import settings
from backend.main import app
from backend.models import AdminUser, BlogPost
from backend.security import hash_password
from tests.base import reset_login_attempts, test_engine

EDITOR_PASSWORD = "editor-test-password-123"
EDITOR_REDIRECT_ROUTES = {
    ("GET", "/admin/redirects"),
    ("POST", "/admin/redirects"),
    ("DELETE", "/admin/redirects/{redirect_id}"),
}
EDITOR_COURSE_ROUTES = {
    ("GET", "/admin/courses"),
    ("GET", "/admin/courses/{course_id}"),
    ("PATCH", "/admin/courses/{course_id}"),
}
EDITOR_IMAGE_ALT_ROUTES = {
    ("GET", "/admin/image-alts"),
    ("POST", "/admin/image-alts"),
    ("PUT", "/admin/image-alts/{image_alt_id}"),
    ("DELETE", "/admin/image-alts/{image_alt_id}"),
}
EDITOR_ROUTE_EXCEPTIONS = EDITOR_REDIRECT_ROUTES | EDITOR_COURSE_ROUTES | EDITOR_IMAGE_ALT_ROUTES


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _legacy_owner_token() -> str:
    """A token shaped exactly like the pre-role JWT: sub + iat + exp only."""
    payload = {
        "sub": settings.admin_username,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


def _admin_paths() -> dict:
    return app.openapi()["paths"]


def _roles_of_depends(fn):
    """Extract the allowed-roles set captured by a require_roles closure."""
    if fn is None:
        return set()
    if hasattr(fn, "dependency"):
        fn = fn.dependency
    found = set()
    for cell in getattr(fn, "__closure__", None) or ():
        value = cell.cell_contents
        if isinstance(value, (set, frozenset)) and set(value) <= {"owner", "seo_editor"}:
            found |= set(value)
    return found


def _route_roles(route) -> set:
    roles = set()
    for dep in getattr(route, "dependencies", []) or []:
        roles |= _roles_of_depends(dep)
    dependant = getattr(route, "dependant", None)
    for dep in getattr(dependant, "dependencies", []) or []:
        roles |= _roles_of_depends(getattr(dep, "call", None))
    return roles or {"(unknown)"}


def _admin_route_roles():
    """Yield (method, path, sorted roles) for every /admin route, in order."""
    rows = []
    for r in app.router.routes:
        orig = getattr(r, "original_router", None)
        routes = getattr(orig, "routes", []) if orig is not None else []
        for route in routes:
            if not isinstance(route, APIRoute):
                continue
            if not route.path.startswith("/admin"):
                continue
            roles = sorted(_route_roles(route))
            for method in sorted(route.methods):
                rows.append((method.upper(), route.path, roles))
    return sorted(rows)


class AdminAccessTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        reset_login_attempts()
        cls.client = TestClient(app)

        # Env-based owner login (also proves the unchanged owner path works).
        owner_resp = cls.client.post(
            "/auth/login",
            json={"username": settings.admin_username, "password": settings.admin_password},
        )
        assert owner_resp.status_code == 200, owner_resp.text
        cls.owner_token = owner_resp.json()["access_token"]

        # Create a seo_editor directly in the DB (no user-management endpoints yet).
        cls.editor_email = f"seo-test-{uuid.uuid4().hex}@example.com"
        with Session(test_engine) as session:
            editor = AdminUser(
                name="SEO Test Editor",
                email=cls.editor_email,
                password_hash=hash_password(EDITOR_PASSWORD),
                role="seo_editor",
                is_active=True,
            )
            session.add(editor)
            session.commit()
            session.refresh(editor)
            cls.editor_id = editor.id

        editor_resp = cls.client.post(
            "/auth/login",
            json={"username": cls.editor_email, "password": EDITOR_PASSWORD},
        )
        assert editor_resp.status_code == 200, editor_resp.text
        cls.editor_token = editor_resp.json()["access_token"]

    @classmethod
    def tearDownClass(cls):
        with Session(test_engine) as session:
            user = session.get(AdminUser, cls.editor_id)
            if user is not None:
                session.delete(user)
                session.commit()
        test_engine.dispose()

    # ── (a) Owner-only admin routes stay forbidden to seo_editor.
    def test_seo_editor_forbidden_on_owner_routes(self):
        skip_prefixes = ("/admin/blog",)
        skip_paths = {"/admin/me"}
        for path, methods in _admin_paths().items():
            if not path.startswith("/admin"):
                continue
            if path in skip_paths or path.startswith(skip_prefixes):
                continue
            for method in methods:
                if method.lower() not in ("get", "post", "put", "patch", "delete"):
                    continue
                if (method.upper(), path) in EDITOR_ROUTE_EXCEPTIONS:
                    continue
                url = path.replace("{enrollment_id}", "1") \
                           .replace("{student_id}", "1") \
                           .replace("{conversation_id}", "1") \
                           .replace("{trial_request_id}", "1") \
                           .replace("{user_id}", "1")
                with self.subTest(method=method, path=path):
                    resp = self.client.request(
                        method,
                        url,
                        headers=_auth(self.editor_token),
                        json={} if method.lower() in ("post", "patch") else None,
                    )
                    self.assertEqual(
                        resp.status_code,
                        403,
                        f"{method} {path} should be 403 for seo_editor, got {resp.status_code}: {resp.text}",
                    )

    # ── (b) seo_editor gets 200 on blog routes
    def test_seo_editor_allowed_on_blog_routes(self):
        resp = self.client.get("/admin/blog", headers=_auth(self.editor_token))
        self.assertEqual(resp.status_code, 200, resp.text)

        # Create a post as the owner so the editor can GET it by id.
        with Session(test_engine) as session:
            post = BlogPost(
                title="SEO access test post",
                slug=f"seo-access-test-{uuid.uuid4().hex[:8]}",
                excerpt="test",
                content="test",
                status="draft",
            )
            session.add(post)
            session.commit()
            session.refresh(post)
            post_id = post.id
            slug = post.slug
        try:
            resp = self.client.get(
                f"/admin/blog/{post_id}", headers=_auth(self.editor_token)
            )
            self.assertEqual(resp.status_code, 200, resp.text)
        finally:
            with Session(test_engine) as session:
                post = session.get(BlogPost, post_id)
                if post is not None:
                    session.delete(post)
                    session.commit()

    def test_seo_editor_me(self):
        resp = self.client.get("/admin/me", headers=_auth(self.editor_token))
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertEqual(body["role"], "seo_editor")
        self.assertEqual(body["email"], self.editor_email)

    # ── (c) deactivated editor with a still-valid token gets 401
    def test_deactivated_editor_token_rejected(self):
        email = f"seo-deactivated-{uuid.uuid4().hex}@example.com"
        with Session(test_engine) as session:
            editor = AdminUser(
                name="SEO Deactivated",
                email=email,
                password_hash=hash_password(EDITOR_PASSWORD),
                role="seo_editor",
                is_active=True,
            )
            session.add(editor)
            session.commit()
            session.refresh(editor)
            editor_id = editor.id

        login = self.client.post(
            "/auth/login", json={"username": email, "password": EDITOR_PASSWORD}
        )
        self.assertEqual(login.status_code, 200, login.text)
        token = login.json()["access_token"]

        try:
            with Session(test_engine) as session:
                editor = session.get(AdminUser, editor_id)
                editor.is_active = False
                session.add(editor)
                session.commit()

            resp = self.client.get("/admin/me", headers=_auth(token))
            self.assertEqual(resp.status_code, 401, resp.text)
        finally:
            with Session(test_engine) as session:
                editor = session.get(AdminUser, editor_id)
                if editor is not None:
                    session.delete(editor)
                    session.commit()

    # ── (d) old owner token without a role claim still works
    def test_legacy_owner_token_without_role(self):
        token = _legacy_owner_token()
        resp = self.client.get("/admin/summary", headers=_auth(token))
        self.assertEqual(resp.status_code, 200, resp.text)

    # ── (e) env-owner login works and owner can access admin endpoints
    def test_env_owner_login_and_access(self):
        login = self.client.post(
            "/auth/login",
            json={"username": settings.admin_username, "password": settings.admin_password},
        )
        self.assertEqual(login.status_code, 200, login.text)
        token = login.json()["access_token"]

        for path in ("/admin/summary", "/admin/students", "/admin/blog", "/admin/me"):
            with self.subTest(path=path):
                resp = self.client.get(path, headers=_auth(token))
                self.assertEqual(resp.status_code, 200, f"{path}: {resp.text}")

    # ── (f) wrong DB-user password gives a generic 401
    def test_wrong_db_password_is_generic_401(self):
        resp = self.client.post(
            "/auth/login",
            json={"username": self.editor_email, "password": "definitely-wrong"},
        )
        self.assertEqual(resp.status_code, 401, resp.text)
        self.assertEqual(resp.json()["detail"], "Invalid credentials")

    def test_owner_me_has_null_email(self):
        resp = self.client.get("/admin/me", headers=_auth(self.owner_token))
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertEqual(body["role"], "owner")
        self.assertIsNone(body["email"])

    # ── (g) Only the explicit admin exceptions are seo_editor-reachable.
    def test_admin_route_role_table(self):
        """Check the exact exception list beyond blog and /admin/me."""
        reachable_by_editor = set()
        for method, path, roles in _admin_route_roles():
            if "seo_editor" in roles and not path.startswith("/admin/blog") and path != "/admin/me":
                reachable_by_editor.add((method, path))
        self.assertEqual(
            reachable_by_editor,
            EDITOR_ROUTE_EXCEPTIONS,
        )

    # ── (h) no response body leaks the password_hash column
    def test_no_response_body_contains_password_hash(self):
        probes = [
            ("GET", "/admin/summary"),
            ("GET", "/admin/students"),
            ("GET", "/admin/enrollments"),
            ("GET", "/admin/conversations"),
            ("GET", "/admin/trial-requests"),
            ("GET", "/admin/blog"),
            ("GET", "/admin/me"),
            ("GET", "/admin/analytics/course-enrollments"),
        ]
        tokens = [self.owner_token, self.editor_token]
        for token in tokens:
            for method, path in probes:
                with self.subTest(token=token[:8], method=method, path=path):
                    resp = self.client.request(method, path, headers=_auth(token))
                    self.assertNotIn("password_hash", resp.text)

    # ── (i) missing token and garbage token both 401 on an /admin route
    def test_missing_and_garbage_token_return_401(self):
        for headers in (None, _auth("not-a-real-token")):
            with self.subTest(headers=headers):
                resp = self.client.get("/admin/summary", headers=headers)
                self.assertEqual(resp.status_code, 401, resp.text)


if __name__ == "__main__":
    unittest.main()
