@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 18 or newer, then run this file again.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\express" (
  echo Dependencies are missing. Run npm install in this folder first.
  echo.
  echo   cd /d "%~dp0"
  echo   npm install
  echo.
  pause
  exit /b 1
)

if "%PORT%"=="" set "PORT=3000"
set "APP_URL=http://localhost:%PORT%"
echo Starting SCUM Local Control on %APP_URL%
start "" "%APP_URL%"
node server.js
