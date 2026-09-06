param(
  [string] $PublicSiteUrl = 'https://danielramonperez.com',
  [string] $LocalApiUrl = 'http://127.0.0.1:8080',
  [switch] $NoBrowser
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
  $activation = Invoke-RestMethod `
    -Method Post `
    -Uri "$($LocalApiUrl.TrimEnd('/'))/api/message-board/admin/activation" `
    -Headers @{ 'X-Message-Board-Admin-Key' = $adminKey }

  if (-not $activation.code) {
    throw 'El backend no devolvió una activación válida.'
  }

  $activationUrl = "$($PublicSiteUrl.TrimEnd('/'))/#message-board-admin=$([Uri]::EscapeDataString($activation.code))"
  if (-not $NoBrowser) {
    Start-Process $activationUrl
    Write-Host 'Sesión de administrador preparada. Completa la activación en la ventana del navegador que se ha abierto.' -ForegroundColor Green
  } else {
    Write-Host 'Activación generada correctamente.' -ForegroundColor Green
  }
} finally {
  $adminKey = $null
  $activation = $null
  $activationUrl = $null
}
