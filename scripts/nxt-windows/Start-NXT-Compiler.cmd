@echo off
setlocal
cd /d "%~dp0"
echo NXT Compiler Companion - Windows setup and launch
powershell.exe -NoLogo -NoProfile -File "%~dp0Start-NXT-Compiler.ps1"
if errorlevel 1 (
  echo.
  echo Setup did not finish. Read the message above.
  echo If your school blocks PowerShell scripts, ask IT to approve this companion.
  pause
)
