# Acceptance Checklist

- Login succeeds with the seeded admin account.
- Dashboard summary loads counts, wallet balances, order totals, and latest audit rows.
- A task can be created, edited, searched, and deleted.
- A customer, supplier, order, shipment, car listing, wallet, and transaction can be created from the UI.
- Order total equals `quantity * unit_price + shipping_fee`.
- An income transaction increases a wallet balance, and an expense transaction decreases it.
- CSV/XLSX preview shows headers and sample rows.
- CSV/XLSX commit writes supported target rows and records rejected rows in the import batch.
- Audit log records create, update, delete, import, and wallet balance events.
