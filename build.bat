@echo off
REM ============================================================
REM  Finance Manager - Windows Build Script
REM  Compiles the app into a single offline .exe installer.
REM  Requires: Node.js 18+ (https://nodejs.org) installed on PATH
REM ============================================================

setlocal
cd /d "%~dp0"

echo.
echo [1/3] Checking Node.js installation...
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js not found. Install Node.js 18 or newer from https://nodejs.org and run this script again.
    pause
    exit /b 1
)
node --version

echo.
echo [2/3] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo [3/3] Building the Windows executable...
call npm run electron:build
if errorlevel 1 (
    echo ERROR: Build failed. See messages above.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  BUILD COMPLETE
echo  Your installer is located at:
echo      %~dp0dist-electron\Finance Manager Setup 1.0.0.exe
echo.
echo  Run the Setup .exe to install the app with desktop and
echo  Start Menu shortcuts. All data is stored locally on this
echo  machine; no internet connection is needed after building.
echo ============================================================
pause
endlocal
