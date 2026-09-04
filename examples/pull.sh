#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
cd "$root"

clone() {
  local name="$1"
  if [[ -d "$name/.git" ]]; then
    echo "skip $name (already cloned)"
    return
  fi
  echo "clone hopesf/$name"
  gh repo clone "hopesf/$name" "$name" -- --depth 1
}

clone angular-dev-utils
clone Layera-UI
clone ExpressFlow
clone Layera-API
