from fastapi.testclient import TestClient


def test_csv_preview_and_commit_customers(client: TestClient, auth_headers: dict[str, str]) -> None:
    csv_bytes = "name,phone,email,source,status\nAli,0555,ali@example.com,Instagram,lead\n".encode()

    preview = client.post(
        "/imports/preview",
        headers=auth_headers,
        files={"file": ("customers.csv", csv_bytes, "text/csv")},
        data={"max_rows": "5"},
    )
    assert preview.status_code == 200
    assert preview.json()["headers"] == ["name", "phone", "email", "source", "status"]

    commit = client.post(
        "/imports/commit",
        headers=auth_headers,
        files={"file": ("customers.csv", csv_bytes, "text/csv")},
        data={
            "target_module": "customers",
            "column_map": '{"name":"name","phone":"phone","email":"email","source":"source","status":"status"}',
        },
    )
    assert commit.status_code == 200
    assert commit.json()["successful_rows"] == 1
    assert commit.json()["failed_rows"] == 0
