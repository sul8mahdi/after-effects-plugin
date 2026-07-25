#!/usr/bin/env bash
#
# install-macos.sh — install Icon M Pro as an unsigned CEP extension
# for development/testing on macOS.
#
# What it does:
#   1. Enables CEP "debug mode" so After Effects loads the unsigned panel.
#   2. Symlinks this repo into the per-user CEP extensions folder.
#
# After running: restart After Effects, then open
#   Window > Extensions > Icon M Pro
#
# This does NOT sign or package the extension for distribution — that is a
# later phase (ZXP signing). It is for testing on your own machine.

set -euo pipefail

BUNDLE_ID="com.iconmpro.app"
LEGACY_IDS="com.iconmotion.pro"   # older ids to remove so they can't shadow us
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
LINK_PATH="$EXT_DIR/$BUNDLE_ID"

echo "Icon M Pro — تثبيت تطويري على macOS"
echo "Repo: $REPO_ROOT"

# 0) Remove any older-named copies so CEP can't load a stale one by mistake.
for OLD in $LEGACY_IDS; do
  if [ -e "$EXT_DIR/$OLD" ] || [ -L "$EXT_DIR/$OLD" ]; then
    rm -rf "$EXT_DIR/$OLD"
    echo "✓ أُزيلت نسخة قديمة: $OLD"
  fi
done

# 1) Enable debug mode for the CSXS versions AE 2024..2026 may use.
#    (Unsigned extensions only load when PlayerDebugMode = 1.)
for V in 9 10 11 12; do
  defaults write "com.adobe.CSXS.$V" PlayerDebugMode 1 2>/dev/null || true
done
echo "✓ تم تفعيل وضع تصحيح CEP (PlayerDebugMode)."

# 2) Symlink the extension bundle.
mkdir -p "$EXT_DIR"
if [ -L "$LINK_PATH" ] || [ -e "$LINK_PATH" ]; then
  echo "• توجد نسخة سابقة — يتم استبدالها."
  rm -rf "$LINK_PATH"
fi
ln -s "$REPO_ROOT" "$LINK_PATH"
echo "✓ تم ربط الإضافة: $LINK_PATH -> $REPO_ROOT"

echo
echo "التالي:"
echo "  1. أعد تشغيل After Effects 2026."
echo "  2. Window > Extensions > Icon M Pro"
echo
echo "لإلغاء التثبيت: rm \"$LINK_PATH\""
