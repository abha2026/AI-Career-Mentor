import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from main import app, SessionLocal, User, ResumeMeta, cleanup_old_resumes, get_hash, CACHE, chunk_text, upsert_chunks, index, ask_llm

client = TestClient(app)

@pytest.mark.asyncio
async def test_ask_llm_streams_and_caches():
    prompt = "test prompt"

    # Ensure clean cache
    CACHE.clear()

    # Fake chunks that astream will yield
    class FakeChunk:
        def __init__(self, content):
            self.content = content

    async def fake_astream(_prompt: str):
        assert _prompt == prompt
        yield FakeChunk("part1-")
        yield FakeChunk("part2")

    # Patch llm.astream inside main
    with patch("main.llm") as mock_llm:
        mock_llm.astream = fake_astream

        # First call: should stream and fill cache
        result1 = await ask_llm(prompt)
        assert result1 == "part1-part2"
        # Cache should now contain the value
        assert len(CACHE) == 1

        # Second call: should return from cache, not call astream again
        mock_llm.astream = AsyncMock(side_effect=AssertionError("astream should not be called on cached prompt"))
        result2 = await ask_llm(prompt)
        assert result2 == "part1-part2"

def test_upsert_chunks_inserts_metadata_and_vectors():
    user_id = "u-upsert"
    resume_id = "r-upsert"
    filename = "resume.pdf"
    chunks = ["first chunk text", "second chunk text"]

    # Patch index.upsert so we can inspect what is sent to Pinecone
    with patch("main.index.upsert") as mock_upsert:
        returned_ids = upsert_chunks(user_id, resume_id, filename, chunks)

    # Assert chunk_ids format and count
    assert len(returned_ids) == len(chunks)
    assert returned_ids[0] == f"{user_id}::{resume_id}::0"
    assert returned_ids[1] == f"{user_id}::{resume_id}::1"

    # Assert index.upsert called once with the right structure
    mock_upsert.assert_called_once()
    call_args = mock_upsert.call_args.kwargs.get("vectors") or mock_upsert.call_args.args[0]
    # vectors is a list of (id, vector, metadata)
    assert len(call_args) == len(chunks)
    cid0, vec0, meta0 = call_args[0]
    assert cid0 == f"{user_id}::{resume_id}::0"
    assert isinstance(vec0, list)
    assert meta0["filename"] == filename
    assert "first chunk text"[:10] in meta0["text"]

    # Assert metadata persisted in DB
    db = SessionLocal()
    row = db.query(ResumeMeta).filter_by(resume_id=resume_id).first()
    db.close()
    assert row is not None
    assert row.user_id == user_id
    assert row.filename == filename
    saved_ids = json.loads(row.chunk_ids)
    assert saved_ids == returned_ids

def test_chunk_text_overlap():
    text = " ".join(str(i) for i in range(100))
    chunks = chunk_text(text, chunk_size=10, overlap=5)
    assert len(chunks) > 1
    # Check overlap in first two chunks
    first = chunks[0].split()
    second = chunks[1].split()
    assert first[-5:] == second[:5]

@patch("main.PdfReader")
@patch("main.upsert_chunks")
@patch("main.semantic_search_user", return_value=["chunk1", "chunk2"])
@patch("main.ask_llm")
def test_analyze_resume_with_company_location(mock_llm, mock_search, mock_upsert, mock_pdf):
    async def fake_ask_llm(prompt: str):
        return "llm result"
    mock_llm.side_effect = fake_ask_llm
    mock_pdf.return_value.pages = [
        MagicMock(extract_text=MagicMock(return_value="Hello world"))
    ]

    with open(__file__, "rb") as f:
        r = client.post(
            "/analyze/",
            data={
                "user_id": "user1",
                "target_role": "Engineer",
                "company": "Acme",
                "location": "NYC",
            },
            files={"file": ("test.pdf", f, "application/pdf")},
        )
    assert r.status_code == 200
# ---------------- FIXTURES ----------------
@pytest.fixture(autouse=True)
def clear_db():
    """Clear users and resumes before each test"""
    db = SessionLocal()
    db.query(User).delete()
    db.query(ResumeMeta).delete()
    db.commit()
    db.close()
    yield

# ---------------- SIGNUP / LOGIN ----------------
def test_signup_success():
    r = client.post("/signup/", data={
        "email": "a@example.com",
        "user_id": "user1",
        "password": "pass123"
    })
    assert r.status_code == 200
    assert r.json()["message"] == "User created successfully"

def test_signup_failure_existing_user():
    client.post("/signup/", data={
        "email": "a@example.com",
        "user_id": "user1",
        "password": "pass123"
    })
    r = client.post("/signup/", data={
        "email": "a@example.com",
        "user_id": "user1",
        "password": "pass123"
    })
    assert r.status_code == 400

