param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

Get-Content -Raw -LiteralPath $BackupFile | docker compose exec -T db psql -U postgres -d kultur
Write-Host "Restore completed from $BackupFile"
