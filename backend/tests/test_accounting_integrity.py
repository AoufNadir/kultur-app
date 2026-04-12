from fastapi.testclient import TestClient


def _wallet_by_name(client: TestClient, headers: dict[str, str], name: str) -> dict:
    response = client.get("/accounting/wallets", headers=headers)
    assert response.status_code == 200
    return next(row for row in response.json() if row["name"] == name)


def _order_by_id(client: TestClient, headers: dict[str, str], order_id: int) -> dict:
    response = client.get("/orders", headers=headers)
    assert response.status_code == 200
    return next(row for row in response.json() if row["id"] == order_id)


def test_order_payments_update_wallet_and_order_totals(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    wallet = client.post(
        "/accounting/wallets",
        headers=auth_headers,
        json={"name": "USD Cash", "currency": "USD", "balance": "0"},
    ).json()
    order = client.post(
        "/orders",
        headers=auth_headers,
        json={"product_name": "Paid order", "quantity": 1, "unit_price": "100", "currency": "USD"},
    ).json()

    income = client.post(
        "/accounting/transactions",
        headers=auth_headers,
        json={
            "wallet_id": wallet["id"],
            "type": "income",
            "amount": "40",
            "currency": "USD",
            "occurred_at": "2026-04-12",
            "related_order_id": order["id"],
        },
    )
    assert income.status_code == 201

    expense = client.post(
        "/accounting/transactions",
        headers=auth_headers,
        json={
            "wallet_id": wallet["id"],
            "type": "expense",
            "amount": "10",
            "currency": "USD",
            "occurred_at": "2026-04-12",
            "related_order_id": order["id"],
        },
    )
    assert expense.status_code == 201

    updated_wallet = _wallet_by_name(client, auth_headers, "USD Cash")
    assert updated_wallet["balance"] == "30.00"
    updated_order = _order_by_id(client, auth_headers, order["id"])
    assert updated_order["paid_amount"] == "40.00"
    assert updated_order["expense_amount"] == "10.00"
    assert updated_order["remaining_amount"] == "60.00"
    assert updated_order["payment_status"] == "مدفوع جزئيا"


def test_transfer_moves_money_between_same_currency_wallets(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    source = client.post(
        "/accounting/wallets",
        headers=auth_headers,
        json={"name": "USDT Source", "currency": "USDT", "balance": "100"},
    ).json()
    target = client.post(
        "/accounting/wallets",
        headers=auth_headers,
        json={"name": "USDT Target", "currency": "USDT", "balance": "0"},
    ).json()

    transfer = client.post(
        "/accounting/transactions",
        headers=auth_headers,
        json={
            "wallet_id": source["id"],
            "to_wallet_id": target["id"],
            "type": "transfer",
            "amount": "25",
            "currency": "USDT",
            "occurred_at": "2026-04-12",
        },
    )

    assert transfer.status_code == 201
    assert _wallet_by_name(client, auth_headers, "USDT Source")["balance"] == "75.00"
    assert _wallet_by_name(client, auth_headers, "USDT Target")["balance"] == "25.00"


def test_rejects_invalid_accounting_links(client: TestClient, auth_headers: dict[str, str]) -> None:
    usd = client.post(
        "/accounting/wallets",
        headers=auth_headers,
        json={"name": "USD Wallet", "currency": "USD", "balance": "0"},
    ).json()
    dzd = client.post(
        "/accounting/wallets",
        headers=auth_headers,
        json={"name": "DZD Wallet", "currency": "DZD", "balance": "0"},
    ).json()
    order = client.post(
        "/orders",
        headers=auth_headers,
        json={"product_name": "DZD order", "quantity": 1, "unit_price": "100", "currency": "DZD"},
    ).json()

    zero_amount = client.post(
        "/accounting/transactions",
        headers=auth_headers,
        json={
            "wallet_id": usd["id"],
            "type": "income",
            "amount": "0",
            "currency": "USD",
            "occurred_at": "2026-04-12",
        },
    )
    assert zero_amount.status_code == 422

    cross_currency_transfer = client.post(
        "/accounting/transactions",
        headers=auth_headers,
        json={
            "wallet_id": usd["id"],
            "to_wallet_id": dzd["id"],
            "type": "transfer",
            "amount": "10",
            "currency": "USD",
            "occurred_at": "2026-04-12",
        },
    )
    assert cross_currency_transfer.status_code == 400

    mismatched_order = client.post(
        "/accounting/transactions",
        headers=auth_headers,
        json={
            "wallet_id": usd["id"],
            "type": "income",
            "amount": "10",
            "currency": "USD",
            "occurred_at": "2026-04-12",
            "related_order_id": order["id"],
        },
    )
    assert mismatched_order.status_code == 400


def test_blocks_deleting_linked_wallets_and_orders(client: TestClient, auth_headers: dict[str, str]) -> None:
    wallet = client.post(
        "/accounting/wallets",
        headers=auth_headers,
        json={"name": "Locked Wallet", "currency": "USD", "balance": "0"},
    ).json()
    order = client.post(
        "/orders",
        headers=auth_headers,
        json={"product_name": "Locked order", "quantity": 1, "unit_price": "100", "currency": "USD"},
    ).json()
    transaction = client.post(
        "/accounting/transactions",
        headers=auth_headers,
        json={
            "wallet_id": wallet["id"],
            "type": "income",
            "amount": "10",
            "currency": "USD",
            "occurred_at": "2026-04-12",
            "related_order_id": order["id"],
        },
    )
    assert transaction.status_code == 201

    delete_wallet = client.delete(f"/accounting/wallets/{wallet['id']}", headers=auth_headers)
    assert delete_wallet.status_code == 400

    delete_order = client.delete(f"/orders/{order['id']}", headers=auth_headers)
    assert delete_order.status_code == 400
