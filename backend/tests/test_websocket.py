# tests/test_websocket.py
import json
import pytest

from unittest.mock import patch

def test_websocket_roadmap(client):
    payload = {
        "target_role": "Data Scientist",
        "courses": "Course A, Course B",
        "user_id": "u1",
        "resume_id": "r1"
    }

    with patch("main.WebSocket.close", return_value=None):
        with client.websocket_connect("/ws/roadmap") as ws:
            ws.send_text(json.dumps(payload))
            msg = ws.receive_json()
            assert "token" in msg or "done" in msg or "error" in msg
            if "token" in msg:
                assert "test-output" in msg["token"]


def test_websocket_invalid_payload(client):
    with client.websocket_connect("/ws/roadmap") as ws:
        ws.send_text(json.dumps({}))  # empty payload
        msg = ws.receive_json()
        assert "error" in msg