@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\activate-message-board-admin.ps1"
if errorlevel 1 (
  echo.
  echo No se pudo activar la sesion. Comprueba que Docker y el backend estan encendidos.
  pause
)
endlocal
