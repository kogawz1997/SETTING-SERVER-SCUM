Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Stop-WithMessage {
  param([string]$Message)
  Write-Host ""
  Write-Host $Message -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

function Test-PortFree {
  param([int]$Port)
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $listener.Start()
    $listener.Stop()
    return $true
  } catch {
    return $false
  }
}

Write-Host "SETTING SERVER SCUM - Portable Launcher" -ForegroundColor Cyan
Write-Host "Folder: $root"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "Node.js was not found. Install Node.js 18 or newer from https://nodejs.org/ and run this launcher again."
}

$nodeMajor = [int]((node -p "process.versions.node").Split(".")[0])
if ($nodeMajor -lt 18) {
  Stop-WithMessage "Node.js 18 or newer is required. Current Node major version: $nodeMajor"
}

if (-not (Test-Path (Join-Path $root "node_modules\express"))) {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Stop-WithMessage "npm was not found. Reinstall Node.js with npm enabled."
  }
  Write-Host "Installing runtime dependencies. This runs only when node_modules is missing..." -ForegroundColor Yellow
  npm install --omit=dev
  if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "npm install failed. Check your internet connection or run npm install manually."
  }
}

$preferredPort = if ($env:PORT) { [int]$env:PORT } else { 3000 }
$port = $null
foreach ($candidate in @($preferredPort) + (3000..3010)) {
  if (Test-PortFree -Port $candidate) {
    $port = $candidate
    break
  }
}
if (-not $port) {
  Stop-WithMessage "Could not find a free port from 3000 to 3010. Close another local app and try again."
}

$env:PORT = [string]$port
$url = "http://localhost:$port"
$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logPath = Join-Path $logDir "startup.log"

Write-Host "Node.js: $(node -v)" -ForegroundColor Green
Write-Host "Port: $port" -ForegroundColor Green
Write-Host "URL: $url" -ForegroundColor Green
Write-Host "Log: $logPath"
Write-Host ""
Write-Host "Starting local server. Keep this window open while using the app." -ForegroundColor Cyan

Start-Job -ScriptBlock {
  param($TargetUrl)
  Start-Sleep -Seconds 2
  Start-Process $TargetUrl
} -ArgumentList $url | Out-Null

node server.js *> $logPath
