from google.genai import Client, types

from .config import settings

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
