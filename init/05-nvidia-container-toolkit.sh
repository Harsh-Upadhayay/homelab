#!/usr/bin/env bash
# 05-nvidia-container-toolkit.sh — Install & configure NVIDIA Container Toolkit for Docker
set -euo pipefail

############################################
# 1) Install prerequisites
############################################
echo "==> Installing prerequisites"
sudo apt update
sudo apt install -y curl ca-certificates gnupg

############################################
# 2) Add NVIDIA apt repo (using ubuntu22.04 repo for compatibility)
############################################
echo "==> Adding NVIDIA Container Toolkit apt repo"

# GPG key
sudo mkdir -p /usr/share/keyrings
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
  | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

# Force repo to ubuntu22.04 (works for Ubuntu 24.04 too until NVIDIA updates it)
distribution="ubuntu22.04"

curl -fsSL https://nvidia.github.io/libnvidia-container/stable/$distribution/nvidia-container-toolkit.list \
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#' \
  | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list > /dev/null

############################################
# 3) Install NVIDIA Container Toolkit
############################################
echo "==> Installing nvidia-container-toolkit"
sudo apt update
sudo apt install -y nvidia-container-toolkit

############################################
# 4) Configure Docker runtime
############################################
echo "==> Configuring Docker runtime"
sudo nvidia-ctk runtime configure --runtime=docker

############################################
# 5) Restart Docker
############################################
echo "==> Restarting Docker"
sudo systemctl restart docker

############################################
# 6) Quick test command
############################################
echo "==> Done."
echo "Run this to test GPU passthrough into Docker:"
echo "   docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi"
