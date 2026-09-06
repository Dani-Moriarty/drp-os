$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$logsPath = Join-Path $projectRoot 'logs'
$envFile = Join-Path $projectRoot '.env'
$envExample = Join-Path $projectRoot '.env.example'
$backendRunner = Join-Path $PSScriptRoot 'run-backend.ps1'
$frontendRunner = Join-Path $PSScriptRoot 'run-frontend.ps1'

function Write-Step([string] $message) {
  Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Test-Url([string] $url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Wait-ForUrl([string] $url, [string] $serviceName, [int] $timeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Url $url) {
      Write-Host "$serviceName listo." -ForegroundColor Green
      return
    }
    Start-Sleep -Seconds 2
  }
  throw "$serviceName no respondió a tiempo. Revisa los archivos de la carpeta logs."
}

function Find-Docker {
  $command = Get-Command docker.exe -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $usualPath = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
  if (Test-Path -LiteralPath $usualPath) {
    return $usualPath
  }

  $userPath = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'
  if (Test-Path -LiteralPath $userPath) {
    return $userPath
  }

  throw 'No se encontró Docker. Instala o abre Docker Desktop y vuelve a intentarlo.'
}

function Wait-ForDocker([string] $dockerCommand) {
  $deadline = (Get-Date).AddMinutes(2)
  while ((Get-Date) -lt $deadline) {
    & $dockerCommand info *> $null
    if ($LASTEXITCODE -eq 0) {
      return
    }
    Start-Sleep -Seconds 3
  }
  throw 'Docker Desktop no terminó de arrancar antes de dos minutos.'
}

try {
  Set-Location -LiteralPath $projectRoot
  New-Item -ItemType Directory -Force -Path $logsPath | Out-Null

  if (-not (Test-Path -LiteralPath $envFile)) {
    if (-not (Test-Path -LiteralPath $envExample)) {
      throw 'No existe .env ni .env.example en el proyecto.'
    }
    Copy-Item -LiteralPath $envExample -Destination $envFile
  }

  $configuredPassword = Get-Content -LiteralPath $envFile |
    Where-Object { $_ -match '^DB_PASSWORD=' } |
    Select-Object -First 1
  if ($configuredPassword -eq 'DB_PASSWORD=REPLACE_WITH_A_UNIQUE_STRONG_PASSWORD') {
    throw 'Edita .env y sustituye DB_PASSWORD por una contraseña local única antes de arrancar.'
  }

  Write-Step 'Preparando Docker y SQL Server'
  $dockerCommand = Find-Docker
  & $dockerCommand info *> $null
  if ($LASTEXITCODE -ne 0) {
    $dockerDesktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    if (-not (Test-Path -LiteralPath $dockerDesktop)) {
      $dockerDesktop = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'
    }
    if (-not (Test-Path -LiteralPath $dockerDesktop)) {
      throw 'Docker Desktop está cerrado y no se encontró su ejecutable.'
    }
    Start-Process -FilePath $dockerDesktop -WindowStyle Hidden
    Wait-ForDocker $dockerCommand
  }

  & $dockerCommand compose up -d database database-init
  if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo arrancar SQL Server con Docker Compose.'
  }

  if (-not (Test-Url 'http://localhost:8080/api/portfolio')) {
    Write-Step 'Arrancando el backend'
    Start-Process powershell.exe `
      -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $backendRunner) `
      -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $logsPath 'backend.out.log') `
      -RedirectStandardError (Join-Path $logsPath 'backend.err.log')
  } else {
    Write-Host 'El backend ya estaba funcionando.' -ForegroundColor Green
  }

  if (-not (Test-Url 'http://localhost:4200/')) {
    Write-Step 'Arrancando el frontend'
    Start-Process powershell.exe `
      -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $frontendRunner) `
      -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $logsPath 'frontend.out.log') `
      -RedirectStandardError (Join-Path $logsPath 'frontend.err.log')
  } else {
    Write-Host 'El frontend ya estaba funcionando.' -ForegroundColor Green
  }

  Write-Step 'Esperando a que todo esté listo'
  Wait-ForUrl 'http://localhost:8080/api/portfolio' 'Backend' 180
  Wait-ForUrl 'http://localhost:4200/' 'Frontend' 120

  Write-Host "`nPortfolio listo: http://localhost:4200/" -ForegroundColor Green
  Start-Process 'http://localhost:4200/'
  Start-Sleep -Seconds 2
} catch {
  Write-Host "`nNo se pudo arrancar el portfolio:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host "`nPulsa cualquier tecla para cerrar esta ventana."
  $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
  exit 1
}
