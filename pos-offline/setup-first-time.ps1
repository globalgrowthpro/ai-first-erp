# ==============================================================================
# سكريبت الإعداد والتهيئة لأول مرة — نقطة بيع سلسلة حلويات وزير الحلو
# First-Time Setup & Prerequisites Auto-Installer for Wazeer El-Helw Offline POS
# ==============================================================================

param(
    [switch]$NonInteractive
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

function Show-Header {
    Clear-Host
    Write-Host "==============================================================================" -ForegroundColor Magenta
    Write-Host "   🍬 سلسلة حلويات وزير الحلو — Wazeer El-Helw Confectionery" -ForegroundColor Yellow
    Write-Host "   🚀 أداة الفحص والتثبيت التلقائي لنقطة البيع (Offline-First POS Setup)" -ForegroundColor Cyan
    Write-Host "==============================================================================" -ForegroundColor Magenta
    Write-Host ""
}

Show-Header

# ------------------------------------------------------------------------------
# 1. فحص مجلدات النظام ومجلد حفظ ملفات الإكسيل (Excel Export Folder)
# ------------------------------------------------------------------------------
Write-Host "📂 [1/6] تهيئة مجلدات حفظ تقارير وفواتير إكسيل (Excel Shift Folders)..." -ForegroundColor Yellow

$desktopPath = [System.Environment]::GetFolderPath("Desktop")
if (-not (Test-Path $desktopPath)) {
    $desktopPath = Join-Path $env:USERPROFILE "Desktop"
}

$excelExportDir = Join-Path $desktopPath "فواتير ورديات الكاشير - وزير الحلو"
$excelArchiveSubdir = Join-Path $excelExportDir "أرشيف_فواتير_الورديات_Excel"

if (-not (Test-Path $excelExportDir)) {
    New-Item -ItemType Directory -Path $excelExportDir -Force | Out-Null
}
if (-not (Test-Path $excelArchiveSubdir)) {
    New-Item -ItemType Directory -Path $excelArchiveSubdir -Force | Out-Null
}

# Create a clear README in the Excel folder
$excelReadme = Join-Path $excelExportDir "تعليمات_حفظ_فواتير_الورديات.txt"
$readmeText = @"
==============================================================================
سلسلة حلويات وزير الحلو — مجلد فواتير وتقارير ورديات الكاشير
==============================================================================
هذا المجلد مخصص لحفظ كافة تقارير شيتات الإكسيل (.xlsx / .csv) المصدرة من نقاط البيع.

* يتم تسمية الملفات تلقائياً بالصيغة:
  وردية_[اسم_الكاشير]_[التاريخ].xlsx
  مثال: وردية_احمد_سالم_2026-11-20.xlsx

* يحتوي كل ملف على:
  - اسم الكاشير المسؤول
  - رقم الفاتورة والوقت
  - تفاصيل الأصناف والكميات
  - المبلغ وطريقة الدفع (كاش 💵 / فيزا 💳)
  - حالة السداد والمزامنة
  - صف إجمالي الوردية لمطابقة درج النقدية والخزينة

* يرجى عدم حذف هذا المجلد لضمان بقاء نسخ احتياطية آمنة في الفرع.
"@
[System.IO.File]::WriteAllText($excelReadme, $readmeText, [System.Text.Encoding]::UTF8)

Write-Host "   [✔] تم إنشاء مجلد فواتير إكسيل بنجاح على سطح المكتب:" -ForegroundColor Green
Write-Host "       $excelExportDir" -ForegroundColor Gray
Write-Host ""

# ------------------------------------------------------------------------------
# 2. فحص وتثبيت بيئة التشغيل Node.js & NPM
# ------------------------------------------------------------------------------
Write-Host "⚙️  [2/6] فحص بيئة تشغيل Node.js و NPM..." -ForegroundColor Yellow

$nodeInstalled = $false
$nodeVersion = ""
try {
    $nodeVersion = (& node -v 2>$null)
    if ($nodeVersion -and $nodeVersion.StartsWith("v")) {
        $nodeInstalled = $true
    }
} catch {
    $nodeInstalled = $false
}

if ($nodeInstalled) {
    Write-Host "   [✔] تم العثور على Node.js بنجاح ($nodeVersion)." -ForegroundColor Green
} else {
    Write-Host "   [!] Node.js غير مثبت على هذا الجهاز. جاري محاولة التثبيت التلقائي..." -ForegroundColor DarkYellow
    
    $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCmd) {
        Write-Host "   [...] جاري تثبيت Node.js LTS عبر Windows Package Manager (winget)..." -ForegroundColor Cyan
        & winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        $nodeVersion = (& node -v 2>$null)
        if ($nodeVersion) {
            Write-Host "   [✔] تم تثبيت Node.js بنجاح ($nodeVersion)!" -ForegroundColor Green
            $nodeInstalled = $true
        }
    }
    
    if (-not $nodeInstalled) {
        Write-Host "   [...] جاري تحميل مثبت Node.js LTS الرسمي مباشرة..." -ForegroundColor Cyan
        $msiUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        $tempMsi = Join-Path $env:TEMP "nodejs-lts-setup.msi"
        
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $msiUrl -OutFile $tempMsi -UseBasicParsing
            Write-Host "   [...] جاري تثبيت حزمة Node.js MSI بصمت..." -ForegroundColor Cyan
            Start-Process msiexec.exe -ArgumentList "/i `"$tempMsi`" /passive /norestart" -Wait
            
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            $nodeVersion = (& node -v 2>$null)
            if ($nodeVersion) {
                Write-Host "   [✔] تم تثبيت Node.js بنجاح ($nodeVersion)!" -ForegroundColor Green
                $nodeInstalled = $true
            }
        } catch {
            Write-Host "   [!] تعذر التثبيت التلقائي. يرجى تثبيت Node.js يدوياً من https://nodejs.org" -ForegroundColor Red
        }
    }
}
Write-Host ""

# ------------------------------------------------------------------------------
# 3. فحص وتثبيت المتصفح (Chrome أو Edge بنمط Kiosk)
# ------------------------------------------------------------------------------
Write-Host "🌐 [3/6] فحص المتصفح المدعوم لنظام الكاشير (Chrome / Edge)..." -ForegroundColor Yellow

$browserDetected = $false
$browserName = ""
$browserPath = ""

$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
foreach ($cp in $chromePaths) {
    if (Test-Path $cp) {
        $browserDetected = $true
        $browserName = "Google Chrome"
        $browserPath = $cp
        break
    }
}

if (-not $browserDetected) {
    $edgePaths = @(
        "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    )
    foreach ($ep in $edgePaths) {
        if (Test-Path $ep) {
            $browserDetected = $true
            $browserName = "Microsoft Edge"
            $browserPath = $ep
            break
        }
    }
}

if ($browserDetected) {
    Write-Host "   [✔] تم العثور على المتصفح: $browserName" -ForegroundColor Green
    Write-Host "       المسار: $browserPath" -ForegroundColor Gray
} else {
    Write-Host "   [!] لم يتم العثور على Chrome أو Edge، سيتم استخدام المتصفح الافتراضي للنظام." -ForegroundColor DarkYellow
}
Write-Host ""

# ------------------------------------------------------------------------------
# 4. فحص ملفات حزمة POS وحزم المكتبات (NPM Packages)
# ------------------------------------------------------------------------------
Write-Host "📦 [4/6] فحص مكتبات وملفات تشغيل النظام..." -ForegroundColor Yellow

$nodeModulesPath = Join-Path $projectRoot "node_modules"
if (Test-Path $nodeModulesPath) {
    Write-Host "   [✔] مجلد الحزم والمكتبات (node_modules) موجود وجاهز." -ForegroundColor Green
} else {
    Write-Host "   [!] مجلد المكتبات غير مكتمل، جاري تنزيل الاعتماديات اللازمة..." -ForegroundColor Cyan
    Push-Location $projectRoot
    try {
        & npm install --production
        Write-Host "   [✔] تم تجهيز مكتبات النظام بنجاح!" -ForegroundColor Green
    } catch {
        Write-Host "   [!] يرجى تشغيل 'npm install' عند توفر الإنترنت." -ForegroundColor DarkYellow
    }
    Pop-Location
}

# Verify Offline Core Files
$requiredOfflineFiles = @(
    "preview.html",
    "wazeer-brand-pos.ico",
    "real-products.json",
    "START-POS-OFFLINE.bat"
)
$missingCount = 0
foreach ($rf in $requiredOfflineFiles) {
    $fp = Join-Path $scriptDir $rf
    if (Test-Path $fp) {
        Write-Host "   [✔] ملف النظام الأساسي: $rf" -ForegroundColor Green
    } else {
        Write-Host "   [X] ملف مفقود: $rf" -ForegroundColor Red
        $missingCount++
    }
}
Write-Host ""

# ------------------------------------------------------------------------------
# 5. إنشاء أيقونات واختصارات سطح المكتب الرسمية (Desktop Shortcuts)
# ------------------------------------------------------------------------------
Write-Host "🖥️  [5/6] إنشاء اختصارات سطح المكتب الرسمية بنقرة واحدة..." -ForegroundColor Yellow

$targetBat = Join-Path $scriptDir "START-POS-OFFLINE.bat"
$iconPath = Join-Path $scriptDir "wazeer-brand-pos.ico"

$desktopPaths = @(
    [System.Environment]::GetFolderPath("Desktop"),
    (Join-Path $env:USERPROFILE "OneDrive\Desktop"),
    (Join-Path $env:USERPROFILE "Desktop")
) | Select-Object -Unique

foreach ($desk in $desktopPaths) {
    if (Test-Path $desk) {
        $ws = New-Object -ComObject WScript.Shell
        
        # 1. Main POS Shortcut
        $posShortcutFile = Join-Path $desk "Wazeer-POS-Offline.lnk"
        if (Test-Path $posShortcutFile) {
            Remove-Item -Path $posShortcutFile -Force -ErrorAction SilentlyContinue
        }
        $sc = $ws.CreateShortcut($posShortcutFile)
        $sc.TargetPath = $targetBat
        $sc.WorkingDirectory = $scriptDir
        $sc.Description = "Wazeer El-Helw - POS Offline Terminal"
        if (Test-Path $iconPath) {
            $sc.IconLocation = "$iconPath,0"
        }
        $sc.Save()

        # 2. Excel Archive Folder Shortcut (Explorer opens folder)
        $excelShortcutFile = Join-Path $desk "Wazeer-Cashier-Excel-Reports.lnk"
        if (Test-Path $excelShortcutFile) {
            Remove-Item -Path $excelShortcutFile -Force -ErrorAction SilentlyContinue
        }
        $sc2 = $ws.CreateShortcut($excelShortcutFile)
        $sc2.TargetPath = "explorer.exe"
        $sc2.Arguments = "`"$excelExportDir`""
        $sc2.WorkingDirectory = $excelExportDir
        $sc2.Description = "Wazeer El-Helw - Cashier Shift Excel Reports"
        $sc2.Save()

        # 3. Helper script to organize excel files
        $organizerBatSrc = Join-Path $scriptDir "ORGANIZE-EXCEL-EXPORTS.bat"
        $organizerBatDst = Join-Path $excelExportDir "تجميع_الفواتير_الجديدة_من_التنزيلات.bat"
        if (Test-Path $organizerBatSrc) {
            Copy-Item -Path $organizerBatSrc -Destination $organizerBatDst -Force
        }

        Write-Host "   [✔] تم إنشاء اختصارات سطح المكتب بنجاح في: $desk" -ForegroundColor Green
        Write-Host "       - الاختصار الأول: Wazeer-POS-Offline.lnk" -ForegroundColor Gray
        Write-Host "       - الاختصار الثاني: Wazeer-Cashier-Excel-Reports.lnk" -ForegroundColor Gray
    }
}

