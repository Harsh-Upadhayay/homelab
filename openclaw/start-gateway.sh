#!/bin/sh
set -eu

display_mode="${OPENCLAW_BROWSER_DISPLAY_MODE:-xvfb}"
display_value="${OPENCLAW_BROWSER_DISPLAY:-${DISPLAY:-:99}}"
xvfb_pid=""
gateway_pid=""

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

  display_number="${DISPLAY#:}"
  display_number="${display_number%%.*}"
  lock_file="/tmp/.X${display_number}-lock"
  socket_file="/tmp/.X11-unix/X${display_number}"

  if [ -f "${lock_file}" ]; then
    lock_pid="$(tr -d ' ' < "${lock_file}" 2>/dev/null || true)"
    if [ -n "${lock_pid}" ] && kill -0 "${lock_pid}" 2>/dev/null; then
      echo "Xvfb display ${DISPLAY} is already active; reusing it"
      return
    fi

    echo "Removing stale Xvfb lock for display ${DISPLAY}"
    rm -f "${lock_file}" "${socket_file}"
  fi

  Xvfb "${DISPLAY}" -screen 0 "${screen}" -nolisten tcp &
  xvfb_pid="$!"
  sleep 1
  if ! kill -0 "${xvfb_pid}" 2>/dev/null; then
    echo "Xvfb failed to start on display ${DISPLAY}" >&2
    wait "${xvfb_pid}" 2>/dev/null || true
    exit 1
  fi
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
  if [ -n "${gateway_pid}" ]; then
    kill "${gateway_pid}" 2>/dev/null || true
  fi

  if [ -n "${xvfb_pid}" ]; then
    kill "${xvfb_pid}" 2>/dev/null || true
    wait "${xvfb_pid}" 2>/dev/null || true
  fi
}
trap 'cleanup; exit 143' INT TERM

node dist/index.js gateway --bind "${OPENCLAW_GATEWAY_BIND:-lan}" --port 18789 &
gateway_pid="$!"

set +e
wait "${gateway_pid}"
status="$?"
set -e
gateway_pid=""
cleanup
exit "${status}"
