param(
  [switch] $Remove
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$startupScript = Join-Path $PSScriptRoot 'start-production-services.ps1'
$startupDirectory = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup)
$shortcutPath = Join-Path $startupDirectory 'Daniel Portfolio Backend.lnk'

if ($Remove) {
  if (Test-Path -LiteralPath $shortcutPath) {
    Remove-Item -LiteralPath $shortcutPath -Force
  }
  Write-Host 'Arranque automático eliminado.' -ForegroundColor Green
  exit 0
}

if (-not (Test-Path -LiteralPath $startupScript)) {
  throw "No se encontró $startupScript"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = (Get-Command powershell.exe).Source
$shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $startupScript
$shortcut.WorkingDirectory = $projectRoot
$shortcut.WindowStyle = 7
$shortcut.Description = 'Arranca Docker, SQL Server Express y el backend del portfolio.'
$shortcut.Save()

Write-Host "Arranque automático instalado: $shortcutPath" -ForegroundColor Green
