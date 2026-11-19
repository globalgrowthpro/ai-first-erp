@echo off
TITLE Hafez ERP - POS Offline Kiosk Launcher
COLOR 0A
REM ==============================================================================
REM Hafez ERP - Automated POS Kiosk Mode Launcher with Silent Thermal Printing
REM Used across all 15 Wazeer El-Helw branch terminals
REM ==============================================================================

SET POS_URL=http://localhost:3000/pos
SET POS_DATA_DIR=C:\Hafez_POS_Profile

ECHO ==============================================================================
ECHO   [Hafez ERP] Launching Wazeer El-Helw POS Terminal in Kiosk Mode...
ECHO ==============================================================================

IF NOT EXIST "%POS_DATA_DIR%" (
    MKDIR "%POS_DATA_DIR%"
    ECHO [OK] Created dedicated persistent POS profile at %POS_DATA_DIR%
)

REM 1. Check for Google Chrome
IF EXIST "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    ECHO [OK] Launching via Google Chrome with Silent Thermal Printing...
    START "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
        --app="%POS_URL%" ^
        --kiosk ^
        --kiosk-printing ^
        --disable-pinch ^
        --overscroll-history-navigation=0 ^
        --user-data-dir="%POS_DATA_DIR%"
    EXIT /B 0
)

REM 2. Check for 32-bit Chrome
IF EXIST "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    ECHO [OK] Launching via Google Chrome (x86) with Silent Thermal Printing...
    START "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" ^
        --app="%POS_URL%" ^
        --kiosk ^
        --kiosk-printing ^
        --disable-pinch ^
        --overscroll-history-navigation=0 ^
        --user-data-dir="%POS_DATA_DIR%"
    EXIT /B 0
)

REM 3. Fallback to Microsoft Edge
IF EXIST "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    ECHO [OK] Launching via Microsoft Edge with Silent Thermal Printing...
    START "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
        --app="%POS_URL%" ^
        --kiosk ^
        --kiosk-printing ^
        --disable-pinch ^
        --user-data-dir="%POS_DATA_DIR%"
    EXIT /B 0
)

ECHO [ERROR] Neither Google Chrome nor Microsoft Edge could be located.
PAUSE
