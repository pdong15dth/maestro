# Maestro - Task Runner
# Install `just`: https://github.com/casey/just
# Or use: cargo install just

# Default task - show help
_default:
    @just --list

# ─── Development ─────────────────────────────────────────────

# Run Next.js dev server (web only, no Tauri)
dev:
    npm run dev

# Run full Tauri desktop app in dev mode
tauri:
    npm run tauri dev

# Run with HMR disabled (useful when AI agents edit files)
dev-no-hmr:
    $env:DISABLE_HMR="true"; npm run dev

# ─── Building ────────────────────────────────────────────────

# Build Next.js static export
build-web:
    npm run build

# Build production desktop app for current platform
build:
    npm run tauri build

# Clean build artifacts
clean:
    npm run clean
    if (Test-Path "src-tauri/target") { Remove-Item -Recurse -Force "src-tauri/target" }
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }

# ─── Code Quality ────────────────────────────────────────────

# Run ESLint
lint:
    npm run lint

# Format check (requires prettier)
format-check:
    npx prettier --check "**/*.{ts,tsx,json,md}"

# Format all files
format:
    npx prettier --write "**/*.{ts,tsx,json,md}"

# Type check TypeScript
typecheck:
    npx tsc --noEmit

# ─── Environment ─────────────────────────────────────────────

# Create .env from template
setup-env:
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env - please edit and add your GEMINI_API_KEY" -ForegroundColor Cyan
    } else {
        Write-Host ".env already exists" -ForegroundColor Green
    }

# Run automated setup (Windows)
setup:
    powershell -ExecutionPolicy Bypass -File .\setup.ps1

# ─── Utilities ───────────────────────────────────────────────

# Update all dependencies
update:
    npm update
    cd src-tauri; cargo update

# Check versions of all tools
versions:
    Write-Host "Node:    $(node --version)"
    Write-Host "npm:     v$(npm --version)"
    Write-Host "Rust:    $(rustc --version)"
    Write-Host "Cargo:   $(cargo --version)"
    Write-Host "Tauri:   $(npm list @tauri-apps/cli --depth=0 2>$null || Write-Host 'Not installed globally')"
