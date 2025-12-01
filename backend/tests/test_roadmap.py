# tests/test_roadmap.py
import json
from fastapi.testclient import TestClient

def test_websocket_roadmap(client):
    payload = {
        "target_role": "Data Scientist",
        "courses": "Course A, Course B",
        "user_id": "u1",
        "resume_id": "r1"
    }

    with client.websocket_connect("/ws/roadmap") as ws:
        ws.send_text(json.dumps(payload))
        msg = ws.receive_json()

        # The mocked LLM returns "test-output"
        assert "token" in msg
        assert "test-output" in msg["token"]
