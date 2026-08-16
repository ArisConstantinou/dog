@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"

echo Meshy API key setup
echo The key will be stored only in this project's gitignored .env file.
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-meshy-key.ps1"

if errorlevel 1 (
  echo.
  echo The key was not saved.
  pause
  exit /b 1
)

echo.
echo Return to Codex and say: ready
pause
endlocal
