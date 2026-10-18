@echo off
setlocal

echo Running the client!!!

timeout /t 1 >nul

cd /d "%~dp0client"

npm install

npm run dev

endlocal
