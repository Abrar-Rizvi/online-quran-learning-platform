import io
import json
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import uuid4

from sqlmodel import Session

from backend.models import Course
from scripts import backfill_course_images
from tests.base import test_engine


class CourseImageBackfillTest(unittest.TestCase):
    def test_dry_run_idempotence_override_and_missing_files(self):
        suffix = uuid4().hex
        existing = "/images/courses/keep-me.webp"
        with TemporaryDirectory() as tmp, Session(test_engine) as session:
            root = Path(tmp)
            images = root / "images"
            images.mkdir()
            for filename in (f"Alpha & Beta-{suffix}.JPG", f"Alpha - Beta-{suffix}.webp", f"set-{suffix}.jpg",
                             f"broken-{suffix}.jpg", "qaida.jpg"):
                (images / filename).touch()
            overrides = root / "overrides.json"
            overrides.write_text(json.dumps({
                f"renamed-{suffix}": "/images/courses/qaida.jpg",
                f"broken-{suffix}": "/images/courses/absent.jpg",
            }), encoding="utf-8")
            cases = {
                "alpha-beta": (None, f"/images/courses/Alpha%20%26%20Beta-{suffix}.JPG"),
                "legacy": (None, "/images/courses/qaida.jpg"),
                "set": (existing, existing),
                "broken": (None, None),
                "missing": (None, None),
            }
            courses = {
                slug: Course(name=f"{slug} {suffix}", slug=f"{slug}-{suffix}", image_path=initial)
                for slug, (initial, _) in cases.items()
            }
            session.add_all(courses.values())
            session.flush()
            output = io.StringIO()
            with (
                patch.multiple(backfill_course_images, OVERRIDES_FILE=overrides,
                               LEGACY_QAIDA_SLUG=f"legacy-{suffix}", NOORANI_QAIDA_SLUG=f"renamed-{suffix}"),
                redirect_stdout(output),
            ):
                planned = backfill_course_images.backfill(session, images, dry_run=True)
                self.assertEqual(planned[0], 2)
                self.assertIn("Would set", output.getvalue())
                for slug, (initial, _) in cases.items():
                    self.assertEqual(courses[slug].image_path, initial)

                applied = backfill_course_images.backfill(session, images, dry_run=False)
                self.assertEqual(applied, planned)
                session.flush()
                session.expire_all()
                for slug, (_, expected) in cases.items():
                    self.assertEqual(courses[slug].image_path, expected)

                repeated = backfill_course_images.backfill(session, images, dry_run=False)
                self.assertEqual(repeated, (0, applied[1] + 2, applied[2], applied[3]))
            session.rollback()
