# Build thepdf.ink on Windows 10/11
# Run in PowerShell: .\scripts\build-windows.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "-> Building thepdf.ink Windows installer..." -ForegroundColor Cyan
npm run build
npx tauri build --bundles nsis

$nsisDir = "src-tauri\target\release\bundle\nsis"
New-Item -ItemType Directory -Force -Path releases | Out-Null
Get-ChildItem $nsisDir -Filter "*.exe" | ForEach-Object {
    Copy-Item $_.FullName "releases\thepdf.ink_1.0.0_x64-setup.exe"
}

Write-Host "✓ Windows installer ready: releases\thepdf.ink_1.0.0_x64-setup.exe" -ForegroundColor Green