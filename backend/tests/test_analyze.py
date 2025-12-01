# tests/test_analyze.py
import io

def test_analyze_resume(client):
    fake_pdf = io.BytesIO(b"%PDF-1.4 test pdf content")

    response = client.post(
        "/analyze/",
        data={
            "target_role": "Software Engineer",
            "company": "Google",
            "location": "NYC",
            "user_id": "user123",
        },
        files={"file": ("resume.pdf", fake_pdf, "application/pdf")}
    )

    assert response.status_code == 200
    text = response.text
    # StreamingResponse content is concatenated
    assert "Starting analysis" in text
    assert "test-output" in text
