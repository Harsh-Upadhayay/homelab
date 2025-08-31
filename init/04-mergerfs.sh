#!/usr/bin/env bash
# 04-mergerfs.sh — install & configure mergerfs with /mnt/storage pool
set -euo pipefail

############################################
# 1) Install mergerfs
############################################
echo "==> Installing mergerfs"
sudo apt update
sudo apt install -y mergerfs

############################################
# 2) Prepare mountpoints
############################################
echo "==> Creating base mountpoints"
sudo mkdir -p /mnt/storage1   # real disk (must already be formatted & mounted)
sudo mkdir -p /mnt/storage    # mergerfs pooled mount

############################################
# 3) Configure fstab for persistent pool
############################################
echo "==> Updating /etc/fstab with mergerfs entry"

MERGERFS_LINE="/mnt/storage1 /mnt/storage fuse.mergerfs defaults,allow_other,use_ino,category.create=epmfs 0 0"

if ! grep -q "fuse.mergerfs" /etc/fstab; then
  echo "$MERGERFS_LINE" | sudo tee -a /etc/fstab
else
  echo ">> mergerfs entry already exists in /etc/fstab, skipping"
fi

############################################
# 4) Mount immediately
############################################
echo "==> Mounting mergerfs pool"
sudo mount -a

echo "==> Done. /mnt/storage is now your pooled mergerfs mount."
