# tests/test_signup.py
def test_signup_success(client):
    r = client.post("/signup/", data={
        "email": "a@test.com",
        "user_id": "testuser",
        "password": "1234"
    })
    assert r.status_code == 200
    assert r.json()["message"] == "User created successfully"
