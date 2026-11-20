@echo off
REM ==============================================================================
REM   🍬 تجميع ونقل تقارير فواتير ورديات الكاشير من Downloads إلى مجلد الأرشيف
REM ==============================================================================

chcp 65001 >nul
TITLE [وزير الحلو] - تجميع فواتير ورديات الكاشير (Excel)
COLOR 0B

SET "DOWNLOADS_DIR=%USERPROFILE%\Downloads"
SET "TARGET_DIR=%USERPROFILE%\Desktop\فواتير ورديات الكاشير - وزير الحلو\أرشيف_فواتير_الورديات_Excel"

ECHO.
ECHO ==============================================================================
ECHO   🍬 سلسلة حلويات وزير الحلو — تجميع وأرشفة فواتير الورديات (Excel)
ECHO ==============================================================================
ECHO.
ECHO جاري البحث عن ملفات (وردية_*.xlsx) و (وردية_*.csv) في مجلد التنزيلات...
ECHO.

IF NOT EXIST "%TARGET_DIR%" (
    MKDIR "%TARGET_DIR%"
)

SET /A MOVED_COUNT=0

FOR %%F IN ("%DOWNLOADS_DIR%\وردية_*.xlsx" "%DOWNLOADS_DIR%\وردية_*.csv" "%DOWNLOADS_DIR%\shift_*.xlsx") DO (
    IF EXIST "%%F" (
        MOVE /Y "%%F" "%TARGET_DIR%\" >nul
        ECHO [✔] تم نقل الملف: %%~nxF
        SET /A MOVED_COUNT+=1
    )
)

ECHO.
IF %MOVED_COUNT% GTR 0 (
    COLOR 0A
    ECHO  [SUCCESS] تم أرشفة %MOVED_COUNT% ملف فاتورة إكسيل بنجاح داخل:
    ECHO  "%TARGET_DIR%"
) ELSE (
    ECHO  [INFO] لا توجد ملفات جديدة في التنزيلات تحتاج للنقل.
    ECHO  المجلد الحالي يحتوي على كافة الفواتير المؤرشفة.
)

ECHO.
ECHO جاري فتح مجلد الفواتير الآن...
START "" "%TARGET_DIR%"
TIMEOUT /T 3 >nul
EXIT /B 0