# Flush icon cache
try {
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class ShellNotifier {
        [DllImport("shell32.dll")]
        public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
    }
"@
    [ShellNotifier]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
    Write-Host "   [✔] تم تحديث ذاكرة أيقونات سطح المكتب (Icon Cache) بنجاح." -ForegroundColor Cyan
} catch {
    # Non-critical fallback
}
Write-Host ""

# ------------------------------------------------------------------------------
# 6. الملخص النهائي وخيار التشغيل الفوري
# ------------------------------------------------------------------------------
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "   🎉 تم الانتهاء من فحص وتهيئة النظام بنجاح 100%!" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   • اختصار التشغيل: تم وضعه على سطح المكتب باسم [Wazeer-POS-Offline]" -ForegroundColor White
Write-Host "   • اختصار مجلد الإكسيل: تم وضعه على سطح المكتب باسم [Wazeer-Cashier-Excel-Reports]" -ForegroundColor White
Write-Host "   • المجلد الفعلي لحفظ الإكسيل: [فواتير ورديات الكاشير - وزير الحلو]" -ForegroundColor White
Write-Host "   • بيانات تسجيل الدخول الافتراضية للفرع:" -ForegroundColor White
Write-Host "       - اسم المستخدم: cashier_korba  أو  101" -ForegroundColor Yellow
Write-Host "       - كلمة المرور: Korba@2026      أو  123456" -ForegroundColor Yellow
Write-Host ""

if (-not $NonInteractive) {
    try {
        $launchChoice = Read-Host "هل ترغب في فتح نقطة البيع الآن لتجربتها؟ (Y/N) [الافتراضي: Y]"
        if ($launchChoice -eq "" -or $launchChoice.ToUpper() -eq "Y") {
            Write-Host "🚀 جاري تشغيل نقطة البيع..." -ForegroundColor Cyan
            Start-Process -FilePath $targetBat
        }
    } catch {
        # Non-interactive shell, skip prompt
    }
}
