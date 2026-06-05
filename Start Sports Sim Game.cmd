@echo off
setlocal
title NFL Sim Launcher

set "PROJECT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\start-local.ps1"

endlocal
