"""Part B tests: DB-backed login rate limiting (per-username + per-IP)."""

import unittest
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from backend.config import settings
from backend.main import app
from backend.models import AdminUser, LoginAttempt
from backend.security import hash_password
from tests.base import reset_login_attempts, test_engine


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _xff(value: str) -> dict:
    return {"X-Forwarded-For": value}


class LoginRateLimitTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        reset_login_attempts()
        cls.client = TestClient(app)
        cls.created_ids = []

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

    def _create_user(self, password: str) -> str:
        email = f"ratelimit-{uuid.uuid4().hex}@example.com"
        with Session(test_engine) as session:
            user = AdminUser(
                name="Rate Limit Test",
                email=email,
                password_hash=hash_password(password),
                role="seo_editor",
                is_active=True,
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            self.created_ids.append(user.id)
        return email

    def test_five_failures_then_429(self):
        email = self._create_user("correct-password-123")
        ip = f"198.51.100.{uuid.uuid4().hex[:4]}"

        # 5 wrong attempts -> 401; the 6th -> 429 with Retry-After.
        for i in range(5):
            resp = self.client.post(
                "/auth/login",
                headers=_xff(ip),
                json={"username": email, "password": "wrong-password"},
            )
            self.assertEqual(resp.status_code, 401, f"attempt {i + 1}: {resp.text}")

        resp = self.client.post(
            "/auth/login",
            headers=_xff(ip),
            json={"username": email, "password": "wrong-password"},
        )
        self.assertEqual(resp.status_code, 429, resp.text)
        self.assertIn("Retry-After", resp.headers)
        self.assertGreaterEqual(int(resp.headers["Retry-After"]), 1)

    def test_correct_password_refused_during_lockout(self):
        email = self._create_user("correct-password-123")
        ip = f"198.51.100.{uuid.uuid4().hex[:4]}"

        for _ in range(5):
            self.client.post(
                "/auth/login", headers=_xff(ip),
                json={"username": email, "password": "wrong-password"},
            )

        resp = self.client.post(
            "/auth/login", headers=_xff(ip),
            json={"username": email, "password": "correct-password-123"},
        )
        self.assertEqual(resp.status_code, 429, resp.text)

    def test_different_account_unaffected(self):
        locked_email = self._create_user("locked-password-123")
        other_email = self._create_user("other-password-123")
        locked_ip = f"198.51.100.{uuid.uuid4().hex[:4]}"

        for _ in range(5):
            self.client.post(
                "/auth/login", headers=_xff(locked_ip),
                json={"username": locked_email, "password": "wrong-password"},
            )

        # Different account AND different IP -> unaffected.
        resp = self.client.post(
            "/auth/login",
            headers=_xff(f"198.51.101.{uuid.uuid4().hex[:4]}"),
            json={"username": other_email, "password": "other-password-123"},
        )
        self.assertEqual(resp.status_code, 200, resp.text)

    def test_counter_clears_after_success(self):
        email = self._create_user("clear-password-123")
        ip = f"198.51.102.{uuid.uuid4().hex[:4]}"

        for _ in range(4):
            self.client.post(
                "/auth/login", headers=_xff(ip),
                json={"username": email, "password": "wrong-password"},
            )

        ok = self.client.post(
            "/auth/login", headers=_xff(ip),
            json={"username": email, "password": "clear-password-123"},
        )
        self.assertEqual(ok.status_code, 200, ok.text)

        with Session(test_engine) as session:
            failed = session.exec(
                select(LoginAttempt).where(
                    LoginAttempt.username == email, LoginAttempt.success == False  # noqa: E712
                )
            ).all()
        self.assertEqual(len(failed), 0)

    def test_owner_login_works_when_not_locked(self):
        resp = self.client.post(
            "/auth/login",
            headers=_xff(f"198.51.103.{uuid.uuid4().hex[:4]}"),
            json={"username": settings.admin_username, "password": settings.admin_password},
        )
        self.assertEqual(resp.status_code, 200, resp.text)


if __name__ == "__main__":
    unittest.main()
