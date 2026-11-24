import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from backend.auth import create_access_token
from backend.main import app
from backend.models import AdminUser, AuditLog, ImageAlt
from tests.base import test_engine


BASE = "/admin/image-alts"


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class ImageAltsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.addClassCleanup(test_engine.dispose)
        cls.owner = auth(create_access_token("Image alt test owner"))
        cls.forbidden = auth(create_access_token("Image alt test viewer", role="viewer"))
        with Session(test_engine, expire_on_commit=False) as session:
            editor = AdminUser(
                name="Image alt test editor", email=f"{uuid4().hex}@example.test",
                password_hash="unused-by-token-auth", role="seo_editor",
            )
            session.add(editor)
            session.commit()
        cls.editor_id = editor.id
        cls.addClassCleanup(cls.remove_editor)
        cls.editor = auth(create_access_token(editor.email, role="seo_editor", user_id=editor.id))

    @classmethod
    def remove_editor(cls):
        with Session(test_engine) as session:
            session.delete(session.get(AdminUser, cls.editor_id))
            session.commit()

    def setUp(self):
        self.client = TestClient(app, raise_server_exceptions=False)
        self.addCleanup(self.client.close)
        self.path = f"/images/test-{uuid4().hex}.webp"
        self.addCleanup(self.clean_image)

    def clean_image(self):
        with Session(test_engine) as session:
            row = session.exec(select(ImageAlt).where(ImageAlt.image_path == self.path)).one_or_none()
            for audit in session.exec(select(AuditLog).where(
                (AuditLog.entity_type == "image_alt")
                & ((AuditLog.before["image_path"].astext == self.path)
                   | (AuditLog.after["image_path"].astext == self.path)),
            )).all():
                session.delete(audit)
            if row:
                session.delete(row)
            session.commit()

    def test_both_roles_public_map_and_audit_history(self):
        created = self.client.post(
            BASE, headers=self.owner, json={"image_path": self.path, "alt_text": "Original alt"},
        )
        self.assertEqual(created.status_code, 201, created.text)
        row = created.json()
        url = f"{BASE}/{row['id']}"
        for headers in (self.owner, self.editor):
            listed = self.client.get(BASE, headers=headers)
            self.assertEqual(listed.status_code, 200, listed.text)
            self.assertIn(row, listed.json())
        self.assertEqual(self.client.get("/image-alts").json()[self.path], {
            "alt_text": "Original alt", "is_decorative": False,
        })

        changed = self.client.put(url, headers=self.editor, json={"is_decorative": True})
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertEqual(changed.json()["created_at"], row["created_at"])
        self.assertNotEqual(changed.json()["updated_at"], row["updated_at"])
        self.assertEqual(self.client.get("/image-alts").json()[self.path], {
            "alt_text": "", "is_decorative": True,
        })
        self.assertEqual(self.client.delete(url, headers=self.editor).status_code, 204)
        self.assertNotIn(self.path, self.client.get("/image-alts").json())
        self.assertEqual(self.client.delete(url, headers=self.owner).status_code, 404)

        with Session(test_engine) as session:
            created, updated, deleted = session.exec(select(AuditLog).where(
                AuditLog.entity_type == "image_alt", AuditLog.entity_id == str(row["id"]),
            ).order_by(AuditLog.id)).all()
        self.assertEqual([a.action for a in (created, updated, deleted)], [
            "image_alt.create", "image_alt.update", "image_alt.delete",
        ])
        self.assertEqual(created.actor_role, "owner")
        self.assertEqual(updated.actor_user_id, self.editor_id)
        self.assertEqual(deleted.actor_role, "seo_editor")
        self.assertIsNone(created.before)
        self.assertEqual(updated.before, created.after)
        self.assertEqual(deleted.before, updated.after)
        self.assertIsNone(deleted.after)

    def test_forbidden_and_unauthenticated_on_all_admin_routes(self):
        for headers, expected in (({}, 401), (self.forbidden, 403)):
            for method, url in (("GET", BASE), ("POST", BASE), ("PUT", f"{BASE}/1"), ("DELETE", f"{BASE}/1")):
                with self.subTest(method=method, expected=expected):
                    response = self.client.request(method, url, headers=headers)
                    self.assertEqual(response.status_code, expected, response.text)

    def test_validation_canonical_paths_and_unique_constraint(self):
        for path in (
            "https://example.test/images/a.png", "//example.test/images/a.png", "/other/a.png",
            "/images/", "/images/../a.png", "/images/%2e%2e/a.png", "/images/a%2Fb.png",
            "/images/a%5cb.png", "/images/a.png?x=y", "/images/a.png#preview", "/images/a%00.png",
        ):
            with self.subTest(path=path):
                response = self.client.post(BASE, headers=self.editor, json={"image_path": path, "alt_text": "Alt"})
                self.assertEqual(response.status_code, 422, response.text)
                self.assertEqual(response.json()["detail"][0]["loc"][-1], "image_path")
        for alt in ("", "   ", "x" * 126, "Photo\0alt"):
            response = self.client.post(BASE, headers=self.editor, json={"image_path": self.path, "alt_text": alt})
            self.assertEqual(response.status_code, 422, response.text)
            self.assertEqual(response.json()["detail"][0]["loc"][-1], "alt_text")

        raw_path = self.path.replace(".webp", " photo.webp")
        self.path = raw_path.replace(" ", "%20")
        payload = {"image_path": raw_path, "alt_text": "  Photo alt  "}
        created = self.client.post(BASE, headers=self.editor, json=payload)
        self.assertEqual(created.status_code, 201, created.text)
        self.assertEqual(created.json()["image_path"], self.path)
        self.assertEqual(created.json()["alt_text"], "Photo alt")
        self.assertEqual(self.client.post(BASE, headers=self.owner, json={
            **payload, "image_path": self.path,
        }).status_code, 409)
        url = f"{BASE}/{created.json()['id']}"
        self.assertEqual(self.client.put(url, headers=self.owner, json={"alt_text": ""}).status_code, 422)
        self.assertEqual(self.client.put(url, headers=self.owner, json={"alt_text": "Owner edit"}).status_code, 200)
        self.assertEqual(self.client.delete(url, headers=self.owner).status_code, 204)

    def test_audit_failure_rolls_back_the_override(self):
        with patch("backend.routers.image_alts.write_audit", side_effect=RuntimeError("test audit failure")):
            res = self.client.post(BASE, headers=self.owner, json={"image_path": self.path, "alt_text": "Alt"})
        self.assertEqual(res.status_code, 500)
        self.assertNotIn(self.path, self.client.get("/image-alts").json())
