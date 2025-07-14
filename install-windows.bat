@echo off
REM Universal Dev Environment - Windows Batch Installer
REM Downloads and runs the PowerShell setup script

echo.
echo 🚀 Universal Development Environment - Windows Installer
echo ========================================================
echo.

REM Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell is available'" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PowerShell is required but not found
    echo Please install PowerShell and try again
    pause
    exit /b 1
)

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  This installer requires Administrator privileges
    echo Please run as Administrator and try again
    pause
    exit /b 1
)

echo 📥 Downloading setup script...

REM Download the PowerShell script
powershell -Command "& {Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/nhangen/universal-dev-env/main/universal-setup.ps1' -OutFile 'universal-setup.ps1'}"

if %errorlevel% neq 0 (
    echo ❌ Failed to download setup script
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo ✅ Setup script downloaded successfully
echo.
echo 🚀 Running Universal Dev Environment setup...
echo.

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "universal-setup.ps1"

REM Clean up
if exist "universal-setup.ps1" del "universal-setup.ps1"

echo.
echo 🎉 Installation complete!
echo.
pause