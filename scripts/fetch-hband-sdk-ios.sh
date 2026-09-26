#!/usr/bin/env bash
# Downloads the H Band (Veepoo) iOS SDK from https://github.com/HBandSDK/iOS_Ble_SDK
# into modules/react-native-aliband-sdk/ios/Frameworks (git-ignored), then run `pod install`.
# The frameworks are iPhone-only (arm64): simulator builds use a stub instead.
# Usage: yarn sdk:hband:ios
set -euo pipefail

REF="${HBAND_IOS_SDK_REF:-master}"
SDK_VERSION="${HBAND_IOS_SDK_VERSION:-2.2.XX.15}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/modules/react-native-aliband-sdk/ios/Frameworks"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "↓ HBandSDK/iOS_Ble_SDK ($REF, framework $SDK_VERSION)"
git clone --quiet --depth 1 --branch "$REF" --filter=blob:none --sparse \
  https://github.com/HBandSDK/iOS_Ble_SDK.git "$TMP/sdk"
SRC="iOS_sdk_source"
K_LIBS="$SRC/doc/K系列第三方库"
Z_LIBS="$SRC/doc/Z系列第三方库"
git -C "$TMP/sdk" sparse-checkout set --no-cone \
  "/$SRC/Framework/$SDK_VERSION/" "/$K_LIBS/" "/$Z_LIBS/" \
  "/$SRC/doc/GRDFUSDK.framework/" "/$SRC/doc/SDKResours.bundle/"

rm -rf "$DEST"
mkdir -p "$DEST"
S="$TMP/sdk"
# Main SDK (static) + JieLi libs it references (JL_BLEKit/DFUnits static; JLDialUnit dynamic)
cp -R "$S/$SRC/Framework/$SDK_VERSION/VeepooBleSDK.framework" "$DEST/"
for fw in JL_BLEKit DFUnits JLDialUnit ZipZap; do cp -R "$S/$K_LIBS/$fw.framework" "$DEST/"; done
# Firmware-upgrade / Z-series libs (dynamic, weak-linked – only used for OTA and watch faces)
cp -R "$S/$SRC/doc/GRDFUSDK.framework" "$DEST/"
cp -R "$S/$Z_LIBS/ABParTool.framework" "$DEST/"
cp -R "$S/$SRC/doc/SDKResours.bundle" "$DEST/"

echo "✓ $(ls "$DEST" | tr '\n' ' ')"
echo "Now run: cd ios && pod install"
