param(
  [switch] $FromClipboard
)

$ErrorActionPreference = 'Stop'

$raizProyecto = Split-Path -Parent $PSScriptRoot
$archivoEntorno = Join-Path $raizProyecto '.env'
$puntero = [IntPtr]::Zero
$contenidoPortapapeles = $null
$archivoTemporal = $null

function Vaciar-PortapapelesLocal {
  try {
    Set-Clipboard -Value ' '
  } catch {
    Write-Warning 'No se pudo vaciar el portapapeles. Copia cualquier texto no sensible al terminar.'
  }
}

function Establecer-ValorEntorno(
  [System.Collections.Generic.List[string]] $lineas,
  [string] $nombre,
  [string] $valor
) {
  $prefijo = "$nombre="
  for ($indice = 0; $indice -lt $lineas.Count; $indice++) {
    if ($lineas[$indice].StartsWith($prefijo, [StringComparison]::Ordinal)) {
      $lineas[$indice] = $prefijo + $valor
      return
    }
  }
  $lineas.Add($prefijo + $valor)
}

try {
  if (-not (Test-Path -LiteralPath $archivoEntorno)) {
    throw 'No existe el archivo .env local.'
  }

  if ($FromClipboard) {
    $contenidoPortapapeles = (Get-Clipboard -Raw).Trim()
    $claveApi = $contenidoPortapapeles
    Vaciar-PortapapelesLocal
  } else {
    Write-Host 'Pega la API key de Resend. No se mostrará en pantalla ni se guardará en el historial.'
    $claveSegura = Read-Host -AsSecureString 'API key de Resend'
    $puntero = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($claveSegura)
    $claveApi = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($puntero)
  }

  if ($claveApi -notmatch '^re_[A-Za-z0-9_-]{12,}$') {
    throw 'La API key no tiene el formato esperado de Resend.'
  }

  $lineas = [System.Collections.Generic.List[string]]::new()
  foreach ($linea in [IO.File]::ReadAllLines($archivoEntorno)) { $lineas.Add($linea) }

  $destinatario = $lineas | Where-Object { $_.StartsWith('JOB_OFFER_MAIL_TO=', [StringComparison]::Ordinal) } | Select-Object -First 1
  if (-not $destinatario -or $destinatario -match '@example\.com\s*$') {
    throw 'Configura primero JOB_OFFER_MAIL_TO en el .env local con el destinatario privado.'
  }

  $ajustes = [ordered]@{
    JOB_OFFER_MAIL_MODE = 'smtp'
    JOB_OFFER_MAIL_FROM = 'Portfolio de Daniel <ofertas@danielramonperez.com>'
    JOB_OFFER_LOG_CONTENT = 'false'
    SMTP_HOST = 'smtp.resend.com'
    SMTP_PORT = '587'
    SMTP_USERNAME = 'resend'
    SMTP_PASSWORD = $claveApi
    SMTP_AUTH = 'true'
    SMTP_STARTTLS = 'true'
  }

  foreach ($ajuste in $ajustes.GetEnumerator()) {
    Establecer-ValorEntorno $lineas $ajuste.Key ([string] $ajuste.Value)
  }

  $archivoTemporal = [IO.Path]::GetTempFileName()
  [IO.File]::WriteAllLines($archivoTemporal, $lineas, [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $archivoTemporal -Destination $archivoEntorno -Force
  $archivoTemporal = $null

  Write-Host 'Resend SMTP configurado en el .env local ignorado por Git.' -ForegroundColor Green
  Write-Host 'Reinicia Spring Boot para aplicar la configuración.'
} finally {
  if ($puntero -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($puntero)
  }
  if ($archivoTemporal -and (Test-Path -LiteralPath $archivoTemporal)) {
    Remove-Item -LiteralPath $archivoTemporal -Force
  }
  if ($FromClipboard) { Vaciar-PortapapelesLocal }
  $contenidoPortapapeles = $null
  $claveSegura = $null
  $claveApi = $null
}
