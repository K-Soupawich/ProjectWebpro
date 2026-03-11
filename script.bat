@echo off
title ProjectWebpro Setup

echo Installing dependencies...
call npm install || (
    echo Failed to install dependencies!
    pause
    exit /b
)

echo [INFO] Starting the server...
echo [INFO] Open http://localhost:3000 in your browser
call node server.js || (
    pause
    exit /b
)