def test_login_success():
    client.post("/signup/", data={"email": "a@example.com", "user_id": "user1", "password": "pass123"})
    r = client.post("/login/", data={"user_id": "user1", "password": "pass123"})
    assert r.status_code == 200
    assert r.json()["user_id"] == "user1"

def test_login_failure_wrong_password():
    client.post("/signup/", data={"email": "a@example.com", "user_id": "user1", "password": "pass123"})
    r = client.post("/login/", data={"user_id": "user1", "password": "wrong"})
    assert r.status_code == 401

# ---------------- CLEANUP OLD RESUMES ----------------
@patch("main.index.delete")
def test_cleanup_old_resumes(mock_delete):
    db = SessionLocal()
    user_id = "user1"
    for i in range(5):
        db.add(ResumeMeta(
            resume_id=f"r{i}",
            user_id=user_id,
            filename=f"f{i}.pdf",
            chunk_ids=json.dumps([f"c{i}"]),
        ))
    db.commit()
    db.close()

    cleanup_old_resumes(user_id, keep_last=3)
    db = SessionLocal()
    remaining = db.query(ResumeMeta).filter(ResumeMeta.user_id == user_id).all()
    db.close()
    assert len(remaining) == 3
    mock_delete.assert_called()  # ensure Pinecone delete was called

# ---------------- RESUME ANALYSIS ----------------
@patch("main.PdfReader")
@patch("main.upsert_chunks")
@patch("main.semantic_search_user", return_value=["text chunk"])
@patch("main.ask_llm")
def test_analyze_resume(mock_llm, mock_search, mock_upsert, mock_pdf):
    # Make ask_llm behave like an async function that returns "llm result"
    async def fake_ask_llm(prompt: str):
        return "llm result"

    mock_llm.side_effect = fake_ask_llm

    # Mock PDF pages
    mock_pdf.return_value.pages = [
        MagicMock(extract_text=MagicMock(return_value="Hello world"))
    ]

    with open(__file__, "rb") as f:
        r = client.post(
            "/analyze/",
            data={"user_id": "user1", "target_role": "Engineer"},
            files={"file": ("test.pdf", f, "application/pdf")},
        )

    assert r.status_code == 200
    # TestClient wraps StreamingResponse as raw bytes; use iter_bytes or content
    text = r.content.decode()
    assert "llm result" in text

# ---------------- WEBSOCKET ROADMAP ----------------
@pytest.mark.asyncio
@patch("main.semantic_search_user", return_value=["snippet1", "snippet2"])
async def test_websocket_roadmap(mock_search):
    """
    Exercise the non-cached path up to the first streamed token/error.

    We don't patch llm.astream, we just validate that the server
    responds with either tokens or an error JSON.
    """
    with client.websocket_connect("/ws/roadmap") as ws:
        ws.send_text(json.dumps({
            "user_id": "user1",
            "target_role": "Engineer",
            "courses": "course1",
            "resume_id": "r1",
        }))

        msg = ws.receive_json()
        # Depending on your local llm, this may be a token or an error
        assert "token" in msg or "error" in msg


def test_websocket_invalid_payload():
    try:
        with client.websocket_connect("/ws/roadmap") as ws:
            ws.send_text(json.dumps({}))
            msg = ws.receive_json()
            assert "error" in msg
    except RuntimeError as e:
        # Allow the double-close error raised by TestClient teardown
        assert 'Cannot call "send" once a close message has been sent.' in str(e)

@pytest.mark.asyncio
@patch("main.semantic_search_user", side_effect=Exception("boom"))
async def test_websocket_roadmap_exception(mock_search):
    with client.websocket_connect("/ws/roadmap") as ws:
        ws.send_text(json.dumps({
            "user_id": "user1",
            "target_role": "Engineer",
            "courses": "course1",
            "resume_id": "r1",
        }))
        msg = ws.receive_json()
        assert "error" in msg
        assert "boom" in msg["error"]

def test_websocket_roadmap_cached():
    payload = {
        "user_id": "user1",
        "target_role": "Engineer",
        "courses": "course1",
        "resume_id": "r1",
    }
    cache_key = get_hash(f"{payload['resume_id']}::{payload['target_role']}::{payload['courses']}")
    CACHE[cache_key] = "line1\nline2"

    try:
        with client.websocket_connect("/ws/roadmap") as ws:
            ws.send_text(json.dumps(payload))
            tokens = []
            while True:
                msg = ws.receive_json()
                if msg.get("done"):
                    break
                tokens.append(msg.get("token"))
            assert any("line1" in t or "line2" in t for t in tokens)
    except RuntimeError as e:
        assert 'Cannot call "send" once a close message has been sent.' in str(e)