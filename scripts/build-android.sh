#!/usr/bin/env bash
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-$HOME/.local/jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export NDK_HOME="${NDK_HOME:-$ANDROID_HOME/ndk/27.2.12479018}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

cd "$(dirname "$0")/.."
source "$HOME/.cargo/env"

echo "→ Building thepdf.ink Android APK..."
npx tauri android build

APK_DIR="src-tauri/gen/android/app/build/outputs/apk"
mkdir -p releases
find "$APK_DIR" -name "*.apk" -exec cp {} releases/ \;

echo "✓ Android APK(s) copied to releases/"
ls -lh releases/*.apk 2>/dev/null || true