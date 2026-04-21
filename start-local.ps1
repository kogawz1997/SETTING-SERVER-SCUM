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

$nodeMajor = [int]((node -p "process.versions.node").Split(".")[0])
if ($nodeMajor -lt 18) {
  Write-Host "Node.js 18 or newer is required. Current major version: $nodeMajor" -ForegroundColor Red
  Write-Host "Download: https://nodejs.org/"
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not (Test-Path (Join-Path $root "node_modules\express"))) {
  Write-Host "Dependencies are missing." -ForegroundColor Yellow
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "npm was not found. Install Node.js with npm, then run this file again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
  }
  $answer = Read-Host "Run npm install now? (Y/N)"
  if ($answer -notmatch "^[Yy]") { exit 1 }
  npm install
}

$port = if ($env:PORT) { $env:PORT } else { "3000" }
$url = "http://localhost:$port"
$portBusy = $false
try {
  $portBusy = [bool](Get-NetTCPConnection -LocalPort ([int]$port) -State Listen -ErrorAction SilentlyContinue)
} catch {
  $portBusy = $false
}
if ($portBusy) {
  Write-Host "Port $port is already in use. Close the other app or set `$env:PORT to another value." -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1
}

$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logPath = Join-Path $logDir "startup.log"
Write-Host "Starting SCUM Local Control on $url"
Write-Host "Startup log: $logPath"
Start-Process $url
node server.js *> $logPath
