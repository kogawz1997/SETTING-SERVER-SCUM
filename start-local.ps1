Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js was not found. Install Node.js 18 or newer, then run this file again." -ForegroundColor Red
  Write-Host "Download: https://nodejs.org/"
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not (Test-Path (Join-Path $root "node_modules\express"))) {
  Write-Host "Dependencies are missing. Run npm install in this folder first." -ForegroundColor Yellow
  Write-Host "  cd `"$root`""
  Write-Host "  npm install"
  Read-Host "Press Enter to exit"
  exit 1
}

$port = if ($env:PORT) { $env:PORT } else { "3000" }
$url = "http://localhost:$port"
Write-Host "Starting SCUM Local Control on $url"
Start-Process $url
node server.js
