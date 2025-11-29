# tests/test_analyze.py
import io

def test_analyze_resume(client):
    # Create fake PDF file
    fake_pdf = io.BytesIO(b"%PDF-1.4 test pdf content")

    r = client.post(
        "/analyze/",
        data={
            "target_role": "Software Engineer",
            "company": "Google",
            "location": "NYC",
            "user_id": "user123",
        },
        files={"file": ("resume.pdf", fake_pdf, "application/pdf")},
        stream=True
    )

    assert r.status_code == 200

    # SSE stream starts with "data:"
    first_chunk = next(r.iter_text()).strip()
    assert first_chunk.startswith("data:")
