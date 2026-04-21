@echo off
setlocal
title SETTING SERVER SCUM
cd /d "%~dp0"

echo.
echo SETTING SERVER SCUM - Portable Launcher
echo This launcher checks Node.js, installs missing dependencies, finds a free port,
echo starts the local server, and opens the browser automatically.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start SETTING SERVER SCUM.ps1"
if errorlevel 1 (
  echo.
  echo Launcher stopped with an error. Read the message above.
  pause
  exit /b 1
)
