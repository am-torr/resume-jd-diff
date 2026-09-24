#requires -Version 7.0
<#
.SYNOPSIS
    Starts the Resume Diff Viewer backend and frontend, then opens the app in the default browser.

.DESCRIPTION
    Boots the Express comparison API first and waits for /api/health to answer, so the
    browser is never pointed at a UI whose backend is not ready yet. Then boots the Vite
    dev server on a strict port and opens http://localhost:<ClientPort>.

    Both services run in this console. Press Ctrl+C once to stop them together.

.EXAMPLE
    pwsh -File scripts\run-app.ps1

.EXAMPLE
    pwsh -File scripts\run-app.ps1 -NoBrowser -ApiPort 4200
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 65535)][int]$ApiPort = 4174,
    [ValidateRange(1, 65535)][int]$ClientPort = 5173,
    [ValidateRange(5, 600)][int]$TimeoutSeconds = 90,
    [switch]$NoBrowser,
    [switch]$Install
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$apiUrl = "http://localhost:$ApiPort"
$clientUrl = "http://localhost:$ClientPort"
$started = [System.Collections.Generic.List[object]]::new()

function Write-Step { param([string]$Message) Write-Host "[run] $Message" }
function Write-Warn { param([string]$Message) Write-Host "[run] WARN $Message" -ForegroundColor Yellow }

function Test-Endpoint {
    param([string]$Url)
    try {
        $null = Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing
        return $true
    }
    catch {
        return $false
    }
}

function Wait-Endpoint {
    param([string]$Url, [string]$Label, [int]$Seconds, [System.Diagnostics.Process]$Process)

    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        if ($Process -and $Process.HasExited) {
            throw "$Label exited with code $($Process.ExitCode) before it started serving."
        }
        if (Test-Endpoint -Url $Url) { return }
        Start-Sleep -Milliseconds 400
    }
    throw "$Label did not answer at $Url within $Seconds seconds."
}

function Start-NodeService {
    param([string]$Label, [string[]]$NodeArgs, [hashtable]$EnvVars)

    $saved = @{}
    foreach ($key in $EnvVars.Keys) {
        $saved[$key] = [System.Environment]::GetEnvironmentVariable($key)
        [System.Environment]::SetEnvironmentVariable($key, $EnvVars[$key])
    }
    try {
        $process = Start-Process -FilePath 'node' -ArgumentList $NodeArgs `
            -WorkingDirectory $root -NoNewWindow -PassThru
    }
    finally {
        foreach ($key in $saved.Keys) {
            [System.Environment]::SetEnvironmentVariable($key, $saved[$key])
        }
    }
    $started.Add([pscustomobject]@{ Label = $Label; Process = $process })
    return $process
}

function Stop-Started {
    foreach ($service in $started) {
        $process = $service.Process
        if (-not $process -or $process.HasExited) { continue }
        Write-Step "stopping $($service.Label) (pid $($process.Id))"
        # /T so node's own child processes go with it; the API and Vite both fork workers.
        & taskkill.exe /PID $process.Id /T /F 2>&1 | Out-Null
    }
}

try {
    Push-Location $root

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw 'node was not found on PATH. Install Node.js 20+ and re-run.'
    }

    if ($Install -or -not (Test-Path (Join-Path $root 'node_modules'))) {
        Write-Step 'installing dependencies (npm install)'
        & npm.cmd install
        $installExit = $LASTEXITCODE
        if ($installExit -ne 0) { throw "npm install failed with exit code $installExit." }
    }

    # --- backend -----------------------------------------------------------
    if (Test-Endpoint -Url "$apiUrl/api/health") {
        Write-Step "backend already serving at $apiUrl - reusing it"
    }
    else {
        Write-Step "starting backend on port $ApiPort"
        $api = Start-NodeService -Label 'backend' `
            -NodeArgs @('node_modules/tsx/dist/cli.mjs', 'server/index.ts') `
            -EnvVars @{ PORT = "$ApiPort" }
        Wait-Endpoint -Url "$apiUrl/api/health" -Label 'backend' -Seconds $TimeoutSeconds -Process $api
        Write-Step "backend healthy at $apiUrl/api/health"
    }

    # --- frontend ----------------------------------------------------------
    if (Test-Endpoint -Url $clientUrl) {
        Write-Step "frontend already serving at $clientUrl - reusing it"
    }
    else {
        Write-Step "starting frontend on port $ClientPort"
        # --strictPort so Vite fails loudly instead of drifting to another port,
        # which would leave the browser opening a URL nothing is serving.
        $client = Start-NodeService -Label 'frontend' `
            -NodeArgs @('node_modules/vite/bin/vite.js', '--port', "$ClientPort", '--strictPort') `
            -EnvVars @{ VITE_API_TARGET = $apiUrl }
        Wait-Endpoint -Url $clientUrl -Label 'frontend' -Seconds $TimeoutSeconds -Process $client
        Write-Step "frontend ready at $clientUrl"
    }

    # --- browser -----------------------------------------------------------
    if ($NoBrowser) {
        Write-Step "skipping browser launch (-NoBrowser). Open $clientUrl yourself."
    }
    else {
        Write-Step "opening $clientUrl in the default browser"
        Start-Process $clientUrl
    }

    if ($started.Count -eq 0) {
        Write-Step 'nothing was started by this run - both services were already up.'
        return
    }

    Write-Host ''
    Write-Step 'Resume Diff Viewer is running. Press Ctrl+C to stop.'
    Write-Host ''

    while ($true) {
        foreach ($service in $started) {
            if ($service.Process.HasExited) {
                Write-Warn "$($service.Label) exited with code $($service.Process.ExitCode) - shutting down."
                return
            }
        }
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Stop-Started
    Pop-Location -ErrorAction SilentlyContinue
}
