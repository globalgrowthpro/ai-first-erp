$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetBat = Join-Path $scriptDir "START-POS-OFFLINE.bat"
$iconPath = Join-Path $scriptDir "wazeer-brand-pos.ico"

# Check standard desktop locations (including OneDrive redirected desktop)
$desktopPaths = @(
    [System.Environment]::GetFolderPath("Desktop"),
    (Join-Path $env:USERPROFILE "OneDrive\Desktop"),
    (Join-Path $env:USERPROFILE "Desktop")
) | Select-Object -Unique

$shortcutName = "Wazeer-POS-Offline.lnk"

foreach ($desk in $desktopPaths) {
    if (Test-Path $desk) {
        $shortcutFile = Join-Path $desk $shortcutName
        
        # Remove old cached shortcut file if present
        if (Test-Path $shortcutFile) {
            Remove-Item -Path $shortcutFile -Force -ErrorAction SilentlyContinue
        }

        $ws = New-Object -ComObject WScript.Shell
        $shortcut = $ws.CreateShortcut($shortcutFile)
        $shortcut.TargetPath = $targetBat
        $shortcut.WorkingDirectory = $scriptDir
        $shortcut.Description = "Wazeer El-Helw - POS Offline Terminal"

        if (Test-Path $iconPath) {
            $shortcut.IconLocation = "$iconPath,0"
        }

        $shortcut.Save()

        # Also update Excel folder shortcut description
        $excelFolder = Join-Path $desk "فواتير ورديات الكاشير - وزير الحلو"
        $excelShortcutFile = Join-Path $desk "Wazeer-Cashier-Excel-Reports.lnk"
        if (Test-Path $excelFolder) {
            $sc2 = $ws.CreateShortcut($excelShortcutFile)
            $sc2.TargetPath = "explorer.exe"
            $sc2.Arguments = "`"$excelFolder`""
            $sc2.WorkingDirectory = $excelFolder
            $sc2.Description = "Wazeer El-Helw - Cashier Shift Excel Reports"
            $sc2.Save()
        }

        if (Test-Path $shortcutFile) {
            Write-Host "[SUCCESS] Created POS shortcut at: $shortcutFile" -ForegroundColor Green
        }
    }
}

# Force Windows Explorer to flush icon cache and repaint desktop icons
try {
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class ShellNotifier {
        [DllImport("shell32.dll")]
        public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
    }
"@
    # 0x08000000 = SHCNE_ASSOCCHANGED
    [ShellNotifier]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
    Write-Host "[SUCCESS] Flushed Windows icon cache." -ForegroundColor Cyan
} catch {
    # Non-critical fallback
    ie4uinit.exe -show 2>$null
}
