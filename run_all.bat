@echo off
setlocal

echo running both server & client..

start "Newtonite Server" cmd /k call "%~dp0run_server.bat"
start "Newtonite Client" cmd /k call "%~dp0run_client.bat"

endlocal
