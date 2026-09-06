@echo off
chcp 65001 >nul
title Arrancar Portfolio de Daniel
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\Desktop\Portfolio-Daniel\scripts\start-portfolio.ps1"
if errorlevel 1 pause
