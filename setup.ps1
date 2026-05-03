#Requires -Version 5.1
<#
.SYNOPSIS
    Maestro - Automated Setup Script for Windows
.DESCRIPTION
    This script automatically checks prerequisites, installs dependencies,
    and prepares the development environment for Maestro.
    Run this script in PowerShell as Administrator if you need to install tools.
.EXAMPLE
    .\setup.ps1
#>

#Requires -Version 5.1

# Fix encoding for Unicode characters in Windows PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
try { chcp 65001 | Out-Null } catch {}

$ErrorActionPreference = "Stop"

Write-Host @"
==============================================================
              Maestro - Setup Wizard
       Tauri + Next.js + Rust Development Environment
==============================================================
"@ -ForegroundColor Cyan

# ─── Configuration ───────────────────────────────────────────
$RequiredNodeVersion = [Version]"20.0.0"
$RequiredRustVersion = [Version]"1.70.0"

# ─── Helper Functions ────────────────────────────────────────
function Test-CommandExists {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

function Get-NodeVersion {
    try {
        $v = node --version 2>$null
        return [Version]($v -replace '^v','')
    } catch { return $null }
}

function Get-RustVersion {
    try {
        $v = rustc --version 2>$null
        if ($v -match '(\d+\.\d+\.\d+)') {
            return [Version]$matches[1]
        }
        return $null
    } catch { return $null }
}

# ─── Step 1: Check Node.js ───────────────────────────────────
Write-Host "`n[1/5] Checking Node.js..." -ForegroundColor Yellow
$nodeVer = Get-NodeVersion
if (-not $nodeVer) {
    Write-Host "   [FAIL] Node.js not found!" -ForegroundColor Red
    Write-Host "   -> Please install Node.js >= 20 from https://nodejs.org/"
    exit 1
} elseif ($nodeVer -lt $RequiredNodeVersion) {
    Write-Host "   [!] Node.js $nodeVer found, but >= $RequiredNodeVersion required!" -ForegroundColor Red
    Write-Host "   -> Please upgrade Node.js from https://nodejs.org/"
    exit 1
} else {
    Write-Host "   [OK] Node.js $nodeVer" -ForegroundColor Green
}

# ─── Step 2: Check Rust ──────────────────────────────────────
Write-Host "`n[2/5] Checking Rust..." -ForegroundColor Yellow
$rustVer = Get-RustVersion
if (-not $rustVer) {
    Write-Host "   [FAIL] Rust not found!" -ForegroundColor Red
    Write-Host "   -> Install Rust: https://rustup.rs/"
    Write-Host "   -> Or run: winget install Rustlang.Rustup"
    exit 1
} elseif ($rustVer -lt $RequiredRustVersion) {
    Write-Host "   [!] Rust $rustVer found, but >= $RequiredRustVersion required!" -ForegroundColor Red
    Write-Host "   -> Run: rustup update"
    exit 1
} else {
    Write-Host "   [OK] Rust $rustVer" -ForegroundColor Green
}

# ─── Step 3: Check Tauri Prerequisites ───────────────────────
Write-Host "`n[3/5] Checking Tauri build dependencies..." -ForegroundColor Yellow

function Test-MSVCInstalled {
    # Method 1: Check via vswhere (official VS locator)
    $vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vsWhere) {
        $hasCPP = & $vsWhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property InstallationPath 2>$null
        if ($hasCPP) { return $true }
    }

    # Method 2: Check for cl.exe in common MSVC paths
    $programFiles = @(${env:ProgramFiles}, ${env:ProgramFiles(x86)})
    foreach ($pf in $programFiles) {
        $msvcPath = Join-Path $pf "Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC"
        if (Test-Path $msvcPath) {
            $versions = Get-ChildItem $msvcPath -Directory -ErrorAction SilentlyContinue
            foreach ($ver in $versions) {
                $clPath = Join-Path $ver.FullName "bin\Hostx64\x64\cl.exe"
                if (Test-Path $clPath) { return $true }
                $clPath = Join-Path $ver.FullName "bin\Hostx86\x86\cl.exe"
                if (Test-Path $clPath) { return $true }
            }
        }
        # VS 2019 paths
        $msvcPath = Join-Path $pf "Microsoft Visual Studio\2019\BuildTools\VC\Tools\MSVC"
        if (Test-Path $msvcPath) {
            $versions = Get-ChildItem $msvcPath -Directory -ErrorAction SilentlyContinue
            foreach ($ver in $versions) {
                $clPath = Join-Path $ver.FullName "bin\Hostx64\x64\cl.exe"
                if (Test-Path $clPath) { return $true }
            }
        }
    }

    # Method 3: Check if rustc can actually compile (real test)
    try {
        $testCode = "fn main(){}"
        $tempFile = [System.IO.Path]::GetTempFileName() + ".rs"
        Set-Content -Path $tempFile -Value $testCode -NoNewline
        $null = & rustc $tempFile -o "$tempFile.exe" 2>&1
        $success = $LASTEXITCODE -eq 0
        Remove-Item $tempFile -ErrorAction SilentlyContinue
        Remove-Item "$tempFile.exe" -ErrorAction SilentlyContinue
        return $success
    } catch { return $false }
}

