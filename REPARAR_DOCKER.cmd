@echo off
setlocal

fltmc >nul 2>&1
if errorlevel 1 (
  powershell.exe -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\repair-docker.ps1"
set "repairExit=%ERRORLEVEL%"

echo.
if "%repairExit%"=="0" (
  echo Reparacion terminada. DRP OS vuelve a tener sus servicios locales disponibles.
) else (
  echo La reparacion no pudo completarse. Revisa el mensaje anterior.
)
echo.
pause
exit /b %repairExit%
