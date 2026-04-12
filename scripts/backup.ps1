param(
  [string]$OutDir = "backups"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $OutDir "kultur-$timestamp.sql"

docker compose exec -T db pg_dump -U postgres kultur | Set-Content -Encoding UTF8 -Path $target
Write-Host "Backup written to $target"
