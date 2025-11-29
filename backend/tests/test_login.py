# tests/test_login.py
def test_login_success(client):
    # First, create user
    client.post("/signup/", data={
        "email": "b@test.com",
        "user_id": "loginuser",
        "password": "pass"
    })

    r = client.post("/login/", data={
        "user_id": "loginuser",
        "password": "pass"
    })
    assert r.status_code == 200
    assert "Login successful" in r.json()["message"]
