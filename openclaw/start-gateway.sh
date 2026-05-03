#!/bin/sh
set -eu

display_mode="${OPENCLAW_BROWSER_DISPLAY_MODE:-xvfb}"
display_value="${OPENCLAW_BROWSER_DISPLAY:-${DISPLAY:-:99}}"
xvfb_pid=""

bootstrap_browser_config() {
  config_file="${OPENCLAW_CONFIG_PATH:-${HOME:-/home/node}/.openclaw/openclaw.json}"
  if [ "${OPENCLAW_BOOTSTRAP_BROWSER_CONFIG:-1}" != "1" ] || [ -f "${config_file}" ]; then
    return
  fi

  mkdir -p "$(dirname "${config_file}")"
  origin_host="${OPENCLAW_HOST:-}"
  if [ -n "${origin_host}" ]; then
    allowed_origins='["http://localhost:18789","http://127.0.0.1:18789","https://'"${origin_host}"'"]'
  else
    allowed_origins='["http://localhost:18789","http://127.0.0.1:18789"]'
  fi

  batch_json='[
    {"path":"gateway.mode","value":"local"},
    {"path":"gateway.bind","value":"lan"},
    {"path":"gateway.controlUi.allowedOrigins","value":'"${allowed_origins}"'},
    {"path":"browser.enabled","value":true},
    {"path":"browser.defaultProfile","value":"openclaw"},
    {"path":"browser.headless","value":false},
    {"path":"browser.noSandbox","value":true},
    {"path":"browser.executablePath","value":"/usr/bin/chromium"}
  ]'

  node dist/index.js config set --batch-json "${batch_json}"
}

start_xvfb() {
  export DISPLAY="${display_value}"
  screen="${OPENCLAW_XVFB_SCREEN:-1920x1080x24}"
  Xvfb "${DISPLAY}" -screen 0 "${screen}" -nolisten tcp &
  xvfb_pid="$!"
}

case "${display_mode}" in
  xvfb)
    start_xvfb
    ;;
  host)
    export DISPLAY="${display_value}"
    ;;
  auto)
    if [ -n "${DISPLAY:-}" ] || [ -n "${OPENCLAW_BROWSER_DISPLAY:-}" ]; then
      export DISPLAY="${display_value}"
    else
      start_xvfb
    fi
    ;;
  none|off)
    unset DISPLAY
    ;;
  *)
    echo "Unsupported OPENCLAW_BROWSER_DISPLAY_MODE=${display_mode}" >&2
    exit 2
    ;;
esac

bootstrap_browser_config

cleanup() {
  if [ -n "${xvfb_pid}" ]; then
    kill "${xvfb_pid}" 2>/dev/null || true
  fi
}
trap cleanup INT TERM EXIT

exec node dist/index.js gateway --bind "${OPENCLAW_GATEWAY_BIND:-lan}" --port 18789
