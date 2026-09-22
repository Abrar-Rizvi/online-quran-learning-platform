"""Seed the course_plans table from courses already in the database.

For every course, creates three plans:
  - 2 days/week (Weekend: Saturday & Sunday) -> $32.00 USD
  - 3 days/week -> $45.00 USD
  - 5 days/week -> $60.00 USD

Idempotent: an existing (course_id, days_per_week) pair is skipped
(also enforced by the uq_course_plans_course_days unique constraint).

Runs:
    uv run python -m backend.seed_course_plans
"""

from decimal import Decimal

from sqlmodel import select

from .db import engine
from .models import Course, CoursePlan

PLANS = [
    (2, Decimal("32.00")),
    (3, Decimal("45.00")),
    (5, Decimal("60.00")),
]


def main() -> None:
    from sqlmodel import Session

    with Session(engine) as session:
        course_ids = session.scalars(select(Course.id)).all()

        existing = set(
            session.exec(
                select(CoursePlan.course_id, CoursePlan.days_per_week)
            ).all()
        )

        inserted = 0
        skipped = 0
        for course_id in course_ids:
            for days_per_week, fee in PLANS:
                if (course_id, days_per_week) in existing:
                    skipped += 1
                    continue
                session.add(
                    CoursePlan(
                        course_id=course_id,
                        days_per_week=days_per_week,
                        fee=fee,
                        currency="USD",
                    )
                )
                existing.add((course_id, days_per_week))
                inserted += 1

        session.commit()

        print(
            f"Inserted {inserted} course_plan(s), "
            f"skipped {skipped} duplicate(s)."
        )


if __name__ == "__main__":
    main()
