param(
  [string] $DestinationDirectory = ''
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backupRoot = if ($DestinationDirectory) {
  [System.IO.Path]::GetFullPath($DestinationDirectory)
} else {
  Join-Path $projectRoot 'backups'
}
$containerName = 'daniel-portfolio-sqlserver'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fileName = "portfolio-$timestamp.bak"
$containerFile = "/var/opt/mssql/backup/$fileName"
$hostFile = Join-Path $backupRoot $fileName

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

$docker = Find-Docker
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

& $docker inspect $containerName *> $null
if ($LASTEXITCODE -ne 0) {
  throw "El contenedor $containerName no está disponible."
}

& $docker exec $containerName mkdir -p /var/opt/mssql/backup
if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar la carpeta de backup.' }

$backupSql = "BACKUP DATABASE [portfolio] TO DISK = N'$containerFile' WITH COPY_ONLY, INIT, CHECKSUM"
$backupCommand = '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "{0}"' -f $backupSql
& $docker exec $containerName /bin/bash -c $backupCommand
if ($LASTEXITCODE -ne 0) { throw 'SQL Server no pudo crear el backup.' }

& $docker cp "${containerName}:${containerFile}" $hostFile
if ($LASTEXITCODE -ne 0) { throw 'No se pudo copiar el backup al equipo.' }

$verifySql = "RESTORE VERIFYONLY FROM DISK = N'$containerFile' WITH CHECKSUM"
$verifyCommand = '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "{0}"' -f $verifySql
& $docker exec $containerName /bin/bash -c $verifyCommand
if ($LASTEXITCODE -ne 0) { throw 'La verificación del backup ha fallado.' }

Write-Host "Backup creado y verificado: $hostFile" -ForegroundColor Green
Write-Output $hostFile
