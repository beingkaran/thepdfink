#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
source "$HOME/.cargo/env"

echo "→ Building thepdf.ink for iOS Simulator..."
npx tauri ios build --target aarch64-sim --no-sign

APP="src-tauri/gen/apple/build/arm64-sim/thepdf.ink.app"
mkdir -p releases
ditto -c -k --sequesterRsrc --keepParent "$APP" releases/thepdf.ink_1.0.0_ios_simulator.zip

echo "✓ iOS simulator build: releases/thepdf.ink_1.0.0_ios_simulator.zip"
echo "  For a device IPA, set bundle.iOS.developmentTeam in tauri.conf.json and run:"
echo "  npx tauri ios build"