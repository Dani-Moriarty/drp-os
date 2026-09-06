param(
  [switch] $Execute
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'
$containerName = 'daniel-portfolio-sqlserver'

if (-not $Execute) {
  Write-Host 'Simulación: no se ha modificado nada.' -ForegroundColor Yellow
  Write-Host 'Con -Execute se genera una contraseña aleatoria, se rota el login sa,'
  Write-Host 'se actualiza el .env ignorado y se recrea solo el contenedor Express.'
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

function Invoke-Sql([string] $docker, [string] $sql) {
  $command = '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "{0}"' -f $sql
  & $docker exec $containerName /bin/bash -c $command
  if ($LASTEXITCODE -ne 0) { throw 'SQL Server rechazó la operación de rotación.' }
}

function Wait-ForHealthy([string] $docker) {
  $deadline = (Get-Date).AddMinutes(3)
  while ((Get-Date) -lt $deadline) {
    $health = & $docker inspect --format '{{.State.Health.Status}}' $containerName 2>$null
    if ($health -eq 'healthy') { return }
    Start-Sleep -Seconds 3
  }
  throw 'SQL Server Express no alcanzó el estado healthy tras la rotación.'
}

if (-not (Test-Path -LiteralPath $envFile)) { throw 'No existe el archivo .env.' }
$originalContent = [IO.File]::ReadAllText($envFile)
if ($originalContent -notmatch '(?m)^DB_PASSWORD=.+$') {
  throw 'No existe DB_PASSWORD en .env.'
}

$docker = Find-Docker
$randomBytes = [Security.Cryptography.RandomNumberGenerator]::GetBytes(20)
$newPassword = 'Aa1!' + [Convert]::ToHexString($randomBytes)
$escapedPassword = $newPassword.Replace("'", "''")

Set-Location -LiteralPath $projectRoot
try {
  Write-Host '1/4 Preparando el .env local ignorado...'
  $passwordPattern = [regex]::new('(?m)^DB_PASSWORD=.+$')
  $updatedContent = $passwordPattern.Replace($originalContent, "DB_PASSWORD=$newPassword", 1)
  $temporaryFile = Join-Path $projectRoot 'tmp\db-password.env.tmp'
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $temporaryFile) | Out-Null
  [IO.File]::WriteAllText($temporaryFile, $updatedContent, [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporaryFile -Destination $envFile -Force

  Write-Host '2/4 Rotando el login local de SQL Server...'
  try {
    Invoke-Sql $docker "ALTER LOGIN [sa] WITH PASSWORD = N'$escapedPassword'"
  } catch {
    [IO.File]::WriteAllText($envFile, $originalContent, [Text.UTF8Encoding]::new($false))
    throw
  }

  Write-Host '3/4 Recreando Express con el mismo volumen y la nueva variable...'
  & $docker compose up -d --force-recreate database
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo recrear SQL Server Express.' }
  Wait-ForHealthy $docker

  Write-Host '4/4 Verificando la base con la credencial nueva...'
  Invoke-Sql $docker "SELECT DB_NAME(DB_ID(N'portfolio')) AS DatabaseName"
  Write-Host 'Contraseña local rotada. El valor no se ha mostrado ni versionado.' -ForegroundColor Green
} catch {
  Write-Host 'La rotación no terminó. El backup verificado sigue disponible.' -ForegroundColor Red
  throw
} finally {
  $newPassword = $null
  $escapedPassword = $null
}
