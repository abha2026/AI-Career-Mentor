import time

def test_signup_success(client):
    unique_email = f"test_{int(time.time())}@example.com"
    unique_user_id = f"user_{int(time.time())}"

    r = client.post("/signup/", data={
        "email": unique_email,
        "user_id": unique_user_id,
        "password": "1234"
    })
    assert r.status_code == 200

def test_signup_failure_missing_fields(client):
    r = client.post("/signup/", data={"email": "", "user_id": "", "password": ""})
    assert r.status_code == 400

def test_login_failure_invalid_password(client):
    client.post("/signup/", data={"email": "a@test.com", "user_id": "u1", "password": "1234"})
    r = client.post("/login/", data={"user_id": "u1", "password": "wrong"})
    assert r.status_code == 401