@echo off
CHCP 65001 >nul
TITLE وزير الحلو — معاينة واجهات نقطة البيع بدون خادم
COLOR 0B

SET SCRIPT_DIR=%~dp0
SET PREVIEW_FILE=%SCRIPT_DIR%preview.html

ECHO [سلسلة حلويات وزير الحلو] فتح واجهات الـ POS Offline التفاعلية...
START "" "file:///%PREVIEW_FILE:\=/%"
EXIT /B 0
