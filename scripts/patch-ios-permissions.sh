#!/usr/bin/env bash
set -euo pipefail

# Adds the camera + photo-library usage descriptions that the Scan-to-PDF tool
# needs on iOS. `tauri ios init` regenerates gen/apple, so this runs *after* init
# (and is safe to re-run — it Sets if present, Adds if missing).

cd "$(dirname "$0")/.."

CAM_MSG="thepdf.ink uses the camera only to scan documents into a PDF on your device. Photos are processed locally and never uploaded."
PHOTO_MSG="thepdf.ink accesses photos only to add images you pick into a PDF on your device. Nothing is uploaded."
PB=/usr/libexec/PlistBuddy

shopt -s nullglob
found=0
for plist in src-tauri/gen/apple/*/Info.plist; do
  [ -f "$plist" ] || continue
  found=1
  "$PB" -c "Set :NSCameraUsageDescription $CAM_MSG" "$plist" 2>/dev/null \
    || "$PB" -c "Add :NSCameraUsageDescription string $CAM_MSG" "$plist"
  "$PB" -c "Set :NSPhotoLibraryUsageDescription $PHOTO_MSG" "$plist" 2>/dev/null \
    || "$PB" -c "Add :NSPhotoLibraryUsageDescription string $PHOTO_MSG" "$plist"
  echo "✓ Camera + photo permissions set in $plist"
done

if [ "$found" -eq 0 ]; then
  echo "⚠ No iOS Info.plist found under src-tauri/gen/apple — run 'npm run tauri:ios:init' first."
fi
