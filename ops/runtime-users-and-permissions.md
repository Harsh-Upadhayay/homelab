# Runtime Users and Storage Permissions

Snapshot date: `2026-04-14`

This document describes the current runtime user model and the `/storage` permission layout for the repo-managed homelab.

## Scope

- This covers the services managed by this repo.
- This focuses on authoritative state under `${HOMELAB_STORAGE_ROOT}`.
- Docker internals such as `overlay2`, image layers, writable container layers, and disposable cache volumes are intentionally out of scope.

## How to Read This

- `Compose user` is the explicit `user:` value in Compose when one is set.
- `Effective process user` is what the main app process is currently running as.
- Host bind-mount access is controlled by numeric UID/GID on the host filesystem, not by host usernames.

## Current Runtime User Model

| Service | Compose user | Effective process user | Notes |
| --- | --- | --- | --- |
| `audiobookshelf` | image default | `root` | Deliberately left unchanged because this service is treated as high-sensitivity. |
| `authelia` | `1000:1000` | `1000:1000` | Explicitly hardened to non-root. |
| `lldap` | image default | app runs as `1000:1000` | Entry point starts as root, then runs the app as the non-root `lldap` user. |
| `grafana` | `472:0` | `472:0` | Matches the official image model. |
| `prometheus` | `nobody` | `65534:65534` | Matches the official image model. |
| `nextcloud` | image default | master `apache2` runs as `root`, workers run as `www-data` (`33:33`) | This is the normal upstream Apache image model. |
| `nextcloud-db` | image default | `70:70` | Postgres app processes run as UID/GID `70`. |
| `jenkins` | `jenkins` | `1000:1000` | Current image resolves `jenkins` to UID/GID `1000`. |
| `gluetun` | image default | `root` | Left root because of `NET_ADMIN` and `/dev/net/tun`. |
| `qbittorrent` | image default | configured with `PUID=1000`, `PGID=1000` | LinuxServer image; persistent state is owned by `1000:1000`. |
| `prowlarr` | image default | configured with `PUID=1000`, `PGID=1000` | LinuxServer image. |
| `sonarr` | image default | configured with `PUID=1000`, `PGID=1000` | LinuxServer image. |
| `radarr` | image default | configured with `PUID=1000`, `PGID=1000` | LinuxServer image. |
| `jellyseerr` | `1000:1000` | `1000:1000` | Explicitly hardened to non-root. |
| `jellyfin` | image default | configured with `PUID=1000`, `PGID=1000` | LinuxServer image; `/cache` remains disposable. |
| `ollama` | image default | `root` | Left root because the current official layout stores state under `/root/.ollama`. |
| `traefik` | image default | `root` | Left root because of the current `:80` / `:443` binding model and Docker socket access. |

## Current `/storage` Ownership and Modes

### Stack State

| Path | Owner | Mode | Purpose |
| --- | --- | --- | --- |
| `/storage/audiobookshelf/config` | `0:0` | `700` | Audiobookshelf app state. |
| `/storage/audiobookshelf/metadata` | `0:0` | `750` | Audiobookshelf metadata cache and derived state. |
| `/storage/authelia/state` | `1000:1000` | `700` | Authelia local state under `/config`. |
| `/storage/authelia/lldap` | `1000:1000` | `750` | LLDAP directory data. |
| `/storage/monitoring/grafana` | `472:0` | `750` | Grafana writable data. |
| `/storage/monitoring/prometheus` | `65534:65534` | `750` | Prometheus TSDB. |
| `/storage/nextcloud/app` | `33:33` | `755` | Nextcloud application state under `/var/www/html`. |
| `/storage/nextcloud/data` | `33:33` | `770` | Nextcloud user data. |
| `/storage/nextcloud/postgres` | `70:70` | `700` | Nextcloud Postgres data directory. |
| `/storage/jenkins/home` | `1000:1000` | `750` | Jenkins home and controller state. |
| `/storage/mediaserver/state/gluetun` | `0:0` | `700` | Gluetun runtime and VPN state. |
| `/storage/mediaserver/state/qbittorrent/config` | `1000:1000` | `750` | qBittorrent state. |
| `/storage/mediaserver/state/prowlarr/config` | `1000:1000` | `750` | Prowlarr state. |
| `/storage/mediaserver/state/sonarr/config` | `1000:1000` | `750` | Sonarr state. |
| `/storage/mediaserver/state/radarr/config` | `1000:1000` | `750` | Radarr state. |
| `/storage/mediaserver/state/jellyseerr/config` | `1000:1000` | `750` | Jellyseerr state. |
| `/storage/mediaserver/state/jellyfin/config` | `1000:1000` | `750` | Jellyfin server state. |
| `/storage/ollama/data` | `0:0` | `700` | Ollama models and keys under `/root/.ollama`. |
| `/storage/traefik/letsencrypt` | `0:0` | `700` | Traefik ACME account and cert storage. |

