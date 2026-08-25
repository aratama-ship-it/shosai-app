#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
APP_DIR="$BUILD_DIR/制作の書斎.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
MODULE_CACHE_DIR="$BUILD_DIR/module-cache"

RESOURCES_DIR="$CONTENTS_DIR/Resources"

mkdir -p "$MACOS_DIR" "$MODULE_CACHE_DIR" "$RESOURCES_DIR"
cp "$SCRIPT_DIR/Resources/Info.plist" "$CONTENTS_DIR/Info.plist"
cp "$SCRIPT_DIR/Resources/AppIcon.icns" "$RESOURCES_DIR/AppIcon.icns"

echo "Building 制作の書斎.app"
CLANG_MODULE_CACHE_PATH="$MODULE_CACHE_DIR" \
SWIFT_MODULECACHE_PATH="$MODULE_CACHE_DIR" \
xcrun swiftc \
  -swift-version 5 \
  -O \
  -module-cache-path "$MODULE_CACHE_DIR" \
  -framework AppKit \
  -framework WebKit \
  -framework CoreServices \
  -framework Security \
  "$SCRIPT_DIR"/Sources/*.swift \
  -o "$MACOS_DIR/ShosaiDesk"

# Finder/Dock のアイコンキャッシュは mtime を見る。上書きビルドで旧アイコンが残らないようにする
touch "$APP_DIR"

echo "Built: $APP_DIR"
