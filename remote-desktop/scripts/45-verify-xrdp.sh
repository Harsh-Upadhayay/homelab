#!/usr/bin/env bash
set -euo pipefail

REMOTE_DESKTOP_USER="${REMOTE_DESKTOP_USER:-neovara}"
REMOTE_DESKTOP_RDP_BIND="${REMOTE_DESKTOP_RDP_BIND:-127.0.0.1}"
REMOTE_DESKTOP_RDP_PORT="${REMOTE_DESKTOP_RDP_PORT:-3389}"

fail=0

check() {
  local description="$1"
  shift
  if "$@"; then
    echo "OK   ${description}"
  else
    echo "FAIL ${description}" >&2
    fail=1
  fi
}

home_dir="$(getent passwd "$REMOTE_DESKTOP_USER" | cut -d: -f6)"

check "XRDP is active" systemctl is-active --quiet xrdp

check "XRDP listens on ${REMOTE_DESKTOP_RDP_BIND}:${REMOTE_DESKTOP_RDP_PORT}" \
  bash -lc "ss -H -ltn | awk '{print \$4}' | grep -Eq '(^|\\[)${REMOTE_DESKTOP_RDP_BIND//./\\.}(:|\\]:)${REMOTE_DESKTOP_RDP_PORT}$'"

check "XRDP is not listening on the LAN wildcard" \
  bash -lc "! ss -H -ltn | awk '{print \$4}' | grep -Eq '(^0\\.0\\.0\\.0:${REMOTE_DESKTOP_RDP_PORT}$|^\\[::\\]:${REMOTE_DESKTOP_RDP_PORT}$)'"

check "GNOME session command exists" command -v gnome-session

check "user xsession starts GNOME" \
  bash -lc "test -x '${home_dir}/.xsession' && grep -q 'gnome-session --session=ubuntu' '${home_dir}/.xsession'"

check "user xsession exports GNOME desktop identity" \
  bash -lc "grep -q 'XDG_CURRENT_DESKTOP=ubuntu:GNOME' '${home_dir}/.xsession' && grep -q 'XDG_SESSION_TYPE=x11' '${home_dir}/.xsession'"

check "GDM is not active for tunnel-only XRDP" \
  bash -lc "! systemctl is-active --quiet gdm3 && ! systemctl is-active --quiet display-manager"

check "GNOME built-in remote desktop is not active" \
  bash -lc "! systemctl is-active --quiet gnome-remote-desktop"

check "XRDP Xorg backend uses dynamic session port" \
  bash -lc "awk 'BEGIN { section=\"\" } /^\\[/ { section=\$0 } section == \"[Xorg]\" && /^port=/ { found=(\$0 == \"port=-1\") } END { exit(found ? 0 : 1) }' /etc/xrdp/xrdp.ini"

check "XRDP sesman listens on localhost port 3350" \
  bash -lc "ss -H -ltn | awk '{print \$4}' | grep -Eq '(^127\\.0\\.0\\.1:3350$|^\\[::ffff:127\\.0\\.0\\.1\\]:3350$)'"

check "XRDP sesman is not listening on LAN interfaces" \
  bash -lc "! ss -H -ltn | awk '{print \$4}' | grep -Eq '(^0\\.0\\.0\\.0:3350$|^\\*:3350$|^\\[::\\]:3350$)'"

check "old x11vnc service is not active" \
  bash -lc "! systemctl is-active --quiet homelab-remote-desktop-x11vnc.service"

check "old supervised Marco service is not active" \
  bash -lc "! systemctl is-active --quiet homelab-remote-desktop-window-manager.service"

if [[ "$fail" -ne 0 ]]; then
  echo "One or more XRDP checks failed" >&2
  exit 1
fi

echo "All GNOME XRDP remote desktop checks passed"
