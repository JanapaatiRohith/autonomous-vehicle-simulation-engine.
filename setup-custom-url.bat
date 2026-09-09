@echo off
:: Batch script to map autonomous-vehicle-simulation-engine.in to 127.0.0.1
echo ====================================================================
echo  ADAPT-INDIA — Domain Mapping Setup
echo  Target URL: http://autonomous-vehicle-simulation-engine.in:5173/
echo ====================================================================
echo.

findstr /C:"autonomous-vehicle-simulation-engine.in" %WINDIR%\System32\drivers\etc\hosts >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] autonomous-vehicle-simulation-engine.in is ALREADY configured in your hosts file.
) else (
    echo Adding 127.0.0.1 autonomous-vehicle-simulation-engine.in to hosts file...
    echo. >> %WINDIR%\System32\drivers\etc\hosts
    echo 127.0.0.1 autonomous-vehicle-simulation-engine.in >> %WINDIR%\System32\drivers\etc\hosts
    if %errorlevel% equ 0 (
        echo [SUCCESS] Domain mapped successfully!
    ) else (
        echo [ERROR] Failed to modify hosts file. Please make sure you Right-Click this file and choose 'Run as administrator'.
    )
)

echo.
echo ====================================================================
echo  Open your browser to:
echo  http://autonomous-vehicle-simulation-engine.in:5173/
echo ====================================================================
echo.
pause
