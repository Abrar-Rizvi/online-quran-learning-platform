import io
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from sqlmodel import Session, select

from backend.auth import AdminPrincipal
from backend.course_updates import update_course
from backend.embeddings import EMBEDDING_DIM, EmbeddingUnavailable
from backend.models import AuditLog, Course, Redirect
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

    def cleanup_script_fixture(self, course_id):
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

    def test_script_dry_run_apply_and_idempotence(self):
        course = self.make_course(description="Learn Qaida For Beginner online.")
        course_id = course.id
        self.addCleanup(self.cleanup_script_fixture, course_id)
        self.session.commit()
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
