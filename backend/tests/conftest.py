# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import numpy as np
from main import app  # absolute import

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
def mock_external_services():
    """Mock external dependencies: Pinecone, embeddings, LLM, PdfReader, DB."""
    # Mock Pinecone
    with patch("main.index") as mock_index:
        mock_index.upsert.return_value = None
        mock_index.delete.return_value = None
        mock_index.query.return_value = {"matches": []}

        # Mock embeddings to return numpy arrays
        with patch("main.embedder") as mock_embedder:
            mock_embedder.encode.return_value = np.array([[0.1] * 384])

            # Mock LLM to return predictable chunks
            async def fake_stream(prompt):
                class Chunk:
                    def __init__(self, c):
                        self.content = c
                yield Chunk("test-output")
            with patch("main.llm") as mock_llm:
                mock_llm.astream = fake_stream

                # Mock PdfReader
                with patch("main.PdfReader") as mock_pdf:
                    mock_pdf.return_value.pages = [
                        MagicMock(extract_text=lambda: "Sample resume text")
                    ]

                    # Mock DB session to avoid real DB writes
                    with patch("main.SessionLocal") as mock_session:
                        mock_db = MagicMock()
                        mock_session.return_value = mock_db
                        yield
