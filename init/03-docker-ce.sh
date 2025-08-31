#!/usr/bin/env bash
# 03-docker-ce.sh — Install Docker CE, CLI, buildx, compose plugin
set -euo pipefail

ADD_USER="${ADD_USER:-$USER}"   # set to a username, defaults to current

echo "==> Removing old Docker/Container runtimes if present"
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
  sudo apt-get -y remove "$pkg" >/dev/null 2>&1 || true
done

echo "==> Installing prerequisites"
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

echo "==> Adding Docker’s official GPG key & repo"
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

source /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable"   | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

echo "==> Installing Docker CE + CLI + plugins"
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Adding user '${ADD_USER}' to docker group"
sudo usermod -aG docker "$ADD_USER"

cat <<'NOTE'
==> Docker installed.
- Log out and back in (or reboot) so group membership takes effect.
- Verify with: docker run --rm hello-world
NOTE
