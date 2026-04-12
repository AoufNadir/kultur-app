from fastapi.testclient import TestClient


def test_order_total_is_calculated(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/orders",
        headers=auth_headers,
        json={
            "product_name": "Sample product",
            "quantity": 3,
            "unit_price": "10.50",
            "shipping_fee": "4.50",
            "currency": "USD",
        },
    )

    assert response.status_code == 201
    assert response.json()["total_price"] == "36.00"
