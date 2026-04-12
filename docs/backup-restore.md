# Backup And Restore

Use the PowerShell helpers from the repository root after `docker compose up` has started PostgreSQL.

## Backup

```powershell
.\scripts\backup.ps1
```

Backups are written to `backups/kultur-<timestamp>.sql`.

## Restore

```powershell
.\scripts\restore.ps1 -BackupFile .\backups\kultur-YYYYMMDD-HHMMSS.sql
```

Restoring writes into the `kultur` database in the running `db` service.
