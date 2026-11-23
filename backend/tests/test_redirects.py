"""Redirect integration tests. All database access uses tests.base."""

import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from backend.auth import create_access_token
from backend.config import settings
from backend.main import app
from backend.models import AdminUser, AuditLog, Redirect
from backend.redirects import add_redirect, normalize_redirect_path
from tests.base import test_engine


class RedirectTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.addClassCleanup(test_engine.dispose)
        cls.addClassCleanup(cls.client.close)
        cls.owner = {"Authorization": f"Bearer {create_access_token(settings.admin_username)}"}

    def setUp(self):
        self.prefix = f"/redirect-test-{uuid4().hex}"
        self.addCleanup(self._cleanup_redirects)

    def _cleanup_redirects(self):
        with Session(test_engine) as session:
            rows = session.exec(
                select(Redirect).where(Redirect.from_path.startswith(self.prefix))
            ).all()
            audits = session.exec(
                select(AuditLog).where(
                    AuditLog.entity_type == "redirect",
                    AuditLog.before["from_path"].astext.startswith(self.prefix)
                    | AuditLog.after["from_path"].astext.startswith(self.prefix),
                )
            ).all()
            for row in [*rows, *audits]:
                session.delete(row)
            session.commit()

    def _post(self, source, target, headers=None):
        return self.client.post(
            "/admin/redirects",
            json={"from_path": source, "to_path": target},
            headers=self.owner if headers is None else headers,
        )

    def _create(self, source, target, headers=None):
        response = self._post(source, target, headers)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def _public(self):
        response = self.client.get("/redirects")
        self.assertEqual(response.status_code, 200, response.text)
        return {row["from_path"]: row for row in response.json()}

    def test_normalization_and_public_response(self):
        source, target = f"{self.prefix}/old", f"{self.prefix}/caf%c3%a9"
        row = self._create(f" {source.upper()}/ ", f"{self.prefix}/CAFÉ/")
        self.assertEqual(row["from_path"], source)
        self.assertEqual(row["to_path"], target)
        self.assertEqual(row["created_by"], settings.admin_username)
        self.assertIn("created_at", row)
        self.assertEqual(self._public()[source], {"from_path": source, "to_path": target})
        self.assertEqual(normalize_redirect_path("/", "to_path"), "/")

    def test_rejects_invalid_paths_and_same_path(self):
        source, target = f"{self.prefix}/old", f"{self.prefix}/new"
        cases = [
            (source, source.upper() + "/", "different"),
            (source, "new", "internal path"),
            (source, "https://example.test/new", "internal path"),
            (source, "//example.test/new", "internal path"),
            (source, "/new//page", "internal path"),
            (source, r"/\example.test/new", "internal path"),
            (source, "/%2fexample.test", "encoded slash"),
            (source, "/%5cexample.test", "reserved character"),
            (source, "/a/%2e%2e/new", "segments"),
            (source, "/new/%ff", "URL encoding"),
            (source, "/new/%", "percent escape"),
            (source, "/new/%0a", "whitespace"),
            (source, "/new?q=1", "query string or fragment"),
            (source + "#hash", target, "query string or fragment"),
            ("/ADMIN/private", target, "/admin or /api"),
            ("/api-extra", target, "/admin or /api"),
            (source, "/%61dmin/private", "/admin or /api"),
            (source, "/api/private", "/admin or /api"),
            (source, "/" + "a" * 1024, "1024 characters"),
        ]
        for initial, destination, message in cases:
            with self.subTest(initial=initial, destination=destination):
                response = self._post(initial, destination)
                self.assertEqual(response.status_code, 422, response.text)
                self.assertIn(message, response.json()["detail"])

    def test_duplicate_source_is_case_and_slash_insensitive(self):
        source = f"{self.prefix}/old"
        self._create(source, f"{self.prefix}/new")
        response = self._post(source.upper() + "/", f"{self.prefix}/other")
        self.assertEqual(response.status_code, 409, response.text)

    def test_flattens_both_incoming_and_outgoing_chains_and_rejects_a_loop(self):
        a, b, c, d = (f"{self.prefix}/{letter}" for letter in "abcd")
        original = self._create(a, b)
        reverse = self._post(b, a)
        self.assertEqual(reverse.status_code, 422, reverse.text)
        self.assertIn("loop", reverse.json()["detail"])
        self._create(b, c)
        self.assertEqual(self._create(d, a)["to_path"], c)
        cycle = self._post(c, d)
        self.assertEqual(cycle.status_code, 422, cycle.text)
        public = self._public()
        self.assertEqual([public[path]["to_path"] for path in (a, b, d)], [c, c, c])
        self.assertNotIn(c, public)

        update = self._audit(original["id"], "redirect.update")
        self.assertEqual(update.before["to_path"], b)
        self.assertEqual(update.after["to_path"], c)

    def test_concurrent_inverse_inserts_cannot_start_a_loop(self):
        a, b = (f"{self.prefix}/{letter}" for letter in "ab")
        start = Barrier(2)

        def response_status(source, target):
            start.wait(timeout=5)
            return self._post(source, target).status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = [pool.submit(response_status, a, b), pool.submit(response_status, b, a)]
            self.assertCountEqual([result.result() for result in results], [201, 422])
        self.assertEqual(len({a, b} & self._public().keys()), 1)

    def test_reusable_function_validates_and_does_not_commit(self):
        source, target = f"{self.prefix}/old", f"{self.prefix}/new"
        with Session(test_engine) as session:
            with self.assertRaises(HTTPException) as invalid:
                add_redirect(session, source, "/admin", None)
            self.assertEqual(invalid.exception.status_code, 422)
            result = add_redirect(session, source.upper(), target, None)
            self.assertEqual(result.redirect.from_path, source)
            self.assertIsNone(result.redirect.created_by)
            self.assertIsNotNone(result.redirect.id)
            session.rollback()
        self.assertNotIn(source, self._public())

    def test_admin_requires_a_token(self):
        for method, path, body in [
            ("GET", "/admin/redirects", None),
            ("POST", "/admin/redirects", {"from_path": "/old", "to_path": "/new"}),
            ("DELETE", "/admin/redirects/1", None),
        ]:
            with self.subTest(method=method):
                response = self.client.request(method, path, json=body)
                self.assertEqual(response.status_code, 401, response.text)

    def _audit(self, redirect_id, action):
        with Session(test_engine) as session:
            return session.exec(select(AuditLog).where(
                AuditLog.entity_type == "redirect",
                AuditLog.entity_id == str(redirect_id),
                AuditLog.action == action,
            )).one()

    def _delete_editor(self, editor_id):
        with Session(test_engine) as session:
            editor = session.get(AdminUser, editor_id)
            if editor:
                session.delete(editor)
                session.commit()

    def test_editor_can_list_create_and_delete_and_mutations_are_audited(self):
        with Session(test_engine) as session:
            editor = AdminUser(
                name="Redirect Test Editor",
                email=f"{uuid4().hex}@example.com",
                password_hash="unused-test-fixture",
                role="seo_editor",
            )
            session.add(editor)
            session.flush()
            editor_id = editor.id
            token = create_access_token(editor.email, role="seo_editor", user_id=editor_id)
            session.commit()
        self.addCleanup(self._delete_editor, editor_id)
        headers = {"Authorization": f"Bearer {token}", "X-Forwarded-For": "192.0.2.10"}
        source, target = f"{self.prefix}/old", f"{self.prefix}/new"
        row = self._create(source, target, headers)
        self.assertEqual(row["created_by"], "Redirect Test Editor")
        listed = self.client.get("/admin/redirects", headers=headers)
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertIn(row, listed.json())
        created = self._audit(row["id"], "redirect.create")
        self.assertIsNone(created.before)
        self.assertEqual(created.after["from_path"], source)
        self.assertEqual(created.actor_user_id, editor_id)
        self.assertEqual(created.actor_role, "seo_editor")
        self.assertEqual(created.ip, "192.0.2.10")

        delete_url = f"/admin/redirects/{row['id']}"
        deleted = self.client.delete(delete_url, headers=headers)
        self.assertEqual(deleted.status_code, 204, deleted.text)
        self.assertEqual(deleted.content, b"")
        self.assertEqual(self.client.delete(delete_url, headers=headers).status_code, 404)
        removed = self._audit(row["id"], "redirect.delete")
        self.assertEqual(removed.before["to_path"], target)
        self.assertIsNone(removed.after)
        self.assertEqual(removed.actor_user_id, editor_id)
        self.assertNotIn(source, self._public())
