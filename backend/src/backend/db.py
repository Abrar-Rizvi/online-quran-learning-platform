from sqlmodel import Session, create_engine

from .config import settings

url = settings.database_url
if url.startswith("postgresql://"):
    url = url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(url, echo=False, pool_pre_ping=True)


def get_session():
    with Session(engine) as session:
        yield session
