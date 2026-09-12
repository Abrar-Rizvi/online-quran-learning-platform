# Online Quran Website — Full Project Analysis Report

**Date:** 2026-09-04
**Scope:** `backend/` (FastAPI + SQLModel + pgvector) and `frontend/` (Next.js 16), plus the live Neon database (`online-quran-project`, project `holy-firefly-56253190`).

---

## 1. Executive Summary

| Area | Status |
|---|---|
| Backend API (catalog + enrollment) | ~40% — core read/write flows work |
| Semantic-search infra (embeddings + HNSW) | Built & populated, **but unused** (no search endpoint) |
| Chatbot / RAG chat | **Not implemented** (foundation only) |
| Frontend | **Not started** (default `create-next-app` template) |
| Database | Schema complete, migrations applied, seeded |

The backend is a solid, clean foundation for a **course-catalog + enrollment** site.
The website itself (frontend) is entirely unbuilt, and the search endpoint that the whole
vector/RAG investment was meant to power does not exist yet.

---

## 2. FastAPI Endpoints — Full Inventory

Total endpoints implemented: **5** (matches `api_information.txt`)

### Implemented (5)

| # | Method + Path | Handler | File |
|---|---|---|---|
| 1 | `GET /health` | Health check | `backend/src/backend/main.py:12` |
| 2 | `GET /courses` | List all courses (no embeddings returned) | `routers/courses.py:13` |
| 3 | `GET /courses/{course_id}` | One course + its course plans (404 if missing) | `routers/courses.py:19` |
| 4 | `POST /enrollments` | Find-or-create student by email, create enrollment; 404 bad plan, 409 duplicate | `routers/enrollments.py:42` |
| 5 | `GET /enrollments/{enrollment_id}` | Single enrollment incl. student + plan (404 if missing) | `routers/enrollments.py:84` |

### Documented "future" endpoints (8, NOT implemented — `future_apis.txt`)

- `GET /students/{student_id}/enrollments`
- `GET /students`
- `GET /students/{student_id}`
- `GET /enrollments` (list/filter all)
- `PATCH /enrollments/{enrollment_id}` (status/time updates)
- `DELETE /enrollments/{enrollment_id}`
- `GET /courses/search` ← marked "remaining, required now"
- `POST /auth/login`

### Chatbot endpoints

**None.** There is no `chat` router, no chat schemas, no messages model, and no
conversation storage anywhere in the codebase.

---

## 3. RAG / Semantic Search Status

### What exists (the "retrieval storage" half of RAG)
- `backend/src/backend/embeddings.py` — embeds text with Google **`gemini-embedding-001`**, 1536 dims.
- `courses.embedding` column (`vector(1536)`) on every course row.
- HNSW index `ix_courses_embedding_hnsw` using `vector_cosine_ops` (created in the initial Alembic migration).
- `seed_courses.py` generates embeddings at seed time.
- **Live DB verified:** all 24/24 courses have a populated embedding vector.

### What is missing (the usable half)
- **No retrieval endpoint** — `GET /courses/search` (semantic keyword search) is documented as the one "remaining API required now" (`remaining_apis.txt`) but is not coded.
- **No generation / LLM chat** — no Gemini chat call, no `langchain`/`openai`, no prompt code.
- **No RAG corpus** — the DB only stores course metadata, not Quran text/chunks that a Q&A chatbot would answer from.
- **No chat history** — no `messages`/`conversations` table.

**Bottom line:** You have *embedding + vector-index infrastructure*, which is the
storage layer RAG needs, but **no actual RAG pipeline and no chatbot**. Semantic course
search is one endpoint away; a Quran Q&A chatbot is a separate, larger feature.

> Note: a separate Neon sandbox project **"Rag learning"** (`young-thunder-88811518`,
> branches `dev` / `courses-practice`) exists as experimentation but is **not** connected
> to this repo or app and currently holds no visible data.

---

## 4. Database Design Analysis (live Neon: `online-quran-project`)

Migration state: **at head** (`b858f4a5e8fb` — all 3 migrations applied).
Row counts (live): **courses 24 · course_plans 48 · students 1 · enrollments 2**

### ERD (concise)

```
courses (24) 1 ── * course_plans (48) 1 ── * enrollments (2) * ── 1 students (1)
```

### courses
| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| name | varchar | UNIQUE (btree), indexed |
| description | varchar NULL | |
| category | varchar NULL | indexed — 7 distinct values |
| embedding | vector(1536) NULL | + **HNSW cosine index** |

### course_plans
| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| course_id | int FK → courses | indexed |
| days_per_week | int | **UNIQUE(course_id, days_per_week)** |
| fee | numeric(10,2) | |
| currency | varchar(3) | default 'USD' |

### students
| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| name | varchar | |
| email | varchar | UNIQUE, indexed (one student per email) |
| phone / country | varchar NULL | country indexed |
| created_at | timestamp | no DB default (app sets it) |

### enrollments
| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| student_id | int FK → students | indexed |
| course_plan_id | int FK → course_plans | indexed |
| status | varchar | default 'active', indexed |
| preferred_time | time NULL | added in migration #2 |
| enrolled_at | timestamp | |
| | | **UNIQUE(student_id, course_plan_id)** → prevents duplicates (409) |

### Design strengths
1. **Normalized & clean** (3NF): no denormalized/redundant fields.
2. Correct **composite unique constraints** to enforce domain rules at DB level.
3. FK indexes on all join columns; indexes on all lookup columns (`category`, `status`).
4. `numeric(10,2)` for money (never float).
5. First-class **vector support** with an HNSW index — future-proof for search.
6. Migrations fully applied; seed scripts are **idempotent**.

