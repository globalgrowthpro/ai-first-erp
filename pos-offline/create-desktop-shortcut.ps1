$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetBat = Join-Path $scriptDir "START-POS-OFFLINE.bat"
$iconPath = Join-Path $scriptDir "pos-icon.ico"
$desktopPath = [System.Environment]::GetFolderPath("Desktop")

# Create standard Windows desktop shortcut
$shortcutName = "Wazeer-POS-Offline.lnk"
$shortcutFile = Join-Path $desktopPath $shortcutName

$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($shortcutFile)
$shortcut.TargetPath = $targetBat
$shortcut.WorkingDirectory = $scriptDir
$shortcut.Description = "Wazeer El-Helw - POS Offline Terminal"

if (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
}

$shortcut.Save()

if (Test-Path $shortcutFile) {
    Write-Host "`n[SUCCESS] Desktop shortcut created successfully at:" -ForegroundColor Green
    Write-Host ">> $shortcutFile" -ForegroundColor Cyan
    Write-Host "You can now double-click the icon on your desktop to launch the POS terminal!`n" -ForegroundColor Green
}
