@echo off
setlocal

set "SCUM_DEPLOY_ROOT=%SCUM_DEPLOY_ROOT%"
if "%SCUM_DEPLOY_ROOT%"=="" set "SCUM_DEPLOY_ROOT=C:\new"

set "SCUM_RESTART_RCON_PORT=%SCUM_RESTART_RCON_PORT%"
if "%SCUM_RESTART_RCON_PORT%"=="" set "SCUM_RESTART_RCON_PORT=8038"

set "SCUM_SERVER_ROOT=%SCUM_SERVER_ROOT%"

if not exist "%SCUM_DEPLOY_ROOT%\deploy\restart-scum-main-admin.cmd" (
  echo restart-scum-main-admin.cmd not found under %SCUM_DEPLOY_ROOT%\deploy
  exit /b 1
)

call "%SCUM_DEPLOY_ROOT%\deploy\restart-scum-main-admin.cmd" %SCUM_RESTART_RCON_PORT% "%SCUM_SERVER_ROOT%"
