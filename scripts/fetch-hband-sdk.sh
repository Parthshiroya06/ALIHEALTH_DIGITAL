#!/usr/bin/env bash
# Downloads the H Band (Veepoo) Android SDK from https://github.com/HBandSDK/Android_Ble_SDK
# into android/app/libs + android/app/src/main/jniLibs (both git-ignored).
# Usage: yarn sdk:hband
set -euo pipefail

REF="${HBAND_SDK_REF:-master}"
BASE="https://raw.githubusercontent.com/HBandSDK/Android_Ble_SDK/${REF}/android_sdk_source"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIBS="$ROOT/android/app/libs"
JNI="$ROOT/android/app/src/main/jniLibs"

LIB_FILES=(
  "jar_core/vpprotocol-2.3.85.15.aar"
  "jar_core/vpbluetooth-1.20.aar"
  "jar_core/JL_Watch_V1.13.1_11214-release.aar"
  "jar_core/jl_rcsp_V0.7.2_527-release.aar"
  "jar_core/jl_bt_ota_V1.10.0_10931-release.aar"
  "jar_core/BmpConvert_V1.6.0_10604-release.aar"
  "jar_core/abpartool-release.aar"
  "jar_base/libcomx-0.5.jar"
)
# ECG algorithms + audio codec used by the SDK
JNI_FILES=(
  "arm64-v8a/libnative-lib.so" "arm64-v8a/libopus.so" "arm64-v8a/libopusJni.so"
  "armeabi-v7a/libnative-lib.so" "armeabi-v7a/libopus.so" "armeabi-v7a/libopusJni.so"
  "x86/libnative-lib.so"
  "x86_64/libnative-lib.so"
)

mkdir -p "$LIBS"
for file in "${LIB_FILES[@]}"; do
  echo "↓ $file"
  curl -fsSL "$BASE/$file" -o "$LIBS/$(basename "$file")"
done
for file in "${JNI_FILES[@]}"; do
  echo "↓ jniLibs/$file"
  mkdir -p "$JNI/$(dirname "$file")"
  curl -fsSL "$BASE/jniLibs/$file" -o "$JNI/$file"
done
echo "✅ H Band SDK ready in android/app/libs and android/app/src/main/jniLibs"
