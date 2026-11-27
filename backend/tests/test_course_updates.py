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

    def test_slug_changes_flatten_redirects_and_audit_retargeting(self):
        course = self.make_course()
        old_path = f"/courses/{course.slug}"
        middle_slug, final_slug = f"{self.prefix}-middle", f"{self.prefix}-final"
        middle_path, final_path = f"/courses/{middle_slug}", f"/courses/{final_slug}"
        update_course(self.session, course.id, slug=middle_slug, actor=ACTOR)
        update_course(self.session, course.id, slug=final_slug, actor=ACTOR)

        self.assertEqual(self.redirect_paths(self.session), {old_path: final_path, middle_path: final_path})
        original = self.find_redirect(self.session)
        audit = self.session.exec(select(AuditLog).where(
            AuditLog.entity_type == "redirect", AuditLog.entity_id == str(original.id),
            AuditLog.action == "redirect.update",
        )).one()
        self.assertEqual(audit.before["to_path"], middle_path)
        self.assertEqual(audit.after["to_path"], final_path)

    def test_admin_slug_revert_saves_other_fields_and_can_change_back_again(self):
        course = self.make_course()
        old_slug, new_slug = course.slug, f"{self.prefix}-new"
        old_path, new_path = f"/courses/{old_slug}", f"/courses/{new_slug}"
        course_id = self.commit_course_fixture(course)
        url = f"/admin/courses/{course_id}"
        headers = {"Authorization": f"Bearer {create_access_token(ACTOR.name)}"}
        edits = {"name": f"{self.prefix} renamed", "description": "Revised", "meta_title": "Updated title"}
        with TestClient(app) as client, patch("backend.course_updates.embed_one", return_value=UPDATED_VECTOR):
            response = client.patch(url, headers=headers, json={"slug": new_slug})
            self.assertEqual(response.status_code, 200, response.text)
            response = client.patch(url, headers=headers, json={"slug": old_slug, **edits})
            self.assertEqual(response.status_code, 200, response.text)
            saved = client.get(url, headers=headers).json()
            self.assertEqual({field: saved[field] for field in edits}, edits)
            self.assertEqual(saved["slug"], old_slug)

            with Session(test_engine) as session:
                self.assertEqual(self.redirect_paths(session), {new_path: old_path})
                audit = session.exec(select(AuditLog).where(
                    AuditLog.action == "redirect.delete",
                    AuditLog.before["from_path"].astext == old_path,
                )).one()
                self.assertEqual(audit.before["to_path"], new_path)
                self.assertIsNone(audit.after)

            response = client.patch(url, headers=headers, json={"slug": new_slug})
            self.assertEqual(response.status_code, 200, response.text)
        with Session(test_engine) as session:
            self.assertEqual(session.get(Course, course_id).slug, new_slug)
            self.assertEqual(self.redirect_paths(session), {old_path: new_path})

    def test_slug_change_overwrites_old_source_and_removes_new_source(self):
        course = self.make_course()
        new_slug = f"{self.prefix}-new"
        old_path, new_path = f"/courses/{course.slug}", f"/courses/{new_slug}"
        existing = Redirect(from_path=old_path, to_path="/elsewhere")
        self.session.add_all([existing, Redirect(from_path=new_path, to_path="/somewhere-else")])
        self.session.flush()

        update_course(self.session, course.id, slug=new_slug, actor=ACTOR)

        self.assertEqual(self.redirect_paths(self.session), {old_path: new_path})
        self.assertEqual(self.find_redirect(self.session).id, existing.id)
        audit = self.session.exec(select(AuditLog).where(
            AuditLog.entity_type == "redirect", AuditLog.entity_id == str(existing.id),
        )).one()
        self.assertEqual(audit.action, "redirect.update")
        self.assertEqual(audit.before["to_path"], "/elsewhere")
        self.assertEqual(audit.after["to_path"], new_path)

    def test_audit_failure_rolls_back_the_course_and_redirect_changes(self):
        course = self.make_course()
        new_slug = f"{self.prefix}-new"
        old_path, new_path = f"/courses/{course.slug}", f"/courses/{new_slug}"
        self.session.add(Redirect(from_path=new_path, to_path=old_path))
        with patch("backend.course_updates.embed_one", return_value=UPDATED_VECTOR), patch(
            "backend.course_updates.write_audit", side_effect=RuntimeError("audit failed"),
        ):
            with self.assertRaisesRegex(RuntimeError, "audit failed"):
                update_course(self.session, course.id, name="Changed", slug=new_slug, actor=ACTOR)
        self.session.refresh(course)
        self.assertEqual(course.slug, f"{self.prefix}-old")
        self.assertEqual(course.name, f"{self.prefix} old")
        self.assertEqual(list(course.embedding), ORIGINAL_VECTOR)
        self.assertEqual(self.redirect_paths(self.session), {new_path: old_path})
        self.assertIsNone(self.session.exec(select(AuditLog.id).where(self.redirect_audit_filter())).first())

    def redirect_paths(self, session):
        return dict(session.exec(select(Redirect.from_path, Redirect.to_path).where(
            Redirect.from_path.startswith(f"/courses/{self.prefix}-"),
        )).all())

    def redirect_audit_filter(self):
        prefix = f"/courses/{self.prefix}-"
        return (AuditLog.entity_type == "redirect") & (
            AuditLog.before["from_path"].astext.startswith(prefix)
            | AuditLog.after["from_path"].astext.startswith(prefix)
        )

    def cleanup_course_fixture(self, course_id):
        with Session(test_engine) as session:
            redirects = session.exec(select(Redirect).where(
                Redirect.from_path.startswith(f"/courses/{self.prefix}-"),
            )).all()
            audits = session.exec(select(AuditLog).where(
                (AuditLog.entity_type == "course") & (AuditLog.entity_id == str(course_id))
                | self.redirect_audit_filter(),
            )).all()
            for audit in audits:
                session.delete(audit)
            for redirect in redirects:
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
            "description": "Original description", "image_path": None, **empty_seo_fields,
        }
        summary = {
            "id": course_id, "name": course_name, "slug": course_slug, "category": None,
            "meta_title": None, "meta_description": None, "has_seo_content": False, "image_path": None,
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

    def test_course_image_path_is_editable_and_survives_a_slug_change(self):
        course = self.make_course()
        editor = AdminUser(
            name="Course Image Editor", email=f"{self.prefix}@example.com",
            password_hash="unused-by-token-auth", role="seo_editor",
        )
        self.session.add(editor)
        self.session.flush()
        editor_id = editor.id
        self.addCleanup(self.remove_editor, editor_id)
        editor_token = create_access_token(editor.email, role="seo_editor", user_id=editor_id)
        owner_token = create_access_token(ACTOR.name)
        course_id = self.commit_course_fixture(course)
        url = f"/admin/courses/{course_id}"
        image_path = "/images/courses/Quran-with-Tajweed-%26-Tarteel.JPG"
        editor_headers = {"Authorization": f"Bearer {editor_token}"}
        owner_headers = {"Authorization": f"Bearer {owner_token}"}
        new_slug = f"{self.prefix}-renamed"
        with TestClient(app) as client, patch("backend.course_updates.embed_one") as embed:
            initial = client.get(url, headers=editor_headers).json()
            saved = client.patch(url, headers=editor_headers, json={"image_path": image_path})
            self.assertEqual(saved.status_code, 200, saved.text)
            self.assertEqual(saved.json(), {**initial, "image_path": image_path})
            listed = client.get("/admin/courses", headers=owner_headers)
            self.assertEqual(next(row for row in listed.json() if row["id"] == course_id)["image_path"], image_path)

            renamed = client.patch(url, headers=editor_headers, json={"slug": new_slug})
            self.assertEqual(renamed.status_code, 200, renamed.text)
            self.assertEqual(renamed.json(), {**initial, "slug": new_slug, "image_path": image_path})
            self.assertEqual(client.get(f"/courses/{course_id}").json()["image_path"], image_path)

            for empty in (None, ""):
                with self.subTest(empty=empty):
                    if empty == "":
                        self.assertEqual(client.patch(url, headers=owner_headers, json={"image_path": image_path}).status_code, 200)
                    cleared = client.patch(url, headers=owner_headers, json={"image_path": empty})
                    self.assertEqual(cleared.status_code, 200, cleared.text)
                    self.assertEqual(cleared.json(), {**initial, "slug": new_slug})
            embed.assert_not_called()

        with Session(test_engine) as session:
            saved_course = session.get(Course, course_id)
            self.assertIsNone(saved_course.image_path)
            self.assertEqual(list(saved_course.embedding), ORIGINAL_VECTOR)
            changes = [log for log in self.course_audits(session, course_id) if "image_path" in log.after]
            self.assertEqual(changes[0].actor_user_id, editor_id)
            self.assertEqual(changes[0].actor_role, "seo_editor")
            self.assertEqual([(log.before, log.after) for log in changes], [
                ({"image_path": None}, {"image_path": image_path}),
                ({"image_path": image_path}, {"image_path": None}),
            ] * 2)

    def test_admin_rejects_invalid_course_image_paths(self):
        course_id = self.commit_course_fixture(self.make_course())
        headers = {"Authorization": f"Bearer {create_access_token(ACTOR.name)}"}
        cases = (
            "https://example.test/images/courses/photo.jpg", "//example.test/photo.jpg",
            "/images/courses/../photo.jpg", "/images/courses/%2e%2e/photo.jpg",
            "/images/courses/%252e%252e/photo.jpg", "/images/courses/sub%2fphoto.jpg",
            "/images/courses/sub\\photo.jpg", "/images/courses//photo.jpg",
            "/images/courses/photo?x=y.jpg", "/images/courses/photo#x.jpg",
            "/images/blog/photo.jpg", "/images/courses/photo.avif", "/images/courses/photo.svg",
            f"/images/courses/{'x' * 240}.jpg",
        )
        with TestClient(app) as client:
            for image_path in cases:
                with self.subTest(image_path=image_path):
                    response = client.patch(f"/admin/courses/{course_id}", headers=headers, json={"image_path": image_path})
                    self.assertEqual(response.status_code, 422, response.text)
                    self.assertEqual(response.json()["detail"][0]["loc"], ["body", "image_path"])
        with Session(test_engine) as session:
            self.assertIsNone(session.get(Course, course_id).image_path)
            self.assertEqual(self.course_audits(session, course_id), [])

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
