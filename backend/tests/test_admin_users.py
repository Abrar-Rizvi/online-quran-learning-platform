"""Part B tests: owner-only admin-user management + audit-log access control."""

import unittest
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from backend.config import settings
from backend.main import app
from backend.models import AdminUser
from tests.base import reset_login_attempts, test_engine

OWNER_HEADERS_DEFAULT = None  # set in setUpClass


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class AdminUsersTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        reset_login_attempts()
        cls.client = TestClient(app)

        owner = cls.client.post(
            "/auth/login",
            json={"username": settings.admin_username, "password": settings.admin_password},
        )
        assert owner.status_code == 200, owner.text
        cls.owner_token = owner.json()["access_token"]
        cls.owner_headers = _auth(cls.owner_token)

        # A second admin user (seo_editor) for the 403 checks, created via the API.
        cls.editor_email = f"partb-editor-{uuid.uuid4().hex}@example.com"
        cls.editor_password = "editor-password-123"
        created = cls.client.post(
            "/admin/users",
            headers=cls.owner_headers,
            json={"name": "SEO Editor", "email": cls.editor_email, "password": cls.editor_password},
        )
        assert created.status_code == 201, created.text
        cls.editor_id = created.json()["id"]

        editor_login = cls.client.post(
            "/auth/login",
            json={"username": cls.editor_email, "password": cls.editor_password},
        )
        assert editor_login.status_code == 200, editor_login.text
        cls.editor_token = editor_login.json()["access_token"]

        cls.created_ids = [cls.editor_id]

    @classmethod
    def tearDownClass(cls):
        with Session(test_engine) as session:
            for uid in cls.created_ids:
                user = session.get(AdminUser, uid)
                if user is not None:
                    session.delete(user)
            session.commit()
        reset_login_attempts()
        test_engine.dispose()

    # ── owner access ───────────────────────────────────────────────────────

    def test_list_users_as_owner(self):
        resp = self.client.get("/admin/users", headers=self.owner_headers)
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertIsInstance(body, list)
        emails = {u["email"] for u in body}
        self.assertIn(self.editor_email, emails)
        self.assertNotIn("password_hash", resp.text)

    def test_create_user_as_owner(self):
        email = f"partb-create-{uuid.uuid4().hex}@example.com"
        resp = self.client.post(
            "/admin/users",
            headers=self.owner_headers,
            json={"name": "New Editor", "email": email.upper(), "password": "created-password-123"},
        )
        self.assertEqual(resp.status_code, 201, resp.text)
        body = resp.json()
        self.created_ids.append(body["id"])
        self.assertEqual(body["role"], "seo_editor")
        self.assertEqual(body["email"], email.lower())  # trimmed + lowercased
        self.assertEqual(body["is_active"], True)
        self.assertNotIn("password_hash", resp.text)

        # The created editor can log in.
        login = self.client.post(
            "/auth/login", json={"username": email.lower(), "password": "created-password-123"}
        )
        self.assertEqual(login.status_code, 200, login.text)

    def test_create_user_rejects_role_field(self):
        resp = self.client.post(
            "/admin/users",
            headers=self.owner_headers,
            json={
                "name": "Wannabe Owner",
                "email": f"partb-role-{uuid.uuid4().hex}@example.com",
                "password": "long-enough-123",
                "role": "owner",
            },
        )
        self.assertEqual(resp.status_code, 422, resp.text)

    def test_create_user_duplicate_email_409(self):
        email = f"partb-dup-{uuid.uuid4().hex}@example.com"
        first = self.client.post(
            "/admin/users",
            headers=self.owner_headers,
            json={"name": "Dup", "email": email, "password": "dup-password-123"},
        )
        self.assertEqual(first.status_code, 201, first.text)
        self.created_ids.append(first.json()["id"])

        second = self.client.post(
            "/admin/users",
            headers=self.owner_headers,
            json={"name": "Dup2", "email": email, "password": "another-password-123"},
        )
        self.assertEqual(second.status_code, 409, second.text)

    def test_create_user_short_password_422(self):
        resp = self.client.post(
            "/admin/users",
            headers=self.owner_headers,
            json={"name": "Short", "email": f"partb-short-{uuid.uuid4().hex}@example.com", "password": "short"},
        )
        self.assertEqual(resp.status_code, 422, resp.text)

    # ── PATCH cases ────────────────────────────────────────────────────────

    def test_patch_unknown_user_404(self):
        resp = self.client.patch(
            "/admin/users/999999999", headers=self.owner_headers, json={"name": "X"}
        )
        self.assertEqual(resp.status_code, 404, resp.text)

    def test_patch_name_and_deactivate(self):
        email = f"partb-patch-{uuid.uuid4().hex}@example.com"
        created = self.client.post(
            "/admin/users",
            headers=self.owner_headers,
            json={"name": "Patch Me", "email": email, "password": "patch-password-123"},
        )
        self.assertEqual(created.status_code, 201, created.text)
        uid = created.json()["id"]
        self.created_ids.append(uid)

        renamed = self.client.patch(
            f"/admin/users/{uid}", headers=self.owner_headers, json={"name": "Renamed"}
        )
        self.assertEqual(renamed.status_code, 200, renamed.text)
        self.assertEqual(renamed.json()["name"], "Renamed")

        deactivated = self.client.patch(
            f"/admin/users/{uid}", headers=self.owner_headers, json={"is_active": False}
        )
        self.assertEqual(deactivated.status_code, 200, deactivated.text)
        self.assertEqual(deactivated.json()["is_active"], False)

        # A deactivated editor can no longer log in.
        login = self.client.post(
            "/auth/login", json={"username": email, "password": "patch-password-123"}
        )
        self.assertEqual(login.status_code, 401, login.text)

    def test_patch_password_reset(self):
        email = f"partb-reset-{uuid.uuid4().hex}@example.com"
        created = self.client.post(
            "/admin/users",
            headers=self.owner_headers,
            json={"name": "Reset Me", "email": email, "password": "old-password-123"},
        )
        self.assertEqual(created.status_code, 201, created.text)
        uid = created.json()["id"]
        self.created_ids.append(uid)

        resp = self.client.patch(
            f"/admin/users/{uid}", headers=self.owner_headers, json={"password": "new-password-456"}
        )
        self.assertEqual(resp.status_code, 200, resp.text)

        # Old password fails, new password works.
        old_login = self.client.post("/auth/login", json={"username": email, "password": "old-password-123"})
        self.assertEqual(old_login.status_code, 401, old_login.text)
        new_login = self.client.post("/auth/login", json={"username": email, "password": "new-password-456"})
        self.assertEqual(new_login.status_code, 200, new_login.text)

    # ── role enforcement ───────────────────────────────────────────────────

    def test_seo_editor_forbidden_on_user_routes(self):
        editor_headers = _auth(self.editor_token)
        for method, path, kwargs in [
            ("GET", "/admin/users", {}),
            ("POST", "/admin/users", {"json": {"name": "X", "email": f"x-{uuid.uuid4().hex}@e.com", "password": "long-password-123"}}),
            ("PATCH", f"/admin/users/{self.editor_id}", {"json": {"name": "X"}}),
        ]:
            with self.subTest(method=method, path=path):
                resp = self.client.request(method, path, headers=editor_headers, **kwargs)
                self.assertEqual(resp.status_code, 403, resp.text)

    def test_seo_editor_forbidden_on_audit_log(self):
        resp = self.client.get("/admin/audit-log", headers=_auth(self.editor_token))
        self.assertEqual(resp.status_code, 403, resp.text)

    def test_owner_can_read_audit_log(self):
        resp = self.client.get("/admin/audit-log", headers=self.owner_headers)
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertIn("items", body)
        self.assertIn("total", body)

    def test_no_response_exposes_password_hash(self):
        probes = [
            ("GET", "/admin/users", None),
            ("GET", "/admin/audit-log", None),
        ]
        for method, path, body in probes:
            with self.subTest(method=method, path=path):
                resp = self.client.request(method, path, headers=self.owner_headers, json=body)
                self.assertNotIn("password_hash", resp.text)


if __name__ == "__main__":
    unittest.main()
