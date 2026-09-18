#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:4173}"
PREVIEW_PID=""

cleanup() {
  if [[ -n "${PREVIEW_PID}" ]]; then
    kill "${PREVIEW_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [[ "$BASE_URL" == "http://127.0.0.1:4173" ]]; then
  pnpm --filter @viralab/web exec vite preview --host 127.0.0.1 --port 4173 > /tmp/viralab-vite-preview.log 2>&1 &
  PREVIEW_PID=$!

  for _ in {1..30}; do
    if curl --silent --fail "$BASE_URL/" >/dev/null; then
      break
    fi
    sleep 1
  done

  if ! curl --silent --fail "$BASE_URL/" >/dev/null; then
    echo "::error::Vite preview did not become ready"
    cat /tmp/viralab-vite-preview.log || true
    exit 1
  fi
fi

CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
if [[ -z "$CHROME" ]]; then
  echo "::error::No headless Chrome/Chromium executable found on runner"
  exit 1
fi

smoke() {
  local path="$1"
  local marker="$2"
  local name="$3"
  local dom_file="/tmp/viralab-${name}.html"
  local browser_log="/tmp/viralab-${name}-browser.log"

  "$CHROME" \
    --headless \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --virtual-time-budget=4000 \
    --dump-dom "${BASE_URL}${path}" \
    > "$dom_file" 2> "$browser_log" || {
      echo "::error::Headless browser failed for ${BASE_URL}${path}"
      cat "$browser_log" || true
      exit 1
    }

  if ! grep -Fq "$marker" "$dom_file"; then
    echo "::error::Viralab runtime smoke failed for ${BASE_URL}${path}; expected marker: ${marker}"
    echo "--- browser stderr ---"
    cat "$browser_log" || true
    echo "--- rendered DOM ---"
    cat "$dom_file" || true
    if [[ -f /tmp/viralab-vite-preview.log ]]; then
      echo "--- vite preview ---"
      cat /tmp/viralab-vite-preview.log || true
    fi
    exit 1
  fi

  echo "Runtime smoke passed: ${BASE_URL}${path}"
}

smoke "/" 'class="site-shell"' "landing"
smoke "/login" 'class="login-shell"' "login"
smoke "/explore" 'class="explorer-shell"' "explorer"
