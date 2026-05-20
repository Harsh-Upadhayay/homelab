#!/usr/bin/env bash
set -euo pipefail

if ! sudo -n true 2>/dev/null; then
  echo "This script needs sudo. Run 'sudo -v' in your shell, then rerun it." >&2
  exit 1
fi

REMOTE_DESKTOP_USER="${REMOTE_DESKTOP_USER:-neovara}"
REMOTE_DESKTOP_RDP_BIND="${REMOTE_DESKTOP_RDP_BIND:-127.0.0.1}"
REMOTE_DESKTOP_RDP_PORT="${REMOTE_DESKTOP_RDP_PORT:-3389}"

if ! id "$REMOTE_DESKTOP_USER" >/dev/null 2>&1; then
  echo "Remote desktop user '$REMOTE_DESKTOP_USER' does not exist" >&2
  exit 2
fi

home_dir="$(getent passwd "$REMOTE_DESKTOP_USER" | cut -d: -f6)"

echo "==> Installing GNOME and XRDP packages"
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update
sudo apt-get install -y \
  ubuntu-desktop-minimal \
  gnome-session \
  gnome-shell \
  gdm3 \
  xrdp \
  xorgxrdp \
  dbus-x11 \
  gnome-terminal \
  nautilus

echo "==> Configuring GNOME as the XRDP user session"
sudo tee "$home_dir/.xsessionrc" >/dev/null <<'EOF'
export GNOME_SHELL_SESSION_MODE=ubuntu
export XDG_CURRENT_DESKTOP=ubuntu:GNOME
export XDG_SESSION_DESKTOP=ubuntu
export XDG_SESSION_TYPE=x11
EOF

sudo tee "$home_dir/.xsession" >/dev/null <<'EOF'
#!/usr/bin/env bash
exec >>"$HOME/.xsession-xrdp.log" 2>&1

unset DBUS_SESSION_BUS_ADDRESS

export GNOME_SHELL_SESSION_MODE=ubuntu
export XDG_CURRENT_DESKTOP=ubuntu:GNOME
export XDG_SESSION_DESKTOP=ubuntu
export XDG_SESSION_TYPE=x11

exec dbus-run-session -- gnome-session --session=ubuntu
EOF

sudo chown "$REMOTE_DESKTOP_USER:$REMOTE_DESKTOP_USER" "$home_dir/.xsessionrc" "$home_dir/.xsession"
sudo chmod 0644 "$home_dir/.xsessionrc"
sudo chmod 0755 "$home_dir/.xsession"

echo "==> Disabling stale non-GNOME user session state"
sudo rm -rf \
  "$home_dir/.config/plasma-workspace" \
  "$home_dir/.config/kscreen" \
  "$home_dir/.local/share/kscreen" \
  "$home_dir/.config/kded5rc" \
  "$home_dir/.config/kded6rc" \
  "$home_dir/.cache/sessions"

echo "==> Configuring XRDP to bind only to ${REMOTE_DESKTOP_RDP_BIND}:${REMOTE_DESKTOP_RDP_PORT}"
sudo install -d -m 0755 /etc/xrdp
sudo cp -a /etc/xrdp/xrdp.ini "/etc/xrdp/xrdp.ini.bak.$(date +%Y%m%d%H%M%S)"
sudo awk -v bind="$REMOTE_DESKTOP_RDP_BIND" -v port="$REMOTE_DESKTOP_RDP_PORT" '
  BEGIN { section = "" }
  /^\[/ { section = $0 }
  section == "[Globals]" && /^port=/ {
    print "port=tcp://" bind ":" port
    next
  }
  section == "[Xorg]" && /^ip=/ {
    print "ip=127.0.0.1"
    next
  }
  section == "[Xorg]" && /^port=/ {
    print "port=-1"
    next
  }
  { print }
' /etc/xrdp/xrdp.ini | sudo tee /etc/xrdp/xrdp.ini.tmp >/dev/null
sudo mv /etc/xrdp/xrdp.ini.tmp /etc/xrdp/xrdp.ini

echo "==> Configuring XRDP session manager on loopback"
sudo cp -a /etc/xrdp/sesman.ini "/etc/xrdp/sesman.ini.bak.$(date +%Y%m%d%H%M%S)"
sudo awk '
  BEGIN { section = "" }
  /^\[/ { section = $0 }
  section == "[Globals]" && /^ListenAddress=/ {
    print "ListenAddress=127.0.0.1"
    next
  }
  section == "[Globals]" && /^ListenPort=/ {
    print "ListenPort=3350"
    next
  }
  { print }
' /etc/xrdp/sesman.ini | sudo tee /etc/xrdp/sesman.ini.tmp >/dev/null
sudo mv /etc/xrdp/sesman.ini.tmp /etc/xrdp/sesman.ini

echo "==> Applying conservative GNOME display settings"
sudo cp -a /etc/gdm3/custom.conf "/etc/gdm3/custom.conf.bak.$(date +%Y%m%d%H%M%S)"
sudo awk '
  BEGIN { section = ""; done = 0 }
  /^\[/ {
    if (section == "[daemon]" && done == 0) {
      print "WaylandEnable=false"
      done = 1
    }
    section = $0
  }
  section == "[daemon]" && /^#?WaylandEnable=/ {
    if (done == 0) {
      print "WaylandEnable=false"
      done = 1
    }
    next
  }
  { print }
  END {
    if (done == 0) {
      print ""
      print "[daemon]"
      print "WaylandEnable=false"
    }
  }
' /etc/gdm3/custom.conf | sudo tee /etc/gdm3/custom.conf.tmp >/dev/null
sudo mv /etc/gdm3/custom.conf.tmp /etc/gdm3/custom.conf

echo "==> Allowing XRDP to read host TLS material"
sudo adduser xrdp ssl-cert >/dev/null

echo "==> Disabling unused/conflicting remote desktop services"
for unit in \
  gnome-remote-desktop.service \
  gdm3.service \
  display-manager.service \
  homelab-remote-desktop-x11vnc.service \
  homelab-remote-desktop-window-manager.service
do
  sudo systemctl stop "$unit" >/dev/null 2>&1 || true
  sudo systemctl disable "$unit" >/dev/null 2>&1 || true
done

echo "==> Enabling tunnel-only XRDP"
sudo systemctl daemon-reload
sudo systemctl enable xrdp
sudo systemctl restart xrdp-sesman xrdp

echo "==> GNOME XRDP setup complete"
