"""Tool functions used by the Admission Agent.

Each function below is a plain, callable tool that the agent can invoke
(standalone today, wired into Groq tool-calling later). Every function has a
JSON schema entry in ``TOOLS`` describing its name, description, and
parameters for Groq function calling.

These functions only read data (plus settings); they never mutate the
database. A fresh short-lived session is opened per call.
"""

import json

from sqlalchemy import func
from sqlmodel import Session, select

from ..config import settings
from ..course_search import find_similar_courses
from ..db import engine
from ..models import Course, CoursePlan

# How many matches the search tool returns to the agent.
SEARCH_LIMIT = 5

TRIAL_POLICY = (
    "We offer a completely free 5-day trial. During the trial the student "
    "learns one-on-one with a qualified teacher, exactly like our regular "
    "classes. If you are satisfied after the trial, you can pay and start "
    "your regular classes right away. There is no cost or commitment to try."
)


def _find_course(session: Session, name: str) -> Course | None:
    """Return the best-matching course for a (possibly partial) name.

    Prefers an exact, case-insensitive match; otherwise falls back to the
    first case-insensitive partial match in the courses table.
    """
    query = name.strip()
    if not query:
        return None

    exact = session.exec(
        select(Course).where(func.lower(Course.name) == query.lower())
    ).first()
    if exact is not None:
        return exact

    return session.exec(
        select(Course)
        .where(Course.name.ilike(f"%{query}%"))
        .order_by(Course.id)
    ).first()


def search_courses(query: str) -> str:
    """Search the course catalog semantically for the given query.

    Reuses the same embedding + pgvector cosine-distance search that powers
    ``GET /courses/search`` (see ``find_similar_courses``), then returns the
    closest matching courses with their name, description and category.
    """
    with Session(engine) as session:
        courses = find_similar_courses(session, query, limit=SEARCH_LIMIT)

    results = [
        {
            "name": c.name,
            "description": c.description,
            "category": c.category,
        }
        for c in courses
    ]
    return json.dumps(results)


def get_course_details(course_name: str) -> str:
    """Look up a single course by name (case-insensitive, partial match OK).

    Returns the course's name, description and category. If no course
    matches, returns a clear "not found" message.
    """
    with Session(engine) as session:
        course = _find_course(session, course_name)

    if course is None:
        return json.dumps(
            {
                "error": (
                    f"No course matching '{course_name}' was found. "
                    "Politely tell the visitor it is not in our catalog yet "
                    "and suggest searching again with different words."
                )
            }
        )

    return json.dumps(
        {
            "name": course.name,
            "description": course.description,
            "category": course.category,
        }
    )


def get_course_fee(course_name: str) -> str:
    """Return the real monthly fee for each schedule of a course.

    The ``fee`` in ``course_plans`` is the MONTHLY price for that schedule;
    ``days_per_week`` only describes the frequency. Classes per month are
    derived as ``days_per_week * 4`` (e.g. 3 days/week = 12 classes/month,
    5 days/week = 20 classes/month). The fee is never guessed or estimated;
    if the course (or its plans) is not found, a clear message is returned.
    """
    with Session(engine) as session:
        course = _find_course(session, course_name)
        if course is None:
            return json.dumps(
                {
                    "error": (
                        f"No course matching '{course_name}' was found, so "
                        "its fee cannot be given. Do not guess or estimate a "
                        "fee. Ask the visitor to confirm the exact course name."
                    )
                }
            )

        plans = session.exec(
            select(CoursePlan).where(CoursePlan.course_id == course.id)
        ).all()

    if not plans:
        return json.dumps(
            {
                "error": (
                    f"'{course.name}' exists but has no published course "
                    "plans yet. Do not guess or estimate a fee."
                )
            }
        )

    schedule_plans = [
        {
            "days_per_week": plan.days_per_week,
            "classes_per_month": plan.days_per_week * 4,
            "monthly_fee": float(plan.fee),
            "currency": plan.currency,
        }
        for plan in sorted(plans, key=lambda p: p.days_per_week)
    ]
    return json.dumps({"course": course.name, "plans": schedule_plans})


def get_trial_info() -> str:
    """Return a description of the free 5-day trial policy (static text)."""
    return TRIAL_POLICY


def get_registration_link() -> str:
    """Return the course registration URL, or guidance if it is not ready.

    Reads ``REGISTRATION_FORM_URL`` from settings. When the URL is not set,
    tells the visitor registration is being finalized and to reach out via
    WhatsApp instead.
    """
    url = settings.registration_form_url
    if url:
        return (
            "You can register for your course here: "
            f"{url} — share this link with the visitor."
        )
    return (
        "Registration is being finalized and the online form is not "
        "available yet. Please ask the visitor to reach out on WhatsApp "
        "so we can complete their enrollment with a teacher."
    )


def route_to_whatsapp(reason: str) -> str:
    """Return the WhatsApp contact link together with the given reason.

    Reads ``WHATSAPP_LINK`` from settings. When the link is not set, tells
    the visitor WhatsApp support is being set up and will be available soon.
    """
    link = settings.whatsapp_link
    if link:
        return json.dumps(
            {
                "reason": reason,
                "whatsapp_link": link,
            }
        )
    return (
        "Our WhatsApp contact is being set up and will be available soon. "
        "Please share the visitor's question and reassure them we will be "
        f"in touch shortly. (Reason: {reason})"
    )


TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "search_courses",
            "description": (
                "Semantically search the course catalog for courses matching "
                "a visitor's query (e.g. 'adult tajweed', 'kids qaida', "
                "'learn Arabic'). Returns matching courses with their name, "
                "description and category."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The visitor's search text or the topic/course they are interested in.",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_course_details",
            "description": (
                "Look up a single course by name (partial or exact, "
                "case-insensitive) and return its name, description and "
                "category."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "course_name": {
                        "type": "string",
                        "description": "The name of the course to look up, e.g. 'Quran Reading for Beginners'.",
                    }
                },
                "required": ["course_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_course_fee",
            "description": (
                "Return the real MONTHLY fee for each schedule of a course "
                "from its published course plans, e.g. 3 days/week = 12 "
                "classes/month for USD 45.00 per month. The fee is monthly, "
                "never per week. Never guesses a fee; returns not-found when "
                "unavailable."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "course_name": {
                        "type": "string",
                        "description": "The name of the course whose fee to look up, e.g. 'Quran with Tajweed & Tarteel'.",
                    }
                },
                "required": ["course_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_trial_info",
            "description": (
                "Return information about the free 5-day trial: it is "
                "completely free, the student learns with a teacher, and if "
                "satisfied they can pay and start regular classes."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_registration_link",
            "description": (
                "Return the registration form URL so a visitor can sign up "
                "for a course. If registration is not ready yet, explains "
                "that and suggests WhatsApp instead."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "route_to_whatsapp",
            "description": (
                "Route a visitor to WhatsApp (e.g. for a question, a "
                "registration, or payment details) and returns the WhatsApp "
                "contact link together with the reason for routing."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {
                        "type": "string",
                        "description": "Short reason the visitor is being routed to WhatsApp.",
                    }
                },
                "required": ["reason"],
            },
        },
    },
]
