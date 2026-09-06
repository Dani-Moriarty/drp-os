$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$logsPath = Join-Path $projectRoot 'logs'
$backendRunner = Join-Path $PSScriptRoot 'run-backend-production.ps1'
$startupLog = Join-Path $logsPath 'production-startup.log'

function Write-StartupLog([string] $message) {
  $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $message
  Add-Content -LiteralPath $startupLog -Value $line -Encoding utf8
}

function Find-Docker {
  $command = Get-Command docker.exe -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $candidates = @(
    'C:\Program Files\Docker\Docker\resources\bin\docker.exe',
    (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe')
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  throw 'No se encontró docker.exe.'
}

function Test-Url([string] $url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 3
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Wait-ForDocker([string] $dockerCommand) {
  $deadline = (Get-Date).AddMinutes(3)
  while ((Get-Date) -lt $deadline) {
    & $dockerCommand info *> $null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 4
  }
  throw 'Docker Desktop no respondió antes de tres minutos.'
}

function Wait-ForDatabase([string] $dockerCommand) {
  $deadline = (Get-Date).AddMinutes(3)
  while ((Get-Date) -lt $deadline) {
    $health = & $dockerCommand inspect daniel-portfolio-sqlserver `
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>$null
    if ($LASTEXITCODE -eq 0 -and $health -eq 'healthy') { return }
    Start-Sleep -Seconds 4
  }
  throw 'SQL Server no alcanzó el estado healthy antes de tres minutos.'
}

try {
  New-Item -ItemType Directory -Force -Path $logsPath | Out-Null
  Set-Location -LiteralPath $projectRoot
  Write-StartupLog 'Iniciando servicios locales de producción.'

  $docker = Find-Docker
  & $docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    $dockerDesktop = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'
    if (-not (Test-Path -LiteralPath $dockerDesktop)) {
      $dockerDesktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    }
    if (-not (Test-Path -LiteralPath $dockerDesktop)) {
      throw 'No se encontró Docker Desktop.'
    }
    Start-Process -FilePath $dockerDesktop -WindowStyle Hidden
    Wait-ForDocker $docker
  }
  Write-StartupLog 'Docker disponible.'

  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $composeOutput = & $docker compose up -d database database-init 2>&1
  $composeExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorPreference
  $composeOutput | Set-Content -LiteralPath (Join-Path $logsPath 'database-startup.log') -Encoding utf8
  if ($composeExitCode -ne 0) { throw 'Docker Compose no pudo arrancar SQL Server.' }
  Wait-ForDatabase $docker
  Write-StartupLog 'SQL Server Express healthy.'

  if (Test-Url 'http://127.0.0.1:8080/health') {
    Write-StartupLog 'Spring Boot ya estaba disponible.'
    exit 0
  }

  Start-Process powershell.exe `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $backendRunner) `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logsPath 'backend-production.out.log') `
    -RedirectStandardError (Join-Path $logsPath 'backend-production.err.log')

  $deadline = (Get-Date).AddMinutes(2)
  while ((Get-Date) -lt $deadline) {
    if (Test-Url 'http://127.0.0.1:8080/health') {
      Write-StartupLog 'Spring Boot disponible en 127.0.0.1:8080.'
      exit 0
    }
    Start-Sleep -Seconds 3
  }
  throw 'Spring Boot no respondió antes de dos minutos.'
} catch {
  New-Item -ItemType Directory -Force -Path $logsPath | Out-Null
  Write-StartupLog ('ERROR: ' + $_.Exception.Message)
  exit 1
}
