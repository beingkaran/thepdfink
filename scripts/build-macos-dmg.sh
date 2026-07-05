#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
source "$HOME/.cargo/env"

echo "→ Building thepdf.ink macOS DMG..."
npx tauri build --bundles dmg

DMG="src-tauri/target/release/bundle/dmg/thepdf.ink_1.0.0_aarch64.dmg"
mkdir -p releases
cp "$DMG" releases/

echo "✓ DMG ready: releases/thepdf.ink_1.0.0_aarch64.dmg"
open releases/