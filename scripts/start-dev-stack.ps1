# Windows: start Docker infra, all Spring Boot services, then Vite (same idea as start-dev-stack.sh).
# Run from repo root (folder containing system-backend and system-frontend):
#   powershell -ExecutionPolicy Bypass -File .\scripts\start-dev-stack.ps1
# Options: -BackendsOnly  |  -FrontendOnly  |  -FrontendDir system-frontend2

param(
    [switch] $BackendsOnly,
    [switch] $FrontendOnly,
    [string] $FrontendDir = "system-frontend2"
)

$ErrorActionPreference = "Stop"
# scripts/ -> repo root (folder with system-backend + system-frontend)
$Root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $Root "system-backend\pom.xml"))) {
    throw "Run this from the repo that contains system-backend (current root: $Root)"
}
$Backend = Join-Path $Root "system-backend"
$DockerDir = Join-Path $Backend "infrastructure\docker"
$Frontend = Join-Path $Root $FrontendDir
$LogDir = Join-Path $Root ".dev-logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Use JDK 21 for Maven (project targets 21; JDK 22+ often breaks Lombok/compiler)
if (-not $env:JAVA_HOME -or ($env:JAVA_HOME -notmatch 'jdk-21')) {
    $j21 = Get-ChildItem 'C:\Program Files\Java' -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^jdk-21' } | Select-Object -First 1
    if ($j21) {
        $env:JAVA_HOME = $j21.FullName
        $env:Path = "$($j21.FullName)\bin;$env:Path"
        Write-Host ">>> JAVA_HOME -> $env:JAVA_HOME"
    } else {
        Write-Host ">>> WARNING: JDK 21 not found under C:\Program Files\Java; Maven may use wrong Java"
    }
}

function Start-SpringService {
    param([string] $ModulePath, [string] $LogName)
    $logFile = Join-Path $LogDir "$LogName.log"
    Write-Host ">>> Starting $ModulePath -> $logFile"
    # Start-Process cannot redirect stdout and stderr to the same path; use cmd to merge streams.
    # Force JAVA_HOME inside cmd so Maven never picks JDK 22+ from a stale user PATH.
    if ($env:JAVA_HOME) {
        $jh = $env:JAVA_HOME -replace '"', '""'
        $inner = "set `"JAVA_HOME=$jh`"&& set `"PATH=%JAVA_HOME%\bin;%PATH%`"&& mvn -q -pl `"$ModulePath`" spring-boot:run >> `"$logFile`" 2>&1"
    } else {
        $inner = "mvn -q -pl `"$ModulePath`" spring-boot:run >> `"$logFile`" 2>&1"
    }
    $p = Start-Process -FilePath "cmd.exe" `
        -ArgumentList @("/c", $inner) `
        -WorkingDirectory $Backend `
        -WindowStyle Hidden `
        -PassThru
    $pidFile = Join-Path $LogDir "$LogName.pid"
    $p.Id | Out-File -FilePath $pidFile -Encoding utf8
}

if (-not $FrontendOnly) {
    $compose = Join-Path $DockerDir "docker-compose.yml"
    if (-not (Test-Path $compose)) { throw "Missing $compose" }
    Write-Host ">>> docker compose up -d ($DockerDir)"
    Push-Location $DockerDir
    try { docker compose up -d } finally { Pop-Location }
    Write-Host ">>> Waiting for Kafka/Redis..."
    Start-Sleep -Seconds 8

    Write-Host ">>> mvn install logistics-security-common (shared library for services)..."
    Push-Location $Backend
    try {
        if ($env:JAVA_HOME) {
            $jh = $env:JAVA_HOME -replace '"', '""'
            cmd /c "set `"JAVA_HOME=$jh`"&& set `"PATH=%JAVA_HOME%\bin;%PATH%`"&& mvn -q install -pl logistics-security-common -DskipTests"
        } else {
            mvn -q install -pl logistics-security-common -DskipTests
        }
    } finally { Pop-Location }

    Write-Host ">>> Starting Spring Boot services..."
    Start-SpringService "services/user-identity-service" "user-identity-service"
    Start-Sleep -Seconds 3
    Start-SpringService "services/inventory-service" "inventory-service"
    Start-SpringService "services/warehouse-service" "warehouse-service"
    Start-SpringService "services/order-management-service" "order-management-service"
    Start-SpringService "services/procurement-service" "procurement-service"
    Start-SpringService "services/notification-service" "notification-service"
    Start-SpringService "services/reporting-service" "reporting-service"

    Write-Host ""
    Write-Host "Logs under: $LogDir"
    Write-Host "Ports: 8081 identity, 8082 inventory, 8083 warehouse, 8084 orders, 8085 procurement, 8086 notification, 8087 reporting"
    Write-Host ""
}

if ($BackendsOnly) {
    Write-Host ">>> Done (-BackendsOnly). Run: cd $FrontendDir; npm run dev"
    exit 0
}

if (-not (Test-Path $Frontend)) { throw "Frontend not found: $Frontend" }
Push-Location $Frontend
if (-not (Test-Path "node_modules")) {
    Write-Host ">>> npm install..."
    npm install
}
Write-Host ">>> npm run dev (Vite default port from that app’s vite.config, often 5173 or 5174) - Ctrl+C stops only the UI"
npm run dev
