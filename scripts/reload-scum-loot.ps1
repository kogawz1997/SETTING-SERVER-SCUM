param(
  [string]$DeployRoot = 'C:\new',
  [string]$ScumRoot = $env:SCUM_SERVER_ROOT,
  [int]$ExpectedRconPort = 8038,
  [string]$RconHost = '127.0.0.1',
  [string]$ReloadCommand = '#ReloadLootCustomizationsAndResetSpawners true'
)

$ErrorActionPreference = 'Stop'

function Resolve-ScumRoot {
  param([string]$PathValue)

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    $PathValue = 'Z:\SteamLibrary\steamapps\common\SCUM Server'
  }

  if (Test-Path $PathValue) {
    return (Resolve-Path $PathValue).Path
  }

  if ($PathValue -match '^([A-Za-z]):\\(.*)$') {
    $driveName = $matches[1]
    $subPath = $matches[2]
    $drive = Get-PSDrive -Name $driveName -ErrorAction SilentlyContinue
    if ($drive -and $drive.DisplayRoot) {
      $candidate = Join-Path $drive.DisplayRoot $subPath
      if (Test-Path $candidate) {
        return $candidate
      }
    }

    if ($driveName -ieq 'Z') {
      $candidate = Join-Path '\\BeeStation\Media' $subPath
      if (Test-Path $candidate) {
        return $candidate
      }
    }
  }

  return $PathValue
}

$resolvedScumRoot = Resolve-ScumRoot $ScumRoot
$battleyeCfg = Join-Path $resolvedScumRoot 'BattlEye\BEServer_x64.cfg'
$rconScript = Join-Path $DeployRoot 'scripts\rcon-send.js'

if (-not (Test-Path $battleyeCfg)) {
  throw "BattlEye config not found: $battleyeCfg"
}

if (-not (Test-Path $rconScript)) {
  throw "RCon helper not found: $rconScript"
}

$cfgLines = Get-Content $battleyeCfg
$passwordLine = $cfgLines | Where-Object { $_ -match '^RConPassword\s+' } | Select-Object -First 1
if (-not $passwordLine) {
  throw "RConPassword was not found in $battleyeCfg"
}

$rconPort = $ExpectedRconPort
$portLine = $cfgLines | Where-Object { $_ -match '^RConPort\s+' } | Select-Object -First 1
if ($portLine) {
  $parsedPort = ($portLine -split '\s+', 2)[1]
  if ($parsedPort -match '^\d+$') {
    $rconPort = [int]$parsedPort
  }
}

$password = ($passwordLine -split '\s+', 2)[1].Trim()
if ([string]::IsNullOrWhiteSpace($password)) {
  throw "RConPassword in $battleyeCfg is empty"
}

$commandToSend = if ([string]::IsNullOrWhiteSpace($ReloadCommand)) {
  '#ReloadLootCustomizationsAndResetSpawners true'
} else {
  $ReloadCommand.Trim()
}

Write-Host "Sending loot reload command through BattlEye RCon..." -ForegroundColor Cyan
Write-Host "SCUM root: $resolvedScumRoot" -ForegroundColor DarkGray
Write-Host "RCon host: $RconHost" -ForegroundColor DarkGray
Write-Host "RCon port: $rconPort" -ForegroundColor DarkGray
Write-Host "Command: $commandToSend" -ForegroundColor DarkGray

& node $rconScript --protocol battleye --host $RconHost --port $rconPort --password $password --command $commandToSend

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
