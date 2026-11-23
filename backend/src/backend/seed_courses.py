"""Seed the courses table from seed_data/courses.json.

Idempotent: existing courses (matched by unique name) are skipped.

Runs:
    uv run python -m backend.seed_courses
"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlmodel import select

from .course_slugs import LEGACY_QAIDA_SLUG, NOORANI_QAIDA_SLUG, slug_from_course_name
from .db import engine
from .embeddings import embed
from .models import Course

SEED_FILE = Path(__file__).resolve().parents[2] / "seed_data" / "courses.json"

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def load_courses() -> list[dict]:
    with open(SEED_FILE, encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    from sqlmodel import Session

    with Session(engine) as session:
        existing_names = set(session.scalars(select(Course.name)).all())
        qaida_exists = session.exec(
            select(Course.id).where(Course.slug.in_([LEGACY_QAIDA_SLUG, NOORANI_QAIDA_SLUG]))
        ).first() is not None

        to_insert: list[dict] = []
        skipped = 0
        for item in load_courses():
            name = item["name"]
            if name in existing_names:
                skipped += 1
                continue
            slug = slug_from_course_name(name)
            if slug == NOORANI_QAIDA_SLUG and qaida_exists:
                skipped += 1
                continue
            to_insert.append(
                {
                    "name": name,
                    "slug": slug,
                    "description": item.get("description"),
                    "category": item.get("category"),
                }
            )
            existing_names.add(name)

        if to_insert:
            texts = [c["description"] or c["name"] for c in to_insert]
            embeddings = embed(texts)
            for course_data, vector in zip(to_insert, embeddings, strict=True):
                session.add(Course(**course_data, embedding=vector))
            session.commit()

        print(f"Inserted {len(to_insert)} course(s), skipped {skipped} duplicate(s).")


if __name__ == "__main__":
    main()
