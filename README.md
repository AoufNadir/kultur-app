# KULTUR Dashboard

KULTUR Dashboard is a greenfield FastAPI + React web app for replacing the current Google Sheet workflow with a central PostgreSQL-backed system.

## What Is Included

- Backend: FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, JWT auth, role-based access, audit trail, CSV/XLSX import.
- Frontend: React + TypeScript + Vite, Arabic RTL dashboard, module forms/tables, import screen, audit screen.
- Modules: tasks, CRM customers, suppliers, orders, shipments, car listings, wallets, transactions, users, dashboard summaries.
- Local operations: Docker Compose, seeded roles/admin, backup and restore scripts, pytest/Vitest/Playwright scaffolding.

## First Run

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Open `http://localhost:5173`.

Seeded local login:

- Email: `admin@kultur-dz.com`
- Password: `ChangeMe123!`

Backend API docs are available at `http://localhost:8000/docs`.

## Local Development Without Docker

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## Import Flow

1. Export the Google Sheet as CSV or XLSX.
2. Use the import screen to preview headers and sample rows.
3. Provide a JSON column map such as:

```json
{"name":"Customer Name","phone":"Phone","email":"Email","source":"Source","status":"Status"}
```

4. Commit the import and review rejected rows in the import batch response.

Supported import targets in v1 are `customers`, `suppliers`, `tasks`, and `orders`.

## Tests

Backend:

```powershell
cd backend
pytest
```

Frontend:

```powershell
cd frontend
npm test
npm run test:e2e
```

## Backup

See [docs/backup-restore.md](docs/backup-restore.md).
