# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from main import app

@pytest.fixture(autouse=True)
def mock_external_services():
    # Mock Pinecone index
    with patch("main.index") as mock_index:
        mock_index.upsert.return_value = None
        mock_index.delete.return_value = None
        mock_index.query.return_value = {"matches": []}

        # Mock embeddings
        with patch("main.embedder") as mock_embedder:
            mock_embedder.encode.return_value = [[0.1] * 384]

            # Mock LLM
            async def fake_stream(prompt):
                class Chunk:
                    def __init__(self, c): self.content = c
                yield Chunk("test-response")
            with patch("main.llm") as mock_llm:
                mock_llm.astream = fake_stream

                # Mock PdfReader
                with patch("main.PdfReader") as mock_pdf:
                    mock_pdf.return_value.pages = [
                        MagicMock(extract_text=lambda: "Sample resume text")
                    ]
                    yield


@pytest.fixture
def client():
    return TestClient(app)
