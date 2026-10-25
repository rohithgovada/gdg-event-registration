@echo off
title GDG Event Registration Portal
echo ========================================================
echo   Starting GDG On Campus Event Registration Portal...
echo ========================================================
cd /d "%~dp0"
start http://localhost:5000
node server.js
pause
