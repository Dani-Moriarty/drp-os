$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'
$temporaryFile = $null

function Set-EnvironmentValue(
  [System.Collections.Generic.List[string]] $lines,
  [string] $name,
  [string] $value
) {
  $prefix = "$name="
  for ($index = 0; $index -lt $lines.Count; $index++) {
    if ($lines[$index].StartsWith($prefix, [StringComparison]::Ordinal)) {
      $lines[$index] = $prefix + $value
      return
    }
  }
  $lines.Add($prefix + $value)
}

try {
  if (-not (Test-Path -LiteralPath $envFile)) {
    throw 'No existe el archivo .env local.'
  }

  $bytes = [byte[]]::new(48)
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
  } finally {
    $generator.Dispose()
  }
  $adminKey = [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=')

  $lines = [System.Collections.Generic.List[string]]::new()
  foreach ($line in [IO.File]::ReadAllLines($envFile)) { $lines.Add($line) }
  Set-EnvironmentValue $lines 'MESSAGE_BOARD_ADMIN_KEY' $adminKey
  Set-EnvironmentValue $lines 'MESSAGE_BOARD_RATE_LIMIT_MAX_REQUESTS' '5'
  Set-EnvironmentValue $lines 'MESSAGE_BOARD_RATE_LIMIT_WINDOW' '10m'

  $temporaryFile = [IO.Path]::GetTempFileName()
  [IO.File]::WriteAllLines($temporaryFile, $lines, [Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $temporaryFile -Destination $envFile -Force
  $temporaryFile = $null

  Write-Host 'Moderación de Message Board configurada en el .env local ignorado por Git.' -ForegroundColor Green
} finally {
  if ($temporaryFile -and (Test-Path -LiteralPath $temporaryFile)) {
    Remove-Item -LiteralPath $temporaryFile -Force
  }
  $adminKey = $null
  $bytes = $null
}