### Weaknesses / risks / suggested improvements
1. **`status` has no constraint** — a free `varchar`. Any typo (`"activ"`) silently accepted.
   → Add `CHECK (status IN ('active','completed','cancelled'))` or a Postgres `ENUM`.
2. **No `ON DELETE` behavior** on FKs (default `NO ACTION`) — deleting a course with plans will error.
   → Decide and add `ON DELETE CASCADE` / `RESTRICT` per relationship.
3. **Timestamps stored as `timestamp WITHOUT time zone`** though app generates UTC-aware
   datetimes → risk of timezone confusion. → Consider `timestamptz` + `server_default=now()`.
4. **`created_at` / status defaults are app-layer only**, no DB `DEFAULT`. Direct inserts (scripts, admin) bypass them.
5. **No email format / length / `fee >= 0` / `days_per_week` DB checks.** SQLModel `ge=1, le=7` on
   `days_per_week` is validated at the API layer only, **not** in the DB (no CHECK constraint exists).
6. **No auth / user identity**: `students` is a plain contact record — no password, no roles,
   no link to an admin, so no endpoint can be truly "protected" yet.
7. **Absent domain tables** for a real school platform: teachers, schedules/class slots,
   payments/invoices, feedback, lesson tracking, admin users, chat/messages.
8. The `Course.enrollments` relationship is `viewonly` via a secondary join
   (`course_plans`) — slightly unusual; works but only reachable in code, not via a FK.

---

## 5. Frontend Status

Stack: **Next.js 16.3.0 · React 19.2 · Tailwind v4 · TypeScript** (strict).

- `app/` contains only the boilerplate `create-next-app` output: `layout.tsx` + a default
  `page.tsx` (Next.js "get started" landing), default metadata, `favicon.ico`, `globals.css`.
- **No** API client / env config (no `NEXT_PUBLIC_API_URL`), **no** components, **no**
  course pages, enrollment form, search, chatbot, auth, or admin UI.
- No `node_modules` install is committed; `AGENTS.md`/`CLAUDE.md` note the Next version
  docs live under `node_modules/next/dist/docs/`.

**Frontend work = 0% of the actual product.**

### Required frontend build-out (not yet started)
1. Env/config wiring + typed API client for the 5 live endpoints.
2. Course listing + course detail (+ search box once `/courses/search` exists).
3. Enrollment form (course plan picker, student details, preferred time) → `POST /enrollments`.
4. Confirmation / lookup view (uses `GET /enrollments/{id}`).
5. (Later) student dashboard, admin screens, chatbot widget.

---

## 6. What Is COMPLETED ✅

- **Backend scaffolding**: FastAPI app, routers/schemas/models layering, dependency-injected DB session (`db.py`).
- **Full DB schema** via 3 Alembic migrations, **all applied** on Neon production.
- **Seed data**: 24 courses across 7 categories (Children 9, Short Courses 4, Adults 3, Adults/Females 3, Children/Adults 2, Language 2, Females 1) + 48 course plans (3×/wk $45, 5×/wk $60).
- **Embedding pipeline**: Gemini embeddings generated and stored for **all 24** courses; HNSW index live.
- **5 working endpoints** for catalog browsing + enrollment (create/fetch), with correct 404/409 handling and email normalization/dedup.
- **Documentation**: `api_information.txt`, `future_apis.txt`, `remaining_apis.txt`.

---

## 7. What Remains TODO ❌ (priority order)

**Backend**
1. `GET /courses/search` (semantic + keyword/category filter) — *the documented #1 gap*; the HNSW index is currently dormant.
2. Add **CORS middleware** (frontend runs on a different origin) — otherwise browser calls will be blocked.
3. Student & enrollment admin endpoints (list/get students, list/update/delete enrollments) — mostly "future list" items.
4. `POST /auth/login` + roles to protect admin endpoints (nothing is protected today).
5. DB hardening from §4: status CHECK, FK `ON DELETE`, `timestamptz`/server defaults.
6. Automated tests (none exist) + lint/type tooling hooks.

**Chatbot / RAG (new feature area — nothing built)**
7. Decide scope:
   - (a) Course-assistant chat (answers from the 24-course catalog),
   - (b) Quran Q&A chatbot (needs a new corpus of Quran knowledge embedded + a `messages` table).
8. Add retrieval endpoint (vector + optional hybrid keyword) and an LLM generation call (Gemini is already a dependency).
9. Add `messages`/`conversations` table + chat schemas/routers.

**Frontend (greenfield)**
10. Build real pages (catalog → course detail → enrollment) against the live API.
11. Search UI; later dashboard/admin/auth; optionally chatbot widget.

---

## 8. Key File Reference

| File | Role |
|---|---|
| `backend/src/backend/main.py` | FastAPI app, router mounts, `/health` |
| `backend/src/backend/models/*` | SQLModel tables (Course, CoursePlan, Student, Enrollment) |
| `backend/src/backend/routers/courses.py`, `enrollments.py` | API logic |
| `backend/src/backend/schemas/*` | Pydantic read/create models |
| `backend/src/backend/embeddings.py` | Gemini embedding client (1536-d) |
| `backend/src/backend/seed_courses.py`, `seed_course_plans.py` | Idempotent seeding |
| `backend/alembic/versions/*` | 3 migrations (incl. HNSW index) |
| `backend/seed_data/courses.json` | 24-course source data |
| `backend/api_information.txt` / `future_apis.txt` / `remaining_apis.txt` | API roadmap docs |
| `frontend/app/*` | Default Next.js template only |

---

*Generated from repo inspection + live Neon database state.*
