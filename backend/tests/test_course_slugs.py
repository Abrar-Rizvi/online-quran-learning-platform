"""Check the legacy migration and persisted slugs exposed by the course API."""

import json
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from alembic.config import Config
from alembic.script import ScriptDirectory
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from backend.agent import tools
from backend.course_slugs import validate_course_slug
from backend.embeddings import EMBEDDING_DIM
from backend.main import app
from backend.models import Course
from tests.base import test_engine


class CourseSlugTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        config = Config()
        config.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
        cls.migration = ScriptDirectory.from_config(config).get_revision("5e7b3a9c2d41").module
        cls.addClassCleanup(test_engine.dispose)

    def test_backfill_preserves_legacy_urls(self):
        names = [
            "Qaida for Beginners", "Quran Recitation", "Quran Memorization",
            "  --Arabic & Quran 101!--  ", "İsLām Knowledge",
        ]
        values = self.migration._backfill_values(enumerate(names, start=1))
        self.assertEqual(
            [row["slug"] for row in values],
            ["qaida-for-beginners", "quran-recitation", "quran-memorization",
             "arabic-quran-101", "i-sl-m-knowledge"],
        )

    def test_backfill_stops_on_collisions(self):
        with self.assertRaisesRegex(RuntimeError, r"Duplicate course slug 'test-course'"):
            self.migration._backfill_values([(1, "Test course"), (2, "Test - Course!")])

    def test_validation(self):
        for slug in ["a", "qaida-for-beginners", "course-101", "1" * 100]:
            self.assertEqual(validate_course_slug(slug), slug)
        for slug in ["", "A", "-course", "course-", "a--b", "a_b", "a/b", "a\n", "1" * 101]:
            with self.subTest(slug=slug), self.assertRaises(ValueError):
                validate_course_slug(slug)

    def _create_fixture(self):
        suffix = uuid4().hex
        vector = [1.0] + [0.0] * (EMBEDDING_DIM - 1)
        course = Course(
            name=f"Course slug fixture {suffix}",
            slug=f"stored-slug-{suffix}",
            description="Test course",
            category="Test category",
            embedding=vector,
            meta_title="Course page title",
            meta_description="Course page description",
            seo_content="## Course overview",
        )
        with Session(test_engine, expire_on_commit=False) as session:
            session.add(course)
            session.commit()
        self.addCleanup(self._delete_fixture, course.id)
        return course, vector

    def _delete_fixture(self, course_id):
        with Session(test_engine) as session:
            course = session.get(Course, course_id)
            if course is not None:
                session.delete(course)
                session.commit()

    def test_api_and_admission_tools_use_persisted_course_data(self):
        course, vector = self._create_fixture()
        with TestClient(app) as client, patch("backend.course_search.embed_query", return_value=vector):
            listed = client.get("/courses")
            self.assertEqual(listed.status_code, 200, listed.text)
            item = next(row for row in listed.json() if row["id"] == course.id)
            self.assertEqual(item, {
                "id": course.id, "name": course.name, "slug": course.slug,
                "description": course.description, "category": course.category,
            })

            detail = client.get(f"/courses/{course.id}")
            self.assertEqual(detail.status_code, 200, detail.text)
            self.assertEqual(detail.json(), {
                **item,
                "course_plans": [],
                "meta_title": course.meta_title,
                "meta_description": course.meta_description,
                "seo_content": course.seo_content,
            })

            search = client.get("/courses/search", params={"q": course.name, "limit": 50})
            self.assertEqual(search.status_code, 200, search.text)
            self.assertIn(item, search.json())
            with patch.object(tools, "engine", test_engine), patch.object(tools, "SEARCH_LIMIT", 50):
                agent_item = {
                    "name": course.name, "description": course.description, "category": course.category,
                }
                self.assertIn(agent_item, json.loads(tools.search_courses(course.name)))
                self.assertEqual(json.loads(tools.get_course_details(course.name)), agent_item)

    def test_database_rejects_duplicate_slug(self):
        course, _ = self._create_fixture()
        with Session(test_engine) as session:
            session.add(Course(name=f"Another course {uuid4().hex}", slug=course.slug))
            with self.assertRaises(IntegrityError) as error:
                session.flush()
            self.assertEqual(error.exception.orig.diag.constraint_name, "ix_courses_slug")
            session.rollback()
