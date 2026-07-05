#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

# thepdf.ink Linux build.
#
# Tauri on Linux needs the WebKitGTK/GTK development headers. On Debian/Ubuntu:
#   sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
#     libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
# See https://tauri.app/start/prerequisites/ for Fedora/Arch equivalents.

echo "→ Building thepdf.ink for Linux (AppImage + .deb + .rpm)..."
npx tauri build --bundles deb,rpm,appimage

BUNDLE_DIR="src-tauri/target/release/bundle"
mkdir -p releases

# Copy whatever Linux artifacts were produced.
find "$BUNDLE_DIR/appimage" -name '*.AppImage' -exec cp {} releases/ \; 2>/dev/null || true
find "$BUNDLE_DIR/deb" -name '*.deb' -exec cp {} releases/ \; 2>/dev/null || true
find "$BUNDLE_DIR/rpm" -name '*.rpm' -exec cp {} releases/ \; 2>/dev/null || true

echo "✓ Linux packages copied to releases/:"
ls -1 releases/ | grep -Ei '\.(AppImage|deb|rpm)$' || echo "  (none found — check the build log above)"
