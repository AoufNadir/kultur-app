from fastapi.testclient import TestClient


def test_login_and_me(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/auth/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["email"] == "admin@kultur-dz.com"
