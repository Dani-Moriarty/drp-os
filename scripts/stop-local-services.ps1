$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot

foreach ($port in @(4200, 8080)) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -ErrorAction SilentlyContinue }
}

$docker = Get-Command docker.exe -ErrorAction SilentlyContinue
if (-not $docker) {
  $candidate = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'
  if (Test-Path -LiteralPath $candidate) { $docker = Get-Item -LiteralPath $candidate }
}

if ($docker) {
  Set-Location -LiteralPath $projectRoot
  & $docker.FullName compose down
}

Write-Host 'Servicios locales detenidos.' -ForegroundColor Green
