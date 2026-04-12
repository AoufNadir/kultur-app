"""add order board fields

Revision ID: 0002_order_board_fields
Revises: 0001_initial
Create Date: 2026-04-11
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_order_board_fields"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("assigned_to_id", sa.Integer(), nullable=True))
    op.add_column("orders", sa.Column("priority", sa.String(length=40), server_default="عادية", nullable=False))
    op.add_column("orders", sa.Column("current_location", sa.String(length=120), server_default="لم تحدد", nullable=False))
    op.create_index(op.f("ix_orders_assigned_to_id"), "orders", ["assigned_to_id"], unique=False)
    op.create_index(op.f("ix_orders_priority"), "orders", ["priority"], unique=False)
    op.create_index(op.f("ix_orders_current_location"), "orders", ["current_location"], unique=False)
    op.create_foreign_key(
        op.f("fk_orders_assigned_to_id_users"),
        "orders",
        "users",
        ["assigned_to_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(op.f("fk_orders_assigned_to_id_users"), "orders", type_="foreignkey")
    op.drop_index(op.f("ix_orders_current_location"), table_name="orders")
    op.drop_index(op.f("ix_orders_priority"), table_name="orders")
    op.drop_index(op.f("ix_orders_assigned_to_id"), table_name="orders")
    op.drop_column("orders", "current_location")
    op.drop_column("orders", "priority")
    op.drop_column("orders", "assigned_to_id")
