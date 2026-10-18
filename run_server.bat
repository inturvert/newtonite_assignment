@echo off
setlocal

:: Automated .bat file for windows to run the server

echo Preparing for running the  server!!!

timeout /t 1 >nul

cd /d "%~dp0server"

npm install

npm run db:generate

npm run db:push

npm run db:seed

echo Running the server!!!

timeout /t 1 >nul

npm run dev

endlocal

