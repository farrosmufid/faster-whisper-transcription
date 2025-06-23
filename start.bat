@echo off
REM Whisper Transcription App Startup Script for Windows

echo 🚀 Starting Whisper Transcription App...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16 or higher.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install Python dependencies if requirements.txt exists
if exist requirements.txt (
    echo 📦 Installing Python dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ❌ Failed to install Python dependencies
        pause
        exit /b 1
    )
    echo ✅ Python dependencies installed
)

REM Install Node.js dependencies if package.json exists
if exist package.json (
    echo 📦 Installing Node.js dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install Node.js dependencies
        pause
        exit /b 1
    )
    echo ✅ Node.js dependencies installed
)

echo.
echo 🎯 Starting servers...
echo.

REM Start Flask backend in background
echo 🔧 Starting Flask backend on http://localhost:5001
start "Flask Backend" python app.py

REM Wait a moment for Flask to start
timeout /t 3 /nobreak >nul

REM Start React frontend
echo ⚛️  Starting React frontend on http://localhost:3000
start "React Frontend" npm start

echo.
echo 🎉 Both servers are starting...
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:5001
echo.
echo Press any key to stop both servers...

pause

echo 🛑 Stopping servers...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo ✅ Servers stopped
pause 