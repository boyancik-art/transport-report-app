@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -STA -ExecutionPolicy RemoteSigned -File "%~dp0Start-Preflight.ps1"
set "bridge_exit=%errorlevel%"
echo.
echo Preflight exit code: %bridge_exit%
pause
exit /b %bridge_exit%
