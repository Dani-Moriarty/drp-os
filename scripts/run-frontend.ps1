$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $projectRoot 'frontend'
$codexDependencies = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
$bundledNodePath = Join-Path $codexDependencies 'node\bin'
$bundledPnpm = Join-Path $codexDependencies 'bin\fallback\pnpm.cmd'

if (Test-Path -LiteralPath (Join-Path $bundledNodePath 'node.exe')) {
  $env:Path = "$bundledNodePath;$env:Path"
}

$pnpmCommand = if (Test-Path -LiteralPath $bundledPnpm) {
  $bundledPnpm
} else {
  (Get-Command pnpm.cmd -ErrorAction SilentlyContinue).Source
}

if (-not $pnpmCommand) {
  throw 'No se encontró pnpm. Instala Node.js y ejecuta: npm install --global pnpm@11.19.0'
}

Set-Location -LiteralPath $frontendPath
& $pnpmCommand start
