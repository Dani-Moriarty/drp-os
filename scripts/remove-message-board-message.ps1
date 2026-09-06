param(
  [Parameter(Mandatory = $true)]
  [ValidateRange(2, [long]::MaxValue)]
  [long] $MessageId
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'

if (-not (Test-Path -LiteralPath $envFile)) {
  throw 'No existe el archivo .env local.'
}

$adminLine = [IO.File]::ReadAllLines($envFile) |
  Where-Object { $_.StartsWith('MESSAGE_BOARD_ADMIN_KEY=', [StringComparison]::Ordinal) } |
  Select-Object -Last 1

if (-not $adminLine) {
  throw 'Falta MESSAGE_BOARD_ADMIN_KEY en el archivo .env.'
}

$adminKey = $adminLine.Substring('MESSAGE_BOARD_ADMIN_KEY='.Length).Trim()
if ($adminKey.Length -lt 32) {
  throw 'MESSAGE_BOARD_ADMIN_KEY no está configurada con un valor seguro.'
}

try {
  Invoke-RestMethod `
    -Method Delete `
    -Uri "http://127.0.0.1:8080/api/message-board/messages/$MessageId" `
    -Headers @{ 'X-Message-Board-Admin-Key' = $adminKey }
  Write-Host "Mensaje #$MessageId eliminado." -ForegroundColor Green
} finally {
  $adminKey = $null
}
