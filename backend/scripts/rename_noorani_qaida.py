"""Rename the existing Qaida course. Run from backend/ after deploying."""

import argparse
import re
import sys

from fastapi import HTTPException
from sqlalchemy.engine import Engine
from sqlmodel import Session, select

from backend.auth import AdminPrincipal
from backend.config import settings
from backend.course_slugs import LEGACY_QAIDA_SLUG, NOORANI_QAIDA_SLUG
from backend.course_updates import update_course
from backend.db import engine
from backend.embeddings import EmbeddingUnavailable
from backend.models import Course

NEW_NAME = "Noorani Qaida Course"
OLD_NAME = re.compile(r"\bqaida\s+for\s+beginners?\b", re.IGNORECASE)


def main(argv: list[str] | None = None, *, db_engine: Engine = engine) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--yes", action="store_true", help="Apply the rename. Default is a dry-run.")
    args = parser.parse_args(argv)

    print(f"Database host: {db_engine.url.host or '(local)'}", flush=True)
    try:
        with Session(db_engine) as session:
            courses = session.exec(
                select(Course).where(Course.slug.in_([LEGACY_QAIDA_SLUG, NOORANI_QAIDA_SLUG]))
            ).all()
            by_slug = {course.slug: course for course in courses}
            current = by_slug.get(LEGACY_QAIDA_SLUG)
            renamed = by_slug.get(NOORANI_QAIDA_SLUG)
            if current is None and renamed is not None and renamed.name == NEW_NAME:
                print(f"Course #{renamed.id} is already renamed.")
                return 0
            if current is None or renamed is not None:
                print("Expected one course at the old slug and a free destination slug.", file=sys.stderr)
                return 1

            course_id = current.id
            print(f"Course #{course_id}: {current.name} ({current.slug}) → {NEW_NAME} ({NOORANI_QAIDA_SLUG})")
            print(f"Description to keep: {current.description or '(empty)'}")
            if current.description and OLD_NAME.search(current.description):
                print("Review: the description still contains wording based on the old course name.")
            if not args.yes:
                print("Dry-run. Pass --yes to apply the rename.")
                return 0

            actor = AdminPrincipal(
                user_id=None, name=settings.admin_username or "Course rename script",
                email=None, role="owner",
            )
            update_course(session, course_id, name=NEW_NAME, slug=NOORANI_QAIDA_SLUG, actor=actor)
            session.commit()
            print(f"Renamed course #{course_id} and created its permanent redirect.")
    except (EmbeddingUnavailable, HTTPException) as exc:
        message = exc.detail if isinstance(exc, HTTPException) else str(exc)
        print(f"Rename failed: {message}", file=sys.stderr)
        return 1
    except Exception as exc:
        # Driver and SDK errors may contain connection details.
        print(f"Rename failed ({type(exc).__name__}).", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
