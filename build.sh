#!/usr/bin/env bash
# Build desktop installers locally. Usage: ./build.sh [linux|win|mac]
# Builds for the current OS by default. Windows/macOS targets need their own OS
# (or CI) in practice; see .github/workflows/release.yml.
set -euo pipefail
cd "$(dirname "$0")"

case "${1:-}" in
  linux) flag="--linux" ;;
  win)   flag="--win" ;;
  mac)   flag="--mac" ;;
  "")    flag="" ;;
  *) echo "Usage: $0 [linux|win|mac]" >&2; exit 1 ;;
esac

command -v node >/dev/null || { echo "Node.js is required" >&2; exit 1; }

npm ci
rm -rf dist
npx electron-builder $flag --publish never

echo "Artifacts:"
ls -1 dist | grep -E '\.(AppImage|deb|exe|dmg)$' || true
