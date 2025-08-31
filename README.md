# homelab helpers

## why
Uniform entrypoints for all stacks so you don't repeat `--env-file` and paths.

## env layout
- `ops/.env.local` — **secrets + globals** you don't commit (`HOMELAB_DOMAIN`, `HOMELAB_STORAGE_ROOT`, tokens/passwords).
- `*/app.env` — per-app **non-secrets** you do commit (image tags, hostnames, knobs).

## first run
```bash
cp ops/.env.local.sample ops/.env.local
$EDITOR ops/.env.local
make env-check
```

## common commands
```bash
make up-all           # start everything
make down-all         # stop everything
make status           # ps across stacks
make pull-all         # pull all images
make logs-all         # recent logs (non-follow)
```

## per-app
Use any of: `traefik monitoring authentik nextcloud audiobookshelf ollama jenkins portainer cloudflared`

```bash
make up-traefik
make logs-nextcloud
make restart-authentik
make ps-jenkins
make pull-monitoring
make config-traefik
make debug-ollama             # foreground, exits when a container exits
make exec-nextcloud SERVICE=nextcloud SHELL=/bin/bash
```

## notes
- Only **user data** binds to `${HOMELAB_STORAGE_ROOT}`. App/system state uses **named Docker volumes** on SSD.
- All variables are prefixed by stack/app. Secrets live only in `ops/.env.local`.
