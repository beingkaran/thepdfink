#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
source "$HOME/.cargo/env"

export PATH="/opt/homebrew/opt/llvm/bin:$PATH"

echo "→ Checking Windows build prerequisites..."
command -v makensis >/dev/null || brew install nsis
command -v llvm-rc >/dev/null || brew install llvm
rustup target add x86_64-pc-windows-msvc
command -v cargo-xwin >/dev/null || cargo install --locked cargo-xwin

echo "→ Building thepdf.ink Windows installer (NSIS)..."
npx tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc --bundles nsis

NSIS_DIR="src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis"
mkdir -p releases
find "$NSIS_DIR" -name "*.exe" -exec cp {} releases/thepdf.ink_1.0.0_x64-setup.exe \;

echo "✓ Windows installer: releases/thepdf.ink_1.0.0_x64-setup.exe"
ls -lh releases/*setup*.exe 2>/dev/null || true