### Shared Mediaserver Asset Tree

These paths are shared between multiple services and intentionally use a shared writable model.

| Path | Owner | Mode | Purpose |
| --- | --- | --- | --- |
| `/storage/mediaserver/downloads` | `1000:1000` | `2775` | Shared downloads/incomplete tree. |
| `/storage/mediaserver/movie` | `1000:1000` | `2775` | Shared movie library/assets. |
| `/storage/mediaserver/tv` | `1000:1000` | `2775` | Shared TV library/assets. |
| `/storage/mediaserver/ebook` | `1000:1000` | `2775` | Shared ebook library/assets. |
| `/storage/mediaserver/audiobook` | `1000:1000` | `2775` | Shared audiobook library/assets. |
| `/storage/mediaserver/temp` | `1000:1000` | `2775` | Shared temp/staging area. |

Notes:

- These directories use the SGID bit (`2` in `2775`) so new child items inherit the directory group.
- Existing files under this shared tree were normalized to group-writable modes where appropriate.

## Repo vs `/storage`

Current policy:

- Keep declarative config in Git.
- Keep authoritative assets and runtime state on `/storage`.
- Keep disposable caches on the root disk unless there is a strong reason not to.

Examples of repo-managed declarative config:

- `authelia/configuration.yml`
- `monitoring/prometheus/prometheus.yml`
- `monitoring/grafana/provisioning/...`
- `monitoring/grafana/dashboards/...`
- `traefik/errorpages/...`
- `*/compose.yml`
- `*/app.env`

Examples of authoritative state on `/storage`:

- Audiobookshelf `/config` and `/metadata`
- Authelia local state
- LLDAP directory data
- Grafana writable data
- Prometheus TSDB
- Nextcloud app state, user data, and Postgres data
- Jenkins home
- Mediaserver service configs and shared media tree
- Ollama model store
- Traefik ACME storage

Examples intentionally left off `/storage`:

- Docker `overlay2`
- Docker image layers
- Build cache
- `jellyfin_cache`
- `nextcloud_redis`
- similar disposable caches and container scratch space

## Root-Run Exceptions

These services are currently still root-run by design or by conservative choice:

| Service | Why it still runs as root |
| --- | --- |
| `audiobookshelf` | Left unchanged because it is treated as a high-sensitivity service and there is no low-risk non-root migration documented in this repo. |
| `gluetun` | Uses `NET_ADMIN` and `/dev/net/tun`; root is the conservative choice for the current VPN setup. |
| `ollama` | Current state path is mounted at `/root/.ollama`, matching the present official container usage. |
| `traefik` | Current deployment binds privileged ports `80` and `443` and reads the Docker socket. |
| `nextcloud` | Upstream Apache image uses a root master process with `www-data` workers. |

## Quick Verification Commands

Runtime users:

```bash
docker inspect -f '{{.Name}} user={{json .Config.User}}' \
  audiobookshelf authelia lldap grafana prometheus nextcloud nextcloud-db \
  jenkins gluetun qbittorrent prowlarr sonarr radarr jellyseerr jellyfin \
  ollama traefik
```

Effective process users:

```bash
docker top authelia
docker top jellyseerr
docker top nextcloud
docker top traefik
```

Host ownership and modes:

```bash
stat -c '%n %u:%g %a' \
  /storage/audiobookshelf/config \
  /storage/authelia/state \
  /storage/monitoring/grafana \
  /storage/nextcloud/data \
  /storage/mediaserver/state/jellyseerr/config \
  /storage/ollama/data \
  /storage/traefik/letsencrypt
```

## Change Rules

- Do not change Audiobookshelf runtime user casually.
- Do not change Traefik, Gluetun, or Ollama runtime user without a service-specific rollout plan.
- If a service runtime user changes, update the host path ownership to the matching numeric UID/GID at the same time.
- Prefer documenting numeric UID/GID contracts over relying on host usernames.
