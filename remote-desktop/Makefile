SHELL := /bin/bash

.DEFAULT_GOAL := help

help:
	@echo "remote desktop helpers"
	@echo "  make install-gnome-xrdp # install GNOME + tunnel-only XRDP"
	@echo "  make verify-xrdp   # verify GNOME/XRDP setup"

install-gnome-xrdp:
	chmod +x scripts/40-install-gnome-xrdp.sh
	./scripts/40-install-gnome-xrdp.sh

verify-xrdp:
	chmod +x scripts/45-verify-xrdp.sh
	./scripts/45-verify-xrdp.sh

all: install-gnome-xrdp verify-xrdp
