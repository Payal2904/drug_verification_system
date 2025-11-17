@echo off
REM Drug Verification System - Windows Startup Script
REM This script starts both backend and frontend servers for development

echo.
echo 🚀 Starting Drug Verification System...
echo ======================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version
echo ✅ npm version:
npm --version
echo.

REM Get the directory where this batch file is located
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo 📁 Project directory: %CD%
echo.

REM Install backend dependencies if needed
echo 🔧 Setting up backend...
cd backend
if not exist "node_modules" (
    echo    Installing backend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
) else (
    echo    Backend dependencies already installed
)

REM Check if simple-server.js exists
if not exist "simple-server.js" (
    echo ❌ simple-server.js not found in backend directory
    pause
    exit /b 1
)

echo    ✅ Backend setup complete
cd ..

REM Install frontend dependencies if needed
echo 🔧 Setting up frontend...
cd frontend
if not exist "node_modules" (
    echo    Installing frontend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
) else (
    echo    Frontend dependencies already installed
)
echo    ✅ Frontend setup complete
cd ..

echo.
echo 🎉 Setup complete! Starting servers...
echo ======================================
echo.

REM Start backend server in new window
echo 🚀 Starting backend server on http://localhost:3001...
start "Backend Server" cmd /k "cd /d %PROJECT_DIR%backend && npm start"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server in new window
echo 🚀 Starting frontend server on http://localhost:3000...
start "Frontend Server" cmd /k "cd /d %PROJECT_DIR%frontend && npm start"

echo.
echo ✅ Both servers are starting up in separate windows...
echo ======================================
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:3001
echo ======================================
echo.
echo 🔐 Demo Login Credentials:
echo    Admin:      admin@drugverify.com / admin123
echo    Pharmacist: pharmacist@example.com / pharm123
echo    User:       user@example.com / user123
echo.
echo 💡 Your browser should automatically open to http://localhost:3000
echo    If not, click the link above or copy-paste it into your browser
echo.
echo 🛑 To stop the servers, close the Backend and Frontend windows
echo    or press Ctrl+C in each window
echo.
echo ✅ Setup complete! Check the opened windows for server status.
echo.
pause
