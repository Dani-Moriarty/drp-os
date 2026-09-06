$ErrorActionPreference = 'Stop'

$dockerRunDirectory = Join-Path $env:LOCALAPPDATA 'Docker\run'
$staleSocket = Join-Path $dockerRunDirectory 'sailor-ingest.sock'
$startupScript = Join-Path $PSScriptRoot 'start-production-services.ps1'

function Find-DockerDesktop {
  $candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'),
    'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw 'No se encontro Docker Desktop.'
}

function Assert-SafeSocketPath {
  if (-not (Test-Path -LiteralPath $dockerRunDirectory -PathType Container)) {
    throw 'No existe la carpeta temporal de Docker.'
  }

  $resolvedRunDirectory = (Resolve-Path -LiteralPath $dockerRunDirectory).Path
  $expectedSocket = Join-Path $resolvedRunDirectory 'sailor-ingest.sock'
  if (-not $staleSocket.Equals($expectedSocket, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'La ruta del socket temporal no es segura.'
  }
}

Write-Host 'Cerrando Docker Desktop...'
Get-Process -Name 'Docker Desktop', 'com.docker.backend', 'com.docker.build' -ErrorAction SilentlyContinue |
  Stop-Process -Force
Start-Sleep -Seconds 2

Assert-SafeSocketPath
if (Test-Path -LiteralPath $staleSocket) {
  Write-Host 'Eliminando el socket temporal bloqueado...'
  & fsutil.exe reparsepoint delete $staleSocket | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'Windows no permitio desbloquear el socket temporal de Docker.'
  }
  Remove-Item -LiteralPath $staleSocket -Force
}

if (Test-Path -LiteralPath $staleSocket) {
  throw 'El socket temporal de Docker continua presente.'
}

$dockerDesktop = Find-DockerDesktop
Write-Host 'Abriendo Docker Desktop...'
Start-Process -FilePath $dockerDesktop -WindowStyle Hidden

Write-Host 'Esperando a Docker y arrancando los servicios de DRP OS...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $startupScript
if ($LASTEXITCODE -ne 0) {
  throw 'Docker se reparo, pero los servicios de DRP OS no pudieron arrancar.'
}

$health = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/api/health' -TimeoutSec 10
if ($health.status -ne 'UP') {
  throw 'La API no devolvio el estado esperado.'
}

Write-Host 'Docker, SQL Server y Portfolio API estan operativos.' -ForegroundColor Green
