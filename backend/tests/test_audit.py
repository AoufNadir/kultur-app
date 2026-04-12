from fastapi.testclient import TestClient


def test_create_task_writes_audit_log(client: TestClient, auth_headers: dict[str, str]) -> None:
    task = client.post(
        "/tasks",
        headers=auth_headers,
        json={"title": "Call supplier", "status": "open", "priority": "high"},
    )
    assert task.status_code == 201

    audit = client.get("/audit", headers=auth_headers)
    assert audit.status_code == 200
    assert any(row["entity_type"] == "Task" and row["action"] == "create" for row in audit.json())
