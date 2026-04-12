"""add accounting and workflow links

Revision ID: 0003_accounting_links
Revises: 0002_order_board_fields
Create Date: 2026-04-12
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_accounting_links"
down_revision = "0002_order_board_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("to_wallet_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_transactions_to_wallet_id"), "transactions", ["to_wallet_id"], unique=False)
    op.create_foreign_key(
        op.f("fk_transactions_to_wallet_id_wallets"),
        "transactions",
        "wallets",
        ["to_wallet_id"],
        ["id"],
    )

    op.add_column("tasks", sa.Column("order_id", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("customer_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_tasks_order_id"), "tasks", ["order_id"], unique=False)
    op.create_index(op.f("ix_tasks_customer_id"), "tasks", ["customer_id"], unique=False)
    op.create_foreign_key(op.f("fk_tasks_order_id_orders"), "tasks", "orders", ["order_id"], ["id"])
    op.create_foreign_key(
        op.f("fk_tasks_customer_id_customers"),
        "tasks",
        "customers",
        ["customer_id"],
        ["id"],
    )

    op.add_column("car_listings", sa.Column("customer_id", sa.Integer(), nullable=True))
    op.add_column("car_listings", sa.Column("order_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_car_listings_customer_id"), "car_listings", ["customer_id"], unique=False)
    op.create_index(op.f("ix_car_listings_order_id"), "car_listings", ["order_id"], unique=False)
    op.create_foreign_key(
        op.f("fk_car_listings_customer_id_customers"),
        "car_listings",
        "customers",
        ["customer_id"],
        ["id"],
    )
    op.create_foreign_key(
        op.f("fk_car_listings_order_id_orders"),
        "car_listings",
        "orders",
        ["order_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(op.f("fk_car_listings_order_id_orders"), "car_listings", type_="foreignkey")
    op.drop_constraint(op.f("fk_car_listings_customer_id_customers"), "car_listings", type_="foreignkey")
    op.drop_index(op.f("ix_car_listings_order_id"), table_name="car_listings")
    op.drop_index(op.f("ix_car_listings_customer_id"), table_name="car_listings")
    op.drop_column("car_listings", "order_id")
    op.drop_column("car_listings", "customer_id")

    op.drop_constraint(op.f("fk_tasks_customer_id_customers"), "tasks", type_="foreignkey")
    op.drop_constraint(op.f("fk_tasks_order_id_orders"), "tasks", type_="foreignkey")
    op.drop_index(op.f("ix_tasks_customer_id"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_order_id"), table_name="tasks")
    op.drop_column("tasks", "customer_id")
    op.drop_column("tasks", "order_id")

    op.drop_constraint(op.f("fk_transactions_to_wallet_id_wallets"), "transactions", type_="foreignkey")
    op.drop_index(op.f("ix_transactions_to_wallet_id"), table_name="transactions")
    op.drop_column("transactions", "to_wallet_id")
