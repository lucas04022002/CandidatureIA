@echo off
rem Lance ApplyBot en dev (variables dans .env.local). Usage : dev.cmd
cd /d "%~dp0"
call npm run dev -- --hostname 127.0.0.1 --port 3001
