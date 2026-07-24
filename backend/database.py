from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from config import settings


engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_timeout=3,
    connect_args={
        "connect_timeout": 3,
    },
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """
    Provide one database session and always close it afterward.

    FastAPI routes will use this dependency when database-backed endpoints
    are added.
    """

    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def database_is_available() -> bool:
    """
    Run a small query to verify that PostgreSQL accepts connections.
    """

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return True
    except SQLAlchemyError:
        return False