# tests/conftest.py
import pytest
import asyncio
from unittest.mock import patch, MagicMock
from main import SessionLocal, Base, engine

# ---------------- DATABASE ----------------
@pytest.fixture(autouse=True, scope="function")
def clear_db():
    """Clear users and resumes before each test"""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(Base.metadata.tables['users']).delete()
    db.query(Base.metadata.tables['resumes']).delete()
    db.commit()
    db.close()
    yield
    # cleanup
    db = SessionLocal()
    db.query(Base.metadata.tables['users']).delete()
    db.query(Base.metadata.tables['resumes']).delete()
    db.commit()
    db.close()

# ---------------- MOCK PINECONE ----------------
@pytest.fixture(autouse=True)
def mock_pinecone():
    with patch("main.index") as mock_index:
        mock_index.upsert = MagicMock()
        mock_index.delete = MagicMock()
        mock_index.query = MagicMock(return_value={"matches": []})
        yield mock_index

# ---------------- MOCK LLM ----------------
@pytest.fixture
async def mock_llm():
    async def async_gen(*args, **kwargs):
        yield "mocked response"

    # PATCH THE CORRECT ATTRIBUTE
    with patch("main.llm.stream", new_callable=AsyncMock) as mock_stream:
        mock_stream.side_effect = async_gen
        yield mock_stream

# ---------------- ASYNCIO FIXTURE ----------------
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for asyncio."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
