from sqlalchemy import Engine, text

import app.models  # noqa: F401 - Register models with Base.metadata
from app.database.base import Base


def init_db(target_engine: Engine | None = None) -> None:
    """Safely creates all database tables and verifies required safety columns.

    Existing tables and data are preserved.
    """
    from app.database.session import engine as current_engine

    db_engine = target_engine or current_engine
    Base.metadata.create_all(bind=db_engine)

    # Lightweight schema migration for SQLite: ensure newly added safety columns exist
    with db_engine.connect() as conn:
        try:
            # Check patients columns
            result = conn.execute(text("PRAGMA table_info(patients)")).fetchall()
            cols = [r[1] for r in result]
            if cols and "is_active" not in cols:
                conn.execute(
                    text("ALTER TABLE patients ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL")
                )
            if cols and "is_synthetic" not in cols:
                conn.execute(
                    text("ALTER TABLE patients ADD COLUMN is_synthetic BOOLEAN DEFAULT 0 NOT NULL")
                )

            # Check encounters columns
            result_enc = conn.execute(text("PRAGMA table_info(encounters)")).fetchall()
            cols_enc = [r[1] for r in result_enc]
            if cols_enc and "is_synthetic" not in cols_enc:
                conn.execute(
                    text("ALTER TABLE encounters ADD COLUMN is_synthetic BOOLEAN DEFAULT 0 NOT NULL")
                )

            conn.commit()
        except Exception:
            pass
