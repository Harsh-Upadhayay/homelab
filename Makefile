# ---------- settings ----------
OPS_ENV ?= ops/.env.local
APPS := traefik monitoring authentik nextcloud audiobookshelf ollama jenkins portainer cloudflared

# Use bash so 'set -e' works reliably within loops
SHELL := /bin/bash

.DEFAULT_GOAL := help

# Compose helper: run command $(2) inside app dir $(1) with env files
define compose
	@ ( cd $(1) && docker compose --env-file ../$(OPS_ENV) --env-file ./app.env $(2) )
endef

help: ## show commands
	@echo "homelab make helpers"; \
	echo ""; \
	echo "global vars:"; \
	echo "  OPS_ENV=$(OPS_ENV)"; \
	echo "  SRV=<service>   (optional: limit action to a specific service)"; \
	echo ""; \
	echo "apps:"; \
	echo "  $(APPS)"; \
	echo ""; \
	echo "common:"; \
	echo "  make up-all            # start all stacks"; \
	echo "  make down-all          # stop all stacks"; \
	echo "  make restart-all       # 'docker compose restart' for all"; \
	echo "  make bounce-all        # stop then start all (hard restart)"; \
	echo "  make stop-all          # stop all (containers remain)"; \
	echo "  make start-all         # start all (containers exist)"; \
	echo "  make pull-all          # pull images for all stacks"; \
	echo "  make logs-all          # show recent logs (non-follow)"; \
	echo "  make status            # ps for all stacks"; \
	echo ""; \
	echo "per app (use any item from APPS in place of <app>; add SRV=name to target a service):"; \
	echo "  make up-<app>          # start (optionally: SRV=web)"; \
	echo "  make down-<app>        # stop"; \
	echo "  make restart-<app>     # 'docker compose restart' (optionally: SRV=web)"; \
	echo "  make bounce-<app>      # stop then start (optionally: SRV=web)"; \
	echo "  make stop-<app>        # stop (optionally: SRV=web)"; \
	echo "  make start-<app>       # start (optionally: SRV=web)"; \
	echo "  make logs-<app>        # follow logs (optionally: SRV=web)"; \
	echo "  make ps-<app>          # status"; \
	echo "  make pull-<app>        # pull images"; \
	echo "  make config-<app>      # rendered compose config"; \
	echo "  make debug-<app>       # foreground mode, aborts on container exit (optionally: SRV=web)"; \
	echo "  make exec-<app> SERVICE=name SH=/bin/sh  # shell into a service"; \
	echo ""; \
	echo "bootstrap:"; \
	echo "  make env-new           # copy sample ops env"; \
	echo "  make env-check         # verify ops env present"

env-new: ## create ops/.env.local from sample
	@test -f ops/.env.local || (cp ops/.env.local.sample ops/.env.local && echo 'created ops/.env.local')

env-check: ## verify required env exists
	@test -f $(OPS_ENV) || (echo 'missing $(OPS_ENV). copy ops/.env.local.sample and fill.' ; exit 1)

# ---------- all stacks ----------

up-all: env-check ## start all
	@set -e; for a in $(APPS); do \
		echo "==> $$a"; \
		( cd $$a && docker compose --env-file ../$(OPS_ENV) --env-file ./app.env up -d $(SRV) ); \
	done

down-all: env-check ## stop all
	@set -e; for a in $(APPS); do \
		echo "==> $$a"; \
		( cd $$a && docker compose --env-file ../$(OPS_ENV) --env-file ./app.env down ); \
	done

restart-all: env-check ## restart all (compose restart)
	@set -e; for a in $(APPS); do \
		echo "==> $$a"; \
		( cd $$a && docker compose --env-file ../$(OPS_ENV) --env-file ./app.env restart $(SRV) ); \
	done

bounce-all: env-check ## stop then start all (hard restart)
	@$(MAKE) stop-all SRV="$(SRV)"
	@$(MAKE) start-all SRV="$(SRV)"

stop-all: env-check ## stop all (containers remain)
	@set -e; for a in $(APPS); do \
		echo "==> $$a"; \
		( cd $$a && docker compose --env-file ../$(OPS_ENV) --env-file ./app.env stop $(SRV) ); \
	done

start-all: env-check ## start all (containers exist)
	@set -e; for a in $(APPS); do \
		echo "==> $$a"; \
		( cd $$a && docker compose --env-file ../$(OPS_ENV) --env-file ./app.env start $(SRV) ); \
	done

pull-all: env-check ## pull images for all
	@set -e; for a in $(APPS); do \
		echo "==> $$a"; \
		( cd $$a && docker compose --env-file ../$(OPS_ENV) --env-file ./app.env pull ); \
	done

logs-all: env-check ## recent logs (non-follow)
	@set -e; for a in $(APPS); do \
		echo "==> $$a"; \
		( cd $$a && docker compose --env-file ../$(OPS_ENV) --env-file ./app.env logs --tail=100 $(SRV) ); \
	done

status: env-check ## ps for all
	@set -e; for a in $(APPS); do \
		echo "==> $$a"; \
		( cd $$a && docker compose --env-file ../$(OPS_ENV) --env-file ./app.env ps ); \
	done

# ---------- per app patterns ----------

up-%: env-check ## start one app (SRV optional)
	$(call compose,$*,up -d $(SRV))

down-%: env-check ## stop one app
	$(call compose,$*,down)

restart-%: env-check ## restart one app (compose restart; SRV optional)
	$(call compose,$*,restart $(SRV))

bounce-%: env-check ## stop then start one app (SRV optional)
	@$(MAKE) stop-$* SRV="$(SRV)"
	@$(MAKE) start-$* SRV="$(SRV)"

stop-%: env-check ## stop one app (SRV optional)
	$(call compose,$*,stop $(SRV))

start-%: env-check ## start one app (SRV optional)
	$(call compose,$*,start $(SRV))

logs-%: env-check ## follow logs for one app (SRV optional)
	$(call compose,$*,logs -f --tail=200 $(SRV))

ps-%: env-check ## status for one app
	$(call compose,$*,ps)

pull-%: env-check ## pull images for one app
	$(call compose,$*,pull)

config-%: env-check ## show rendered config
	$(call compose,$*,config)

debug-%: env-check ## foreground, abort on exit (ctrl-c to stop) (SRV optional)
	$(call compose,$*,up --abort-on-container-exit $(SRV))

exec-%: env-check ## run shell in a service: make exec-<app> SERVICE=name SH=/bin/sh
	@test -n "$(SERVICE)" || (echo 'set SERVICE=name'; exit 2)
	@ ( cd $* && docker compose --env-file ../$(OPS_ENV) --env-file ./app.env exec -it $(SERVICE) $(if $(SH),$(SH),/bin/sh) )