$hasMSVC = Test-MSVCInstalled
$hasClang = Test-CommandExists "clang"

if (-not $hasMSVC -and -not $hasClang) {
    Write-Host "   [!] No C++ compiler found (MSVC or Clang)" -ForegroundColor Yellow
    Write-Host "   -> Install Visual Studio Build Tools:"
    Write-Host "      https://visualstudio.microsoft.com/visual-cpp-build-tools/"
    Write-Host "      Select: 'Desktop development with C++' workload"
    Write-Host ""
    Write-Host "   [TIP] If you already installed it, run this script from"
    Write-Host "      'Developer PowerShell for VS 2022' instead." -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "   Continue anyway? (y/n)"
    if ($continue -ne 'y') { exit 1 }
} else {
    if ($hasMSVC) { Write-Host "   [OK] MSVC (Visual C++ Build Tools) found" -ForegroundColor Green }
    if ($hasClang) { Write-Host "   [OK] Clang found" -ForegroundColor Green }
}

# ─── Step 4: Install Node Dependencies ───────────────────────
Write-Host "`n[4/5] Installing Node.js dependencies..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    npm ci
} else {
    npm install
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "   [FAIL] npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "   [OK] npm dependencies installed" -ForegroundColor Green

# Check Tauri CLI is available
$tauriCli = Join-Path $PWD "node_modules\.bin\tauri.cmd"
if (-not (Test-Path $tauriCli)) {
    Write-Host "   [!] Tauri CLI not found, installing..." -ForegroundColor Yellow
    npm install -D @tauri-apps/cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   [FAIL] Failed to install Tauri CLI" -ForegroundColor Red
        Write-Host "   -> Run manually: npm install -D @tauri-apps/cli" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [OK] Tauri CLI ready" -ForegroundColor Green
}

# ─── Step 5: Setup Environment ───────────────────────────────
Write-Host "`n[5/5] Setting up environment..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "   [OK] Created .env from .env.example" -ForegroundColor Green
    Write-Host "   [!] Please edit .env and add your GEMINI_API_KEY!" -ForegroundColor Yellow
} else {
    Write-Host "   [OK] .env already exists" -ForegroundColor Green
}

# ─── Summary ─────────────────────────────────────────────────
Write-Host @"

==============================================================
                 [OK] Setup Complete!
==============================================================

   >> Quick Start Commands:
   ------------------------------------------------------------
   npm run dev              -> Run web-only dev server
   npm run tauri dev        -> Run full desktop app
   npm run tauri build      -> Build production app

   [FILE] Important Files:
   ------------------------------------------------------------
   .env                     -> Add your GEMINI_API_KEY here
   src-tauri/tauri.conf.json -> App window & security config

   [HELP] Need Help?
   ------------------------------------------------------------
   See README.md -> Troubleshooting section
   https://github.com/pdong15dth/maestro#troubleshooting

"@ -ForegroundColor Cyan
