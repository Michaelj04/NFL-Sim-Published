$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$AppUrl = "http://127.0.0.1:5173/"

function Test-AppServer {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $AppUrl -TimeoutSec 2
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Open-App {
  Start-Process $AppUrl
}

Set-Location $ProjectRoot
Write-Host ""
Write-Host "Franchise War Room local launcher" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"
Write-Host "URL:     $AppUrl"
Write-Host ""

if (Test-AppServer) {
  Write-Host "The app server is already running. Opening the app..." -ForegroundColor Green
  Open-App
  exit 0
}

if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
  Write-Host "Installing dependencies. This only needs to happen once..." -ForegroundColor Yellow
  & npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "npm install failed. The app server was not started." -ForegroundColor Red
    Read-Host "Press Enter to close this launcher"
    exit $LASTEXITCODE
  }
}

Write-Host "Starting the app server in a new terminal..." -ForegroundColor Cyan
$serverCommand = "cd /d `"$ProjectRoot`" && npm run dev:local"
$serverProcess = Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $serverCommand) -PassThru

Write-Host "Waiting for the server to respond..."
for ($attempt = 1; $attempt -le 45; $attempt += 1) {
  Start-Sleep -Seconds 1
  if (Test-AppServer) {
    Write-Host "Server is ready. Opening the app..." -ForegroundColor Green
    Open-App
    exit 0
  }
  if ($serverProcess.HasExited) {
    Write-Host ""
    Write-Host "The server process exited before the app responded." -ForegroundColor Red
    Write-Host "Check the server terminal for the npm/Vite error."
    Read-Host "Press Enter to close this launcher"
    exit 1
  }
}

Write-Host ""
Write-Host "The server started, but $AppUrl did not respond in time." -ForegroundColor Yellow
Write-Host "Leave the server terminal open and try refreshing the browser in a few seconds."
Read-Host "Press Enter to close this launcher"
