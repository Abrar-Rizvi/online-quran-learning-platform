"""Part B tests: every mutating admin endpoint writes one audit-log row."""

import json
import unittest
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from backend.config import settings
from backend.main import app
from backend.models import (
    AdminUser,
    AuditLog,
    Conversation,
    CoursePlan,
    Enrollment,
    Student,
    TrialRequest,
)
from tests.base import reset_login_attempts, test_engine


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class AuditLogTest(unittest.TestCase):
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

        with Session(test_engine) as session:
            cls.course_plan_id = session.exec(
                select(CoursePlan.id).limit(1)
            ).first()

        cls.admin_user_ids = []

    @classmethod
    def tearDownClass(cls):
        with Session(test_engine) as session:
            for uid in cls.admin_user_ids:
                user = session.get(AdminUser, uid)
                if user is not None:
                    session.delete(user)
            session.commit()
        reset_login_attempts()
        test_engine.dispose()

    # ── helpers ────────────────────────────────────────────────────────────

    def _assert_audit(self, action, entity_type, entity_id):
        with Session(test_engine) as session:
            rows = session.exec(
                select(AuditLog).where(
                    AuditLog.action == action,
                    AuditLog.entity_type == entity_type,
                    AuditLog.entity_id == entity_id,
                )
            ).all()
        self.assertEqual(len(rows), 1, f"expected 1 audit row for {action}/{entity_id}")
        row = rows[0]
        self.assertIsNone(row.actor_user_id)  # env owner has no admin_users row
        self.assertEqual(row.actor_role, "owner")
        self.assertEqual(row.actor_name, settings.admin_username)
        return row

    def _make_student(self) -> int:
        email = f"audit-student-{uuid.uuid4().hex}@example.com"
        with Session(test_engine) as session:
            student = Student(
                name="Audit Student",
                email=email,
                registration_no=f"TEST-{uuid.uuid4().hex[:12]}",
            )
            session.add(student)
            session.commit()
            session.refresh(student)
            return student.id

    def _make_enrollment(self, student_id: int) -> int:
        with Session(test_engine) as session:
            enrollment = Enrollment(
                student_id=student_id,
                course_plan_id=self.course_plan_id,
                status="on_trial",
            )
            session.add(enrollment)
            session.commit()
            session.refresh(enrollment)
            return enrollment.id

    def _make_conversation(self) -> int:
        with Session(test_engine) as session:
            conv = Conversation()
            session.add(conv)
            session.commit()
            session.refresh(conv)
            return conv.id

    def _make_trial_request(self) -> int:
        with Session(test_engine) as session:
            tr = TrialRequest(
                name="Audit Trial",
                email=f"audit-trial-{uuid.uuid4().hex}@example.com",
                whatsapp="+10000000000",
                country="US",
            )
            session.add(tr)
            session.commit()
            session.refresh(tr)
            return tr.id

    # ── blog ───────────────────────────────────────────────────────────────

    def test_blog_audit_lifecycle(self):
        title = f"Audit blog {uuid.uuid4().hex[:8]}"
        created = self.client.post(
            "/admin/blog",
            headers=self.owner_headers,
            json={"title": title, "excerpt": "audit", "content": "body"},
        )
        self.assertEqual(created.status_code, 201, created.text)
        post_id = created.json()["id"]

        self._assert_audit("blog.create", "blog_post", str(post_id))

        updated = self.client.patch(
            f"/admin/blog/{post_id}",
            headers=self.owner_headers,
            json={"title": title + " (updated)"},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self._assert_audit("blog.update", "blog_post", str(post_id))

        published = self.client.patch(
            f"/admin/blog/{post_id}",
            headers=self.owner_headers,
            json={"status": "published"},
        )
        self.assertEqual(published.status_code, 200, published.text)
        self._assert_audit("blog.publish", "blog_post", str(post_id))

        deleted = self.client.delete(
            f"/admin/blog/{post_id}", headers=self.owner_headers
        )
        self.assertEqual(deleted.status_code, 204, deleted.text)
        self._assert_audit("blog.delete", "blog_post", str(post_id))

    # ── admin user ─────────────────────────────────────────────────────────

    def test_admin_user_audit(self):
        email = f"audit-user-{uuid.uuid4().hex}@example.com"
        created = self.client.post(
            "/admin/users",
            headers=self.owner_headers,
            json={"name": "Audit User", "email": email, "password": "audit-password-123"},
        )
        self.assertEqual(created.status_code, 201, created.text)
        uid = created.json()["id"]
        self.admin_user_ids.append(uid)

        self._assert_audit("admin_user.create", "admin_user", str(uid))

        updated = self.client.patch(
            f"/admin/users/{uid}", headers=self.owner_headers, json={"name": "Renamed Audit User"}
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self._assert_audit("admin_user.update", "admin_user", str(uid))

    def test_password_reset_audit_has_no_secret(self):
        email = f"audit-reset-{uuid.uuid4().hex}@example.com"
        created = self.client.post(
            "/admin/users",
            headers=self.owner_headers,
            json={"name": "Reset Audit", "email": email, "password": "initial-password-123"},
        )
        self.assertEqual(created.status_code, 201, created.text)
        uid = created.json()["id"]
        self.admin_user_ids.append(uid)

        new_password = "replacement-password-456"
        resp = self.client.patch(
            f"/admin/users/{uid}",
            headers=self.owner_headers,
            json={"password": new_password},
        )
        self.assertEqual(resp.status_code, 200, resp.text)

        with Session(test_engine) as session:
            rows = session.exec(
                select(AuditLog).where(
                    AuditLog.action == "admin_user.update",
                    AuditLog.entity_id == str(uid),
                )
            ).all()
        reset_row = [r for r in rows if r.after and r.after.get("password") == "reset"]
        self.assertEqual(len(reset_row), 1)
        blob = json.dumps(reset_row[0].before) + json.dumps(reset_row[0].after)
        self.assertNotIn("password_hash", blob)
        self.assertNotIn(new_password, blob)
        self.assertNotIn("initial-password-123", blob)

    # ── student ────────────────────────────────────────────────────────────

    def test_student_audit(self):
        sid = self._make_student()
        updated = self.client.patch(
            f"/admin/students/{sid}", headers=self.owner_headers, json={"name": "Renamed Student"}
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self._assert_audit("student.update", "student", str(sid))

        deleted = self.client.delete(f"/admin/students/{sid}", headers=self.owner_headers)
        self.assertEqual(deleted.status_code, 204, deleted.text)
        self._assert_audit("student.delete", "student", str(sid))

    # ── enrollment ─────────────────────────────────────────────────────────

    def test_enrollment_audit(self):
        sid = self._make_student()
        eid = self._make_enrollment(sid)

        updated = self.client.patch(
            f"/admin/enrollments/{eid}/status",
            headers=self.owner_headers,
            json={"status": "active"},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self._assert_audit("enrollment.update_status", "enrollment", str(eid))

        deleted = self.client.delete(f"/admin/enrollments/{eid}", headers=self.owner_headers)
        self.assertEqual(deleted.status_code, 204, deleted.text)
        self._assert_audit("enrollment.delete", "enrollment", str(eid))

        # Clean up the helper student.
        self.client.delete(f"/admin/students/{sid}", headers=self.owner_headers)

    # ── conversation ───────────────────────────────────────────────────────

    def test_conversation_audit(self):
        cid = self._make_conversation()
        deleted = self.client.delete(f"/admin/conversations/{cid}", headers=self.owner_headers)
        self.assertEqual(deleted.status_code, 204, deleted.text)
        self._assert_audit("conversation.delete", "conversation", str(cid))

    # ── trial request ──────────────────────────────────────────────────────

    def test_trial_request_audit(self):
        tid = self._make_trial_request()
        updated = self.client.patch(
            f"/admin/trial-requests/{tid}/status",
            headers=self.owner_headers,
            json={"status": "cancelled"},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self._assert_audit("trial_request.update_status", "trial_request", str(tid))

        deleted = self.client.delete(f"/admin/trial-requests/{tid}", headers=self.owner_headers)
        self.assertEqual(deleted.status_code, 204, deleted.text)
        self._assert_audit("trial_request.delete", "trial_request", str(tid))


if __name__ == "__main__":
    unittest.main()
