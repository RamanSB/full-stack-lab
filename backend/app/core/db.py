from sqlmodel import SQLModel, Session, create_engine

from backend.app.core.config import get_settings


settings = get_settings()

engine = create_engine(
    url=settings.database_url, echo=True, echo_pool=True, pool_pre_ping=True
)


def create_db_tables() -> None:
    # Import models so their Table objects are registered on SQLModel.metadata
    # before create_all. Add new models to backend.app.models.__init__.
    import backend.app.models  # noqa: F401

    SQLModel.metadata.create_all(engine)
