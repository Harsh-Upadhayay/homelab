# Convenience targets. Scripts are non-interactive.
SHELL := /bin/bash

wifi:
	chmod +x 01-wifi-rtl88x2bu.sh
	REBOOT?=0 ./01-wifi-rtl88x2bu.sh

nvidia:
	chmod +x 02-nvidia-driver.sh
	REBOOT?=0 ./scripts/02-nvidia-driver.sh

docker:
	chmod +x 03-docker-ce.sh
	ADD_USER?=$(shell whoami) ./scripts/03-docker-ce.sh

mergerfs:
	chmod +x 04-mergerfs.sh
	./04-mergerfs.sh

docker-gpu:
	chmod +x 05-nvidia-container-toolkit.sh
	./05-nvidia-container-toolkit.sh

all: wifi nvidia docker mergerfs docker-gpu
