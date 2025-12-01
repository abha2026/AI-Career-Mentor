# tests/test_login.py
import hashlib
from unittest.mock import MagicMock, patch

def test_login_success(client):
    # Fake user with correct password hash
    fake_user = MagicMock()
    fake_user.user_id = "loginuser"
    fake_user.email = "login@test.com"
    fake_user.password_hash = hashlib.sha256("pass".encode()).hexdigest()

    # Patch SessionLocal to return fake user
    with patch("main.SessionLocal") as mock_session:
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = fake_user
        mock_session.return_value = mock_db

        r = client.post("/login/", data={
            "user_id": "loginuser",
            "password": "pass"
        })
        assert r.status_code == 200
        assert r.json()["user_id"] == "loginuser"
        assert r.json()["email"] == "login@test.com"
