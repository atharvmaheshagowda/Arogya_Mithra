import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.init_db import init_db
from app.database.session import get_db
from app.main import app


@pytest.fixture
def isolated_test_db(tmp_path, monkeypatch):
    """Provides a fresh, isolated temporary SQLite database for each test.

    Completely isolates tests from the development database (Arogya.db).
    """
    test_db_file = tmp_path / "test_Arogya.db"
    test_db_url = f"sqlite:///{test_db_file.as_posix()}"
    test_engine = create_engine(
        test_db_url,
        connect_args={"check_same_thread": False},
    )
    test_session_local = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
    )

    # Initialize all database tables on the temporary engine
    init_db(test_engine)

    # Monkeypatch session and engine
    monkeypatch.setattr("app.database.session.engine", test_engine)
    monkeypatch.setattr("app.database.session.SessionLocal", test_session_local)

    yield test_engine
    test_engine.dispose()


@pytest.fixture
def db_session(isolated_test_db):
    """Provides a direct database session against the isolated test database."""
    from app.database.session import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(isolated_test_db):
    """FastAPI TestClient wired to the isolated test database."""
    with TestClient(app) as test_client:
        yield test_client

