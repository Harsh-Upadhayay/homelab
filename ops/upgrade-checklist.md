# Upgrade Checklist

Use this checklist before changing any image tag or storage path in the homelab repo.

## Core Rules
- Never track `latest` or other moving tags for stateful services.
- Read the official release notes for the target version before bumping a tag.
- Keep only documented state paths mounted from `/storage`.
- Treat `/storage` as the source of truth for assets and service state; treat repo files as the source of truth for declarative config.

## Pre-Upgrade
1. Confirm the current version in the repo and, if needed, the running service.
2. Snapshot or back up the affected `/storage/<stack>` path before any risky upgrade.
3. Check whether the upstream release changes storage paths, ownership, or migration behavior.
4. Verify the target image exists:
   `docker buildx imagetools inspect <image>:<tag>`

## Repo Update
1. Edit the relevant `app.env` tag.
2. If the service stores state in a documented container path, keep that mount target unchanged unless the upstream docs explicitly changed it.
3. Run:
   `docker compose --env-file ../ops/.env.local --env-file ./app.env config`
4. Commit the tag change and any required config changes together.

## Rollout
1. Upgrade one stack at a time.
2. Pull the new image explicitly:
   `docker compose --env-file ../ops/.env.local --env-file ./app.env pull`
3. Recreate only the affected stack:
   `docker compose --env-file ../ops/.env.local --env-file ./app.env up -d`
4. Verify the bind mounts after restart:
   `docker inspect -f '{{.Name}} {{range .Mounts}}{{.Destination}}<={{.Source}};{{end}}' <container>`

## Smoke Checks
- `traefik`: dashboard reachable, certs still present under `/letsencrypt/acme.json`
- `authelia` and `lldap`: login and directory queries still work
- `grafana`: dashboards, plugins, and users still present
- `nextcloud`: login works, files visible, `config/config.php` intact
- `jenkins`: jobs and plugins still present
- `mediaserver`: qBittorrent, Prowlarr, Sonarr, Radarr, Jellyfin, and Jellyseerr all retain settings
- `audiobookshelf`: libraries, progress, covers, and backups still present
- `ollama`: models still listed from `/root/.ollama`

## Service-Specific Notes
- `nextcloud`: keep `NEXTCLOUD_TAG` aligned with the installed app version in `/var/www/html/version.php`. Do not jump to the current Docker Hub `latest` just because it exists.
- `audiobookshelf`, `authelia`, and `jellyseerr`: these keep SQLite-backed or local app state. `/storage` must remain a local Linux filesystem, not SMB/NFS.
- LinuxServer services in `mediaserver`: `/config` is the state contract. `/data` is the shared asset tree.
- `jellyfin_cache`, `nextcloud_redis`, Docker `overlay2`, and similar caches are intentionally disposable and should stay off `/storage`.
