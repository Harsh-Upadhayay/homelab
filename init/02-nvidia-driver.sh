#!/usr/bin/env bash
# 02-nvidia-driver.sh — Install NVIDIA driver (open variant)
set -euo pipefail

REBOOT="${REBOOT:-0}"   # set REBOOT=1 to reboot at the end

echo "==> Installing NVIDIA driver (575-open)"
sudo apt update
sudo apt install -y nvidia-driver-575-open

if [[ "$REBOOT" == "1" ]]; then
  echo "==> Rebooting to load NVIDIA modules..."
  sudo reboot
else
  echo "==> NVIDIA driver installed. Reboot recommended (set REBOOT=1 to auto)."
fi
