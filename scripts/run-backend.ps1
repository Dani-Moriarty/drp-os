$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot 'backend'
$javaHome = Join-Path $projectRoot '.tools\jdk21\jdk-21.0.12+8'
$mavenCommand = Join-Path $projectRoot '.tools\apache-maven-3.9.16\bin\mvn.cmd'

if (-not (Test-Path -LiteralPath (Join-Path $javaHome 'bin\java.exe'))) {
  throw "No se encontró Java en $javaHome"
}

if (-not (Test-Path -LiteralPath $mavenCommand)) {
  throw "No se encontró Maven en $mavenCommand"
}

$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$env:Path"

Set-Location -LiteralPath $backendPath
& $mavenCommand spring-boot:run
