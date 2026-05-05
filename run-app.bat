@echo off
echo Starting Sri Ram Fashions Application...
echo.
echo [1/2] Installing root dependencies...
call npm install
echo.
echo [2/2] Starting Backend and Frontend...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
npm run dev:all
pause
