<#
    .SYNOPSIS
    Starts the local development server and opens the game in a browser.
#>
Write-Host "Checking for Python..."
$python_exists = Get-Command python3, python -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $python_exists) {
    Write-Host "--------------------------------------------------" -ForegroundColor Red
    Write-Host "ERROR: Python is not found in your system's PATH." -ForegroundColor Red
    Write-Host "Please install Python and add it to your PATH to run the local web server." -ForegroundColor Red
    Write-Host "--------------------------------------------------" -ForegroundColor Red
    exit
}

# Get the directory where this script is located.
$ScriptDir = $PSScriptRoot
# The project root is one level above the 'scripts' directory.
$ProjectRoot = Split-Path -Path $ScriptDir -Parent
# The full path to the server script.
$ServerScript = Join-Path -Path $ProjectRoot -ChildPath "server.py"

Write-Host "Starting the web server on port 8000..."
# Start server.py in a new process/window so this script can continue.
Start-Process $python_exists.Source -ArgumentList $ServerScript -WorkingDirectory $ProjectRoot

Write-Host "Server is running. Waiting a moment before opening the browser..." -ForegroundColor Green
Start-Sleep -Seconds 2

Write-Host "Opening http://localhost:8000 in your default browser."
Start-Process "http://localhost:8000"
