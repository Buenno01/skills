#!/usr/bin/env bash
# Links every artifact-*/ skill into the local Hermes skills dir and installs the build kit.
# Usage: ./install.sh [--no-browser]
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "${HERMES_HOME:-}" ]; then base="$HERMES_HOME"
elif [ -d "$HOME/.hermes" ]; then base="$HOME/.hermes"
elif [ -n "${LOCALAPPDATA:-}" ] && [ -d "$LOCALAPPDATA/hermes" ]; then base="$LOCALAPPDATA/hermes"
else echo "FAIL cannot find Hermes home (set HERMES_HOME)"; exit 1; fi
dest="$base/skills/artifacts"
mkdir -p "$dest"
for d in "$here"/artifact-*/; do
  name="$(basename "$d")"
  target="$dest/$name"
  rm -rf "$target"
  if ln -s "$d" "$target" 2>/dev/null; then echo "OK link $name"
  else cp -r "$d" "$target"; echo "OK copy $name (symlink unavailable)"; fi
done
# native node on Windows needs a C:/ path, not /c/
script="$here/artifact-build/scripts/artifact.mjs"
if command -v cygpath >/dev/null 2>&1; then script="$(cygpath -m "$script")"; fi
node "$script" setup "$@"
