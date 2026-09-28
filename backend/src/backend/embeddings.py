import logging
import threading
from collections import OrderedDict
from functools import lru_cache

from google.genai import Client, types

from .config import settings

logger = logging.getLogger("uvicorn.error")

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 1536


def embed(texts: list[str]) -> list[list[float]]:
    if not settings.gemini_api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured; set it in the environment "
            "or in .env"
        )
    client = Client(api_key=settings.gemini_api_key)
    config = types.EmbedContentConfig(
        output_dimensionality=EMBEDDING_DIM,
        task_type="SEMANTIC_SIMILARITY",
    )
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config=config,
    )
    return [e.values for e in result.embeddings]


def embed_one(text: str) -> list[float]:
    return embed([text])[0]


# ── Search queries (public GET /courses/search) ─────────────────────────────

# Per attempt, in milliseconds. The library also retries timeouts, so the
# worst case is 2 × 4 s + ~0.6 s back-off ≈ 9 s before the request gives up.
QUERY_TIMEOUT_MS = 4_000
QUERY_ATTEMPTS = 2  # the first try + at most 1 retry
QUERY_CACHE_SIZE = 500


class EmbeddingUnavailable(Exception):
    """The query embedding couldn't be computed (no/invalid key, timeout, network, quota…)."""


@lru_cache(maxsize=1)
def _query_client(api_key: str) -> Client:
    return Client(
        api_key=api_key,
        http_options=types.HttpOptions(
            timeout=QUERY_TIMEOUT_MS,
            retry_options=types.HttpRetryOptions(
                attempts=QUERY_ATTEMPTS, initial_delay=0.5, max_delay=1.0, jitter=0.1
            ),
        ),
    )


_query_cache: "OrderedDict[str, list[float]]" = OrderedDict()
_query_cache_lock = threading.Lock()


def normalize_query(text: str) -> str:
    return " ".join(text.split()).lower()


def embed_query(text: str) -> list[float]:
    """Embedding for a search query, with a short timeout and an LRU cache.

    Only successful embeddings are cached. Any failure raises
    EmbeddingUnavailable; the real error is logged here (never the key) and
    is not passed on to API clients.
    """
    key = normalize_query(text)
    with _query_cache_lock:
        cached = _query_cache.get(key)
        if cached is not None:
            _query_cache.move_to_end(key)
            return cached

    if not settings.gemini_api_key:
        logger.error("Course search: GEMINI_API_KEY is not configured")
        raise EmbeddingUnavailable("not configured")
    try:
        result = _query_client(settings.gemini_api_key).models.embed_content(
            model=EMBEDDING_MODEL,
            contents=[key],
            config=types.EmbedContentConfig(
                output_dimensionality=EMBEDDING_DIM, task_type="SEMANTIC_SIMILARITY"
            ),
        )
        vector = list(result.embeddings[0].values)
    except Exception as exc:
        logger.error("Course search: embedding failed (%s): %s", type(exc).__name__, str(exc)[:300])
        raise EmbeddingUnavailable(type(exc).__name__) from exc

    with _query_cache_lock:
        _query_cache[key] = vector
        _query_cache.move_to_end(key)
        while len(_query_cache) > QUERY_CACHE_SIZE:
            _query_cache.popitem(last=False)
    return vector
