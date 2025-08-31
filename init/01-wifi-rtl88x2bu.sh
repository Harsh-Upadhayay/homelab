#!/usr/bin/env bash
# 01-wifi-rtl88x2bu.sh — Install and configure RTL88x2BU (morrownr) driver
set -euo pipefail

REBOOT="${REBOOT:-0}"   # set REBOOT=1 to reboot at the end

echo "==> Installing prerequisites"
sudo apt update
sudo apt install -y git dkms build-essential

echo "==> Cloning driver repo (if not present)"
if [[ ! -d ./88x2bu-20210702 ]]; then
  git clone https://github.com/morrownr/88x2bu-20210702.git
fi

echo "==> Installing driver via DKMS (non-interactive)"
pushd 88x2bu-20210702 >/dev/null
yes n | sudo ./install-driver.sh
popd >/dev/null

echo "==> Writing modprobe options"
sudo tee /etc/modprobe.d/88x2bu.conf >/dev/null <<'EOF'
options 88x2bu rtw_switch_usb_mode=0 rtw_led_ctrl=1 rtw_power_mgnt=0 rtw_enusbss=0
EOF

echo "==> Blacklisting conflicting in-kernel module"
sudo tee /etc/modprobe.d/blacklist-rtw88_8822bu.conf >/dev/null <<'EOF'
blacklist rtw88_8822bu
EOF
# Optional: also blacklist rtl8xxxu if it grabs the device
# sudo tee /etc/modprobe.d/blacklist-rtl8xxxu.conf >/dev/null <<'EOF'
# blacklist rtl8xxxu
# EOF

echo "==> Reloading module (ignoring errors if not loaded)"
sudo modprobe -r 88x2bu 2>/dev/null || true
sudo depmod -a
sudo modprobe 88x2bu || true

if [[ "$REBOOT" == "1" ]]; then
  echo "==> Rebooting to finalize Wi‑Fi driver..."
  sudo reboot
else
  echo "==> Wi‑Fi driver installed. Reboot recommended (set REBOOT=1 to auto)."
fi
