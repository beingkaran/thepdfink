#!/usr/bin/env bash
set -euo pipefail

# Adds the CAMERA permission that the Scan-to-PDF tool needs on Android.
# `tauri android init` regenerates gen/android, so this runs *after* init and is
# idempotent (no-ops if the permission is already declared).

cd "$(dirname "$0")/.."

MANIFEST="src-tauri/gen/android/app/src/main/AndroidManifest.xml"
if [ ! -f "$MANIFEST" ]; then
  echo "⚠ No AndroidManifest.xml — run 'npm run tauri:android:init' first."
  exit 0
fi

if grep -q 'android.permission.CAMERA' "$MANIFEST"; then
  echo "✓ Camera permission already present in $MANIFEST"
  exit 0
fi

tmp="$(mktemp)"
awk '
  /<manifest[^>]*>/ && !done {
    print
    print "    <uses-permission android:name=\"android.permission.CAMERA\" />"
    print "    <uses-feature android:name=\"android.hardware.camera\" android:required=\"false\" />"
    done = 1
    next
  }
  { print }
' "$MANIFEST" > "$tmp" && mv "$tmp" "$MANIFEST"

if grep -q 'android.permission.CAMERA' "$MANIFEST"; then
  echo "✓ Added CAMERA permission to $MANIFEST"
else
  echo "⚠ Could not auto-insert the CAMERA permission. Add this inside <manifest> manually:"
  echo '    <uses-permission android:name="android.permission.CAMERA" />'
fi
