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

for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%v"
if %NODE_MAJOR% LSS 18 (
  echo Node.js 18 or newer is required. Current major version: %NODE_MAJOR%
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\express" (
  echo Dependencies are missing.
  where npm >nul 2>nul
  if errorlevel 1 (
    echo npm was not found. Install Node.js with npm, then run this file again.
    pause
    exit /b 1
  )
  choice /m "Run npm install now"
  if errorlevel 2 exit /b 1
  npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

if "%PORT%"=="" set "PORT=3000"
set "APP_URL=http://localhost:%PORT%"
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo Port %PORT% is already in use. Close the other app or run with another port:
  echo   set PORT=3001
  echo   start-local.cmd
  pause
  exit /b 1
)
if not exist "logs" mkdir "logs"
echo Starting SCUM Local Control on %APP_URL%
echo Startup log: %~dp0logs\startup.log
start "" "%APP_URL%"
node server.js >> "logs\startup.log" 2>&1
