param(
  [switch] $Execute
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backupScript = Join-Path $PSScriptRoot 'backup-database.ps1'
$containerName = 'daniel-portfolio-sqlserver'

if (-not $Execute) {
  Write-Host 'Simulación: no se ha modificado nada.' -ForegroundColor Yellow
  Write-Host 'El proceso creará y verificará un backup, conservará el volumen Developer antiguo,'
  Write-Host 'arrancará un volumen nuevo con SQL Server Express y restaurará la base portfolio.'
  Write-Host 'Ejecuta de nuevo con -Execute cuando quieras realizar la migración.'
  exit 0
}

function Find-Docker {
  $command = Get-Command docker.exe -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  foreach ($path in @(
    'C:\Program Files\Docker\Docker\resources\bin\docker.exe',
    (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe')
  )) {
    if (Test-Path -LiteralPath $path) { return $path }
  }
  throw 'No se encontró docker.exe.'
}

function Wait-ForHealthy([string] $docker) {
  $deadline = (Get-Date).AddMinutes(3)
  while ((Get-Date) -lt $deadline) {
    $health = & $docker inspect --format '{{.State.Health.Status}}' $containerName 2>$null
    if ($health -eq 'healthy') { return }
    Start-Sleep -Seconds 3
  }
  throw 'SQL Server Express no alcanzó el estado healthy.'
}

$docker = Find-Docker
Set-Location -LiteralPath $projectRoot

Write-Host '1/5 Creando backup verificable de SQL Server Developer...'
$backupFile = & $backupScript | Select-Object -Last 1
if (-not (Test-Path -LiteralPath $backupFile)) { throw 'No se encontró el backup esperado.' }

Write-Host '2/5 Deteniendo el contenedor Developer (su volumen se conserva)...'
& $docker compose down
if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener el entorno Developer.' }

try {
  Write-Host '3/5 Arrancando SQL Server Express en un volumen nuevo...'
  & $docker compose up -d database
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo arrancar SQL Server Express.' }
  Wait-ForHealthy $docker

  $backupName = Split-Path -Leaf $backupFile
  $containerBackup = "/var/opt/mssql/backup/$backupName"
  & $docker exec $containerName mkdir -p /var/opt/mssql/backup
  & $docker cp $backupFile "${containerName}:${containerBackup}"
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo copiar el backup al contenedor Express.' }

  Write-Host '4/5 Restaurando portfolio en SQL Server Express...'
  $restoreSql = "RESTORE DATABASE [portfolio] FROM DISK = N'$containerBackup' WITH MOVE N'portfolio' TO N'/var/opt/mssql/data/portfolio.mdf', MOVE N'portfolio_log' TO N'/var/opt/mssql/data/portfolio_log.ldf', REPLACE, CHECKSUM"
  $restoreCommand = '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "{0}"' -f $restoreSql
  & $docker exec $containerName /bin/bash -c $restoreCommand
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo restaurar portfolio en Express.' }

  Write-Host '5/5 Verificando edición y datos...'
  $checkSql = "SELECT SERVERPROPERTY('Edition') AS Edition; SELECT COUNT(*) AS Profiles FROM portfolio.dbo.profiles;"
  $checkCommand = '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "{0}"' -f $checkSql
  & $docker exec $containerName /bin/bash -c $checkCommand
  if ($LASTEXITCODE -ne 0) { throw 'La verificación final de Express ha fallado.' }

  Write-Host 'Migración completada. El volumen Developer anterior permanece intacto para recuperación.' -ForegroundColor Green
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host 'El backup y el volumen Developer original siguen conservados.' -ForegroundColor Yellow
  throw
}
