# # tests/test_auth.py
# def test_signup_success(client):
#     response = client.post("/signup/", data={
#         "email": "a@b.com",
#         "user_id": "user1",
#         "password": "pass"
#     })
#     assert response.status_code == 200
#     assert "User created" in response.json()["message"]


# def test_signup_existing_user(client):
#     # Fake user exists
#     response1 = client.post("/signup/", data={
#         "email": "a@b.com",
#         "user_id": "user1",
#         "password": "pass"
#     })
#     response2 = client.post("/signup/", data={
#         "email": "a@b.com",
#         "user_id": "user1",
#         "password": "pass"
#     })
#     assert response2.status_code == 400


# def test_login_success(client):
#     # sign up first
#     client.post("/signup/", data={
#         "email": "a@b.com",
#         "user_id": "user123",
#         "password": "pass"
#     })
#     # then login
#     res = client.post("/login/", data={
#         "user_id": "user123",
#         "password": "pass"
#     })
#     assert res.status_code == 200
#     assert "Login successful" in res.json()["message"]


# def test_login_fail(client):
#     res = client.post("/login/", data={
#         "user_id": "nope",
#         "password": "pass"
#     })
#     assert res.status_code == 401
