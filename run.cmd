@echo off
REM Quick launcher: starts the API + Vite dev server and opens the app in the default browser.
REM Double-click this file, or run it from any shell. Ctrl+C stops both services.
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-app.ps1" %*
if errorlevel 1 (
  echo.
  echo Startup failed - see the messages above.
  pause
)
