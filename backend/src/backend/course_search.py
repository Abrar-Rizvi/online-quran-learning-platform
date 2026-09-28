"""Reusable semantic course search shared by the API router and the agent tools.

Keeping this here (outside ``routers`` and ``agent``) avoids a circular
import between the two layers, while keeping a single source of truth for
the embedding + pgvector cosine-distance search logic.
"""

from sqlmodel import Session, select

from .embeddings import embed_query
from .models import Course
from .schemas import CourseRead

LIST_COLUMNS = (Course.id, Course.name, Course.description, Course.category)


def find_similar_courses(
    session: Session, query: str, limit: int = 10
) -> list[CourseRead]:
    """Return the courses whose embedding is closest to ``query``.

    The embedding is computed before the first query on ``session``, so no
    database connection is checked out while waiting on Gemini (a Session
    only takes a connection when it first executes). Raises
    EmbeddingUnavailable if the embedding can't be computed.
    """
    vector = embed_query(query)
    rows = session.exec(
        select(*LIST_COLUMNS)
        .order_by(Course.embedding.cosine_distance(vector))
        .limit(limit)
    ).all()
    return [CourseRead(id=r[0], name=r[1], description=r[2], category=r[3]) for r in rows]
