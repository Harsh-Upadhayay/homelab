# why: convenience wrappers so you don't have to type --env-file twice or remember app paths

OPS_ENV ?= ops/.env.local
APPS := traefik monitoring authentik nextcloud audiobookshelf ollama jenkins portainer cloudflared

.DEFAULT_GOAL := help

define compose
	@cd $(1) && docker compose --env-file ./app.env --env-file ../$(OPS_ENV) $(2)
endef

help: ## show commands
	@echo "homelab make helpers"; \
	echo ""; \
	echo "global vars:"; \
	echo "  OPS_ENV=$(OPS_ENV)"; \
	echo ""; \
	echo "apps:"; \
	echo "  $(APPS)"; \
	echo ""; \
	echo "common:"; \
	echo "  make up-all            # start all stacks"; \
	echo "  make down-all          # stop all stacks"; \
	echo "  make restart-all       # restart all stacks"; \
	echo "  make pull-all          # pull images for all stacks"; \
	echo "  make logs-all          # show recent logs (non-follow)"; \
	echo "  make status            # ps for all stacks"; \
	echo ""; \
	echo "per app (use any item from APPS in place of <app>):"; \
	echo "  make up-<app>          # start"; \
	echo "  make down-<app>        # stop"; \
	echo "  make restart-<app>     # restart"; \
	echo "  make logs-<app>        # follow logs"; \
	echo "  make ps-<app>          # status"; \
	echo "  make pull-<app>        # pull images"; \
	echo "  make config-<app>      # rendered compose config"; \
	echo "  make debug-<app>       # foreground mode, aborts on container exit"; \
	echo "  make exec-<app> SERVICE=name SHELL=/bin/sh  # shell into a service"; \
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
	@for a in $(APPS); do \
		echo "==> $$a"; \
		cd $$a && docker compose --env-file ./app.env --env-file ../$(OPS_ENV) up -d; \
	done

down-all: ## stop all
	@for a in $(APPS); do \
		echo "==> $$a"; \
		cd $$a && docker compose --env-file ./app.env --env-file ../$(OPS_ENV) down; \
	done

restart-all: env-check ## restart all
	@for a in $(APPS); do \
		echo "==> $$a"; \
		cd $$a && docker compose --env-file ./app.env --env-file ../$(OPS_ENV) restart; \
	done

pull-all: env-check ## pull images for all
	@for a in $(APPS); do \
		echo "==> $$a"; \
		cd $$a && docker compose --env-file ./app.env --env-file ../$(OPS_ENV) pull; \
	done

logs-all: env-check ## recent logs (non-follow)
	@for a in $(APPS); do \
		echo "==> $$a"; \
		cd $$a && docker compose --env-file ./app.env --env-file ../$(OPS_ENV) logs --tail=100 ; \
	done

status: env-check ## ps for all
	@for a in $(APPS); do \
		echo "==> $$a"; \
		cd $$a && docker compose --env-file ./app.env --env-file ../$(OPS_ENV) ps; \
	done

# ---------- per app patterns ----------

up-%: env-check ## start one app
	$(call compose,$*,up -d)

down-%: ## stop one app
	$(call compose,$*,down)

restart-%: env-check ## restart one app
	$(call compose,$*,restart)

logs-%: env-check ## follow logs for one app
	$(call compose,$*,logs -f --tail=200)

ps-%: env-check ## status for one app
	$(call compose,$*,ps)

pull-%: env-check ## pull images for one app
	$(call compose,$*,pull)

config-%: env-check ## show rendered config
	$(call compose,$*,config)

debug-%: env-check ## foreground, abort on exit (ctrl-c to stop)
	$(call compose,$*,up --abort-on-container-exit)

exec-%: env-check ## run shell in a service: make exec-<app> SERVICE=name SHELL=/bin/sh
	@test -n "$(SERVICE)" || (echo 'set SERVICE=name'; exit 2)
	@cd $* && docker compose --env-file ./app.env --env-file ../$(OPS_ENV) exec -it $(SERVICE) $(if $(SHELL),$(SHELL),/bin/sh)
