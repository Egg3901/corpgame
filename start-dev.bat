@echo off
REM Simple script to start both frontend and backend in development mode (Windows)
REM Usage: start-dev.bat

echo Starting Corporate Sim in development mode...
echo.

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Using PM2 to manage processes...
    echo.
    
    REM Create logs directory if it doesn't exist
    if not exist logs mkdir logs
    
    REM Start with PM2
    pm2 start ecosystem.config.js
    
    echo.
    echo Started! View logs with: pm2 logs
    echo Stop with: pm2 stop ecosystem.config.js
    echo Restart with: pm2 restart ecosystem.config.js
) else (
    echo PM2 not found. Using npm concurrently...
    echo Install PM2 for better process management: npm install -g pm2
    echo.
    
    REM Fallback to npm dev script
    call npm run dev
)






