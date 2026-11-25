import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from backend.auth import AdminPrincipal, create_access_token
from backend.course_updates import update_course
from backend.embeddings import EMBEDDING_DIM, EmbeddingUnavailable
from backend.main import app
from backend.models import AdminUser, AuditLog, Course, Redirect
from scripts import rename_noorani_qaida
from tests.base import test_engine

ACTOR = AdminPrincipal(user_id=None, name="Course Update Tests", email=None, role="owner")
ORIGINAL_VECTOR = [1.0] + [0.0] * (EMBEDDING_DIM - 1)
UPDATED_VECTOR = [0.0, 1.0] + [0.0] * (EMBEDDING_DIM - 2)


class CourseUpdateTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.addClassCleanup(test_engine.dispose)

    def setUp(self):
        self.prefix = f"course-update-test-{uuid4().hex}"
        self.session = Session(test_engine)
        self.addCleanup(self.session.close)

    def make_course(self, suffix="old", description="Original description"):
        course = Course(
            name=f"{self.prefix} {suffix}", slug=f"{self.prefix}-{suffix}",
            description=description, embedding=ORIGINAL_VECTOR,
        )
        self.session.add(course)
        self.session.flush()
        return course

    def test_update_only_supplied_fields_and_regenerate_embedding(self):
        course = self.make_course()
        with patch("backend.course_updates.embed_one", return_value=UPDATED_VECTOR) as embed:
            updated = update_course(self.session, course.id, description="Revised text", actor=ACTOR)
            embed.assert_called_once_with("Revised text")
        self.assertEqual(updated.name, f"{self.prefix} old")
        self.assertEqual(updated.slug, f"{self.prefix}-old")
        self.assertEqual(list(updated.embedding), UPDATED_VECTOR)
        audit = self.session.exec(select(AuditLog).where(
            AuditLog.entity_type == "course", AuditLog.entity_id == str(course.id),
        )).one()
        self.assertEqual(audit.before["description"], "Original description")
        self.assertEqual(audit.after["description"], "Revised text")
        self.assertNotIn("embedding", audit.after)

    def test_slug_only_update_creates_redirect_without_embedding(self):
        course = self.make_course()
        new_slug = f"{self.prefix}-new"
        with patch("backend.course_updates.embed_one") as embed:
            update_course(self.session, course.id, slug=new_slug, actor=ACTOR)
            update_course(self.session, course.id, slug=new_slug, actor=ACTOR)
            embed.assert_not_called()
        mapping = self.find_redirect(self.session)
        self.assertEqual(mapping.to_path, f"/courses/{new_slug}")
        self.assertEqual(mapping.created_by, ACTOR.name)
        self.assertEqual(list(course.embedding), ORIGINAL_VECTOR)

    def test_duplicate_and_invalid_slug(self):
        course, other = self.make_course(), self.make_course("taken")
        with patch("backend.course_updates.embed_one") as embed:
            with self.assertRaises(HTTPException) as error:
                update_course(self.session, course.id, slug=other.slug, name="New name", actor=ACTOR)
            self.assertEqual(error.exception.status_code, 409)
            with self.assertRaises(ValueError):
                update_course(self.session, course.id, slug="INVALID", actor=ACTOR)
            embed.assert_not_called()
        self.assertEqual(course.slug, f"{self.prefix}-old")
        self.assertIsNone(self.find_redirect(self.session))

    def find_redirect(self, session):
        return session.exec(select(Redirect).where(
            Redirect.from_path == f"/courses/{self.prefix}-old"
        )).one_or_none()

    def test_embedding_failure_leaves_course_redirect_and_audit_unchanged(self):
        course = self.make_course(description=None)
        with patch("backend.course_updates.embed_one", side_effect=RuntimeError("API failed")) as embed:
            with self.assertRaises(EmbeddingUnavailable):
                update_course(
                    self.session, course.id, name="Changed", slug=f"{self.prefix}-new", actor=ACTOR,
                )
            embed.assert_called_once_with("Changed")
        self.session.refresh(course)
        self.assertEqual(course.slug, f"{self.prefix}-old")
        self.assertEqual(course.name, f"{self.prefix} old")
        self.assertEqual(list(course.embedding), ORIGINAL_VECTOR)
        self.assertIsNone(self.find_redirect(self.session))
        self.assertIsNone(self.session.exec(select(AuditLog.id).where(
            AuditLog.entity_type == "course", AuditLog.entity_id == str(course.id),
        )).first())

    def test_redirect_conflict_rolls_back_the_course_change(self):
        course = self.make_course()
        new_slug = f"{self.prefix}-new"
        self.session.add(Redirect(from_path=f"/courses/{new_slug}", to_path="/somewhere-else"))
        with patch("backend.course_updates.embed_one", return_value=UPDATED_VECTOR):
            with self.assertRaises(HTTPException) as error:
                update_course(self.session, course.id, name="Changed", slug=new_slug, actor=ACTOR)
        self.assertEqual(error.exception.status_code, 409)
        self.session.refresh(course)
        self.assertEqual(course.slug, f"{self.prefix}-old")
        self.assertEqual(list(course.embedding), ORIGINAL_VECTOR)
        self.assertIsNone(self.find_redirect(self.session))

    def cleanup_course_fixture(self, course_id):
        with Session(test_engine) as session:
            redirect = self.find_redirect(session)
            audits = session.exec(select(AuditLog).where(
                (AuditLog.entity_type == "course") & (AuditLog.entity_id == str(course_id))
                | (AuditLog.entity_type == "redirect")
                & (AuditLog.after["from_path"].astext == f"/courses/{self.prefix}-old"),
            )).all()
            for audit in audits:
                session.delete(audit)
            if redirect:
                session.delete(redirect)
            course = session.get(Course, course_id)
            if course:
                session.delete(course)
            session.commit()

    def commit_course_fixture(self, course):
        course_id = course.id
        self.addCleanup(self.cleanup_course_fixture, course_id)
        self.session.commit()
        return course_id

    def course_audits(self, session, course_id):
        return session.exec(
            select(AuditLog)
            .where(AuditLog.entity_type == "course", AuditLog.entity_id == str(course_id))
            .order_by(AuditLog.id)
        ).all()

    def remove_editor(self, editor_id):
        with Session(test_engine) as session:
            editor = session.get(AdminUser, editor_id)
            if editor:
                session.delete(editor)
                session.commit()

    def test_admin_course_seo_round_trip_and_audit_for_both_roles(self):
        course = self.make_course()
        course_name = course.name
        course_slug = course.slug
        editor = AdminUser(
            name="Course SEO Editor", email=f"{self.prefix}@example.com",
            password_hash="unused-by-token-auth", role="seo_editor",
        )
        self.session.add(editor)
        self.session.flush()
        editor_id = editor.id
        self.addCleanup(self.remove_editor, editor_id)
        editor_token = create_access_token(editor.email, role="seo_editor", user_id=editor_id)
        course_id = self.commit_course_fixture(course)
        path = f"/admin/courses/{course_id}"
        seo_fields = {
            "meta_title": "Course page title",
            "meta_description": "Course page description",
            "seo_content": "## Course overview",
        }
        empty_seo_fields = dict.fromkeys(seo_fields)
        initial = {
            "id": course_id, "name": course_name, "slug": course_slug, "category": None,
            "description": "Original description", **empty_seo_fields,
        }
        summary = {
            "id": course_id, "name": course_name, "slug": course_slug, "category": None,
            "meta_title": None, "meta_description": None, "has_seo_content": False,
        }
        with TestClient(app) as client, patch("backend.course_updates.embed_one") as embed:
            self.assertEqual(client.get(path).status_code, 401)
            for role, token in (("owner", create_access_token(ACTOR.name)), ("seo_editor", editor_token)):
                with self.subTest(role=role):
                    headers = {"Authorization": f"Bearer {token}"}
                    listing = client.get("/admin/courses", headers=headers)
                    self.assertEqual(listing.status_code, 200, listing.text)
                    self.assertIn(summary, listing.json())
                    detail = client.get(path, headers=headers)
                    self.assertEqual(detail.status_code, 200, detail.text)
                    self.assertEqual(detail.json(), initial)

            editor_headers = {"Authorization": f"Bearer {editor_token}"}
            updated = client.patch(path, headers=editor_headers, json=seo_fields)
            self.assertEqual(updated.status_code, 200, updated.text)
            self.assertEqual(updated.json(), {**initial, **seo_fields})
            listing = client.get("/admin/courses", headers=editor_headers)
            self.assertEqual(listing.status_code, 200, listing.text)
            self.assertIn({
                **summary, "meta_title": seo_fields["meta_title"],
                "meta_description": seo_fields["meta_description"], "has_seo_content": True,
            }, listing.json())

            owner_headers = {"Authorization": f"Bearer {create_access_token(ACTOR.name)}"}
            cleared = client.patch(
                path, headers=owner_headers, json={"meta_title": "", "seo_content": None},
            )
            self.assertEqual(cleared.status_code, 200, cleared.text)
            self.assertEqual(cleared.json(), {**initial, "meta_description": seo_fields["meta_description"]})
            embed.assert_not_called()

        with Session(test_engine) as session:
            self.assertEqual(list(session.get(Course, course_id).embedding), ORIGINAL_VECTOR)
            editor_audit, owner_audit = self.course_audits(session, course_id)
            self.assertEqual(editor_audit.action, "course.update")
            self.assertEqual((editor_audit.actor_user_id, editor_audit.actor_role), (editor_id, "seo_editor"))
            self.assertEqual(editor_audit.before, empty_seo_fields)
            self.assertEqual(editor_audit.after, seo_fields)
            self.assertEqual(owner_audit.action, "course.update")
            self.assertEqual(owner_audit.actor_role, "owner")
            self.assertEqual(owner_audit.before, {
                "meta_title": seo_fields["meta_title"], "seo_content": seo_fields["seo_content"],
            })
            self.assertEqual(owner_audit.after, {"meta_title": None, "seo_content": None})

    def test_admin_course_patch_accepts_long_seo_content(self):
        course_id = self.commit_course_fixture(self.make_course())
        path = f"/admin/courses/{course_id}"
        headers = {"Authorization": f"Bearer {create_access_token(ACTOR.name)}"}
        markdown = "## Course overview\n\nLearn with **practice** and [examples](/courses).\n\n"
        with TestClient(app) as client:
            for length in (20_001, 100_000):
                with self.subTest(length=length):
                    content = markdown + "📖" * (length - len(markdown))
                    updated = client.patch(path, headers=headers, json={"seo_content": content})
                    self.assertEqual(updated.status_code, 200, updated.text)
                    self.assertEqual(updated.json()["seo_content"], content)
                    self.assertEqual(client.get(path, headers=headers).json()["seo_content"], content)

    def test_admin_course_patch_rejects_invalid_fields(self):
        course_id = self.commit_course_fixture(self.make_course())
        headers = {"Authorization": f"Bearer {create_access_token(ACTOR.name)}"}
        with TestClient(app) as client:
            missing_path = "/admin/courses/0"
            self.assertEqual(client.get(missing_path, headers=headers).status_code, 404)
            self.assertEqual(client.patch(missing_path, json={}, headers=headers).status_code, 404)
            for payload in (
                {"meta_title": "x" * 256}, {"meta_description": "x" * 501},
                {"seo_content": "x" * 100_001}, {"course_plans": []}, {"fee": 10},
                {"currency": "USD"},
            ):
                with self.subTest(field=next(iter(payload))):
                    response = client.patch(f"/admin/courses/{course_id}", json=payload, headers=headers)
                    self.assertEqual(response.status_code, 422, response.text)
        with Session(test_engine) as session:
            self.assertEqual(self.course_audits(session, course_id), [])

    def test_admin_course_patch_returns_502_and_rolls_back_on_embedding_failure(self):
        course = self.make_course()
        original_name = course.name
        original_slug = course.slug
        course_id = self.commit_course_fixture(course)
        headers = {"Authorization": f"Bearer {create_access_token(ACTOR.name)}"}
        with TestClient(app) as client, patch(
            "backend.course_updates.embed_one", side_effect=RuntimeError("Upstream failed"),
        ) as embed:
            response = client.patch(
                f"/admin/courses/{course_id}", headers=headers,
                json={"name": "Changed", "description": "Revised text",
                      "slug": f"{self.prefix}-new", "meta_title": "New title"},
            )
            self.assertEqual(response.status_code, 502, response.text)
            embed.assert_called_once_with("Revised text")

        with Session(test_engine) as session:
            saved = session.get(Course, course_id)
            self.assertEqual((saved.name, saved.slug), (original_name, original_slug))
            self.assertEqual(saved.description, "Original description")
            self.assertIsNone(saved.meta_title)
            self.assertEqual(list(saved.embedding), ORIGINAL_VECTOR)
            self.assertIsNone(self.find_redirect(session))
            self.assertEqual(self.course_audits(session, course_id), [])

    def test_script_dry_run_apply_and_idempotence(self):
        course = self.make_course(description="Learn Qaida For Beginner online.")
        course_id = self.commit_course_fixture(course)
        new_slug = f"{self.prefix}-new"
        new_name = f"{self.prefix} new"
        with patch.multiple(
            rename_noorani_qaida, LEGACY_QAIDA_SLUG=f"{self.prefix}-old",
            NOORANI_QAIDA_SLUG=new_slug, NEW_NAME=new_name,
        ), patch("backend.course_updates.embed_one", return_value=UPDATED_VECTOR) as embed:
            def run(args):
                output = io.StringIO()
                with redirect_stdout(output):
                    self.assertEqual(rename_noorani_qaida.main(args, db_engine=test_engine), 0)
                return output.getvalue()

            dry_run = run([])
            self.assertIn("Dry-run", dry_run)
            self.assertIn("Review:", dry_run)
            with Session(test_engine) as session:
                self.assertEqual(session.get(Course, course_id).slug, f"{self.prefix}-old")
                self.assertIsNone(self.find_redirect(session))
            embed.assert_not_called()
            self.assertIn("created its permanent redirect", run(["--yes"]))
            self.assertIn("already renamed", run(["--yes"]))
            embed.assert_called_once_with("Learn Qaida For Beginner online.")
        with Session(test_engine) as session:
            updated = session.get(Course, course_id)
            self.assertEqual((updated.name, updated.slug), (new_name, new_slug))
            self.assertEqual(updated.description, "Learn Qaida For Beginner online.")
            self.assertEqual(self.find_redirect(session).to_path, f"/courses/{new_slug}")
