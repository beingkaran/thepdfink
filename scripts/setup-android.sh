#!/usr/bin/env bash
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-$HOME/.local/jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export NDK_HOME="${NDK_HOME:-$ANDROID_HOME/ndk/27.2.12479018}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

if [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "→ Installing portable JDK 21..."
  mkdir -p "$HOME/.local/jdk"
  curl -L "https://api.adoptium.net/v3/binary/latest/21/ga/mac/aarch64/jdk/hotspot/normal/eclipse?project=jdk" -o /tmp/temurin21.tar.gz
  tar -xzf /tmp/temurin21.tar.gz -C "$HOME/.local/jdk" --strip-components=0
  export JAVA_HOME="$HOME/.local/jdk/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "→ Installing Android command line tools (if needed)..."
if ! command -v sdkmanager >/dev/null 2>&1; then
  brew install --cask android-commandlinetools
fi

mkdir -p "$ANDROID_HOME/cmdline-tools/latest"
if [ ! -f "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "Link Android SDK to $ANDROID_HOME"
  ln -sf /opt/homebrew/share/android-commandlinetools/cmdline-tools/latest "$ANDROID_HOME/cmdline-tools/latest" 2>/dev/null || true
fi

echo "→ Accepting SDK licenses..."
yes | sdkmanager --licenses >/dev/null 2>&1 || yes | sdkmanager --licenses

echo "→ Installing SDK packages..."
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" "ndk;27.2.12479018"

echo "→ Initializing Tauri Android project..."
cd "$(dirname "$0")/.."
source "$HOME/.cargo/env"
npx tauri android init

echo "✓ Android environment ready. Build with: npm run tauri:android:build"