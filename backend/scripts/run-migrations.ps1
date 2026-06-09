# Run all SQL migrations in order against PostgreSQL.
# Usage (PowerShell):
#   $env:PGPASSWORD = "your_password"
#   .\backend\scripts\run-migrations.ps1 -DbName bpo_crm -DbUser postgres -DbHost localhost

param(
    [string]$DbName = "bpo_crm",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$migrationsDir = Join-Path $root "migrations"

$files = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name

if ($files.Count -eq 0) {
    Write-Error "No migration files found in $migrationsDir"
}

Write-Host "Running $($files.Count) migrations on $DbName @ $DbHost`:$DbPort ..." -ForegroundColor Cyan

foreach ($file in $files) {
    Write-Host "  -> $($file.Name)" -ForegroundColor Yellow
    & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -f $file.FullName
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Migration failed: $($file.Name)"
    }
}

Write-Host "All migrations completed." -ForegroundColor Green
