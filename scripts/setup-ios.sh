#!/usr/bin/env bash
set -euo pipefail

echo "→ Installing CocoaPods (if needed)..."
if ! command -v pod >/dev/null 2>&1; then
  brew install cocoapods
fi

echo "→ Initializing Tauri iOS project..."
cd "$(dirname "$0")/.."
source "$HOME/.cargo/env"
npx tauri ios init

echo "→ Adding camera + photo permissions (for Scan to PDF)..."
bash scripts/patch-ios-permissions.sh

echo "✓ iOS environment ready."
echo "  Set your Apple team ID in src-tauri/tauri.conf.json under bundle.iOS.developmentTeam"
echo "  Then build with: npm run tauri:ios:build"