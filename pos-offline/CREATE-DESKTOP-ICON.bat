@echo off
TITLE Hafez ERP - Create POS Offline Desktop Shortcut
COLOR 0A
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-desktop-shortcut.ps1"
ECHO.
PAUSE
