"""Fill missing course image paths from the frontend's automatic matches."""

import argparse
import json
import re
from pathlib import Path
from urllib.parse import quote, unquote

from sqlalchemy.orm import load_only
from sqlmodel import Session, select

from backend.course_images import COURSE_IMAGE_EXTENSIONS, COURSE_IMAGE_PREFIX, validate_course_image_path
from backend.course_slugs import LEGACY_QAIDA_SLUG, NOORANI_QAIDA_SLUG
from backend.db import engine
from backend.models import Course

FRONTEND_ROOT = Path(__file__).resolve().parents[2] / "frontend"
IMAGE_DIR = FRONTEND_ROOT / "public" / "images" / "courses"
OVERRIDES_FILE = FRONTEND_ROOT / "lib" / "course-image-overrides.json"
# The existing frontend filename generator also recognizes AVIF for automatic matches.
FALLBACK_EXTENSIONS = (*COURSE_IMAGE_EXTENSIONS, ".avif")


def filename_matches(image_dir: Path) -> dict[str, str]:
    matches: dict[str, str] = {}
    # Match the generator's JavaScript string order and first-file-wins rule.
    for path in sorted(image_dir.iterdir(), key=lambda entry: entry.name.encode("utf-16-be")):
        if path.is_symlink() or not path.is_file() or path.suffix.lower() not in FALLBACK_EXTENSIONS:
            continue
        key = re.sub(r"[^a-z0-9]+", "-", path.stem.strip().lower()).strip("-")
        if key:
            matches.setdefault(key, COURSE_IMAGE_PREFIX + quote(path.name, safe="!'()*"))
    return matches


def backfill(session: Session, image_dir: Path, *, dry_run: bool) -> tuple[int, int, int, int]:
    overrides = json.loads(OVERRIDES_FILE.read_text(encoding="utf-8"))
    matches = filename_matches(image_dir)
    statement = select(Course).options(load_only(Course.slug, Course.image_path)).order_by(Course.id)
    if not dry_run:
        # Keep a concurrent editor from setting a path between our read and write.
        statement = statement.with_for_update()
    updated = skipped = missing = unsupported = 0
    for course in session.exec(statement):
        if course.image_path is not None:
            skipped += 1
            continue
        override_slug = NOORANI_QAIDA_SLUG if course.slug == LEGACY_QAIDA_SLUG else course.slug
        path = overrides.get(override_slug) or matches.get(course.slug)
        if not path or not (image_dir / unquote(path.removeprefix(COURSE_IMAGE_PREFIX))).is_file():
            missing += 1
            continue
        try:
            validate_course_image_path(path)
        except ValueError as exc:
            print(f"Course #{course.id} ({course.slug}): skipping {path}: {exc}")
            unsupported += 1
            continue
        print(f"{'Would set' if dry_run else 'Setting'} course #{course.id} ({course.slug}) to {path}")
        if not dry_run:
            course.image_path = path
        updated += 1
    return updated, skipped, missing, unsupported


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Print the planned changes without writing them.")
    args = parser.parse_args(argv)

    with Session(engine) as session:
        updated, skipped, missing, unsupported = backfill(session, IMAGE_DIR, dry_run=args.dry_run)
        if not args.dry_run:
            session.commit()
    print(f"{'Would update' if args.dry_run else 'Updated'}: {updated}, skipped (already set): {skipped}, "
          f"no matching file: {missing}, unsupported path: {unsupported}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
