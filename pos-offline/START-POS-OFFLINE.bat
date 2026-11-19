@echo off
TITLE Hafez ERP - Wazeer El-Helw POS Offline Terminal
COLOR 0A

ECHO ==============================================================================
ECHO   [Hafez ERP - Wazeer El-Helw]
ECHO   Launching POS Offline Terminal in Kiosk Mode with Silent Printing...
ECHO ==============================================================================
ECHO.

SET SCRIPT_DIR=%~dp0
SET POS_DATA_DIR=C:\Hafez_POS_Profile
SET PREVIEW_FILE=%SCRIPT_DIR%preview.html
SET LOCAL_URL=http://localhost:3000/pos
SET TARGET_URL=%LOCAL_URL%

REM Check if local server is listening on port 3000
powershell -NoProfile -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 3000); exit 0 } catch { exit 1 }" >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO [STATUS] Local dev server detected on port 3000.
    SET TARGET_URL=%LOCAL_URL%
) ELSE (
    ECHO [STATUS] Opening standalone offline terminal directly...
    SET TARGET_URL=file:///%PREVIEW_FILE:\=/%
)

REM Ensure dedicated POS user data profile exists to protect IndexedDB
IF NOT EXIST "%POS_DATA_DIR%" (
    MKDIR "%POS_DATA_DIR%"
    ECHO [OK] Created dedicated POS user profile at %POS_DATA_DIR%
)

REM Locate Chrome or Edge
SET BROWSER_EXE=
IF EXIST "C:\Program Files\Google\Chrome\Application\chrome.exe" SET "BROWSER_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
IF EXIST "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" SET "BROWSER_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
IF EXIST "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" SET "BROWSER_EXE=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
IF EXIST "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" SET "BROWSER_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
IF EXIST "C:\Program Files\Microsoft\Edge\Application\msedge.exe" SET "BROWSER_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

IF "%BROWSER_EXE%"=="" (
    ECHO [WARNING] Neither Chrome nor Edge detected. Opening with default system browser...
    START "" "%TARGET_URL%"
    EXIT /B 0
)

ECHO [OK] Browser: "%BROWSER_EXE%"
ECHO [OK] Kiosk Flags: --kiosk --kiosk-printing (No Print Dialogs)
ECHO.

START "" "%BROWSER_EXE%" --app="%TARGET_URL%" --kiosk --kiosk-printing --disable-pinch --overscroll-history-navigation=0 --user-data-dir="%POS_DATA_DIR%"

EXIT /B 0
