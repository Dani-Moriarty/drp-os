param(
  [switch] $FromClipboard
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$cloudflared = Join-Path $projectRoot '.tools\cloudflared\cloudflared.exe'

function Clear-LocalClipboard {
  try {
    # Windows PowerShell 5.1 rejects an empty string as a clipboard value.
    Set-Clipboard -Value ' '
  } catch {
    Write-Warning 'No se pudo vaciar el portapapeles automáticamente. Copia cualquier texto no sensible al terminar.'
  }
}

if (-not (Test-Path -LiteralPath $cloudflared)) {
  throw 'No se encontró .tools\cloudflared\cloudflared.exe.'
}

$principal = New-Object Security.Principal.WindowsPrincipal(
  [Security.Principal.WindowsIdentity]::GetCurrent()
)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Abre PowerShell como administrador y vuelve a ejecutar este script.'
}

$pointer = [IntPtr]::Zero
$clipboardContent = $null
try {
  if ($FromClipboard) {
    $clipboardContent = Get-Clipboard -Raw
    if ($clipboardContent -notmatch '(?i)\bservice\s+install\s+(?<token>\S+)') {
      throw 'El portapapeles no contiene el comando "cloudflared service install ..." de Cloudflare.'
    }
    $token = $Matches.token.Trim()
    Clear-LocalClipboard
  } else {
    Write-Host 'Pega aquí el token del túnel. No se guardará en el proyecto ni se mostrará en pantalla.'
    $secureToken = Read-Host -AsSecureString 'Token de Cloudflare Tunnel'
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }

  if ([string]::IsNullOrWhiteSpace($token)) {
    throw 'El token está vacío.'
  }
  & $cloudflared service install $token
  if ($LASTEXITCODE -ne 0) {
    throw 'Cloudflare no pudo instalar el servicio.'
  }
  Write-Host 'Servicio cloudflared instalado.' -ForegroundColor Green
} finally {
  if ($pointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
  if ($FromClipboard) {
    Clear-LocalClipboard
  }
  $clipboardContent = $null
  $secureToken = $null
  $token = $null
}
