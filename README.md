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


# Add a new service behind ForwardAuth (Authelia + Traefik v3)

This is a **minimal, repeatable** checklist to put any new app (e.g., `jenkins.neovara.uk`) behind Authelia using Traefik ForwardAuth **with per-host isolation**.

---

## 0) Prereqs (what you already have)

* Traefik v3 running on external Docker network `traefik`, file provider mounted at `./dynamic`.
* Authelia container running and exposed:

  * As a full host on `auth.neovara.uk` (served at `/authelia`).
  * On each protected app host under `/authelia` (via additional routers on the **Authelia** container).
* Secrets are **not** in `configuration.yml` (set via `AUTHELIA_*` env in `secrets.env`).

---

## 1) Add a **cookie** + **rule** in Authelia

Edit `authelia/configuration.yml`:

```yaml
# --- session cookies (add one per app host) ---
session:
  cookies:
    # existing cookies...
    - domain: "jenkins.neovara.uk"
      authelia_url: "https://jenkins.neovara.uk/authelia"
      default_redirection_url: "https://jenkins.neovara.uk/"
      name: "jenkins_sess"
      same_site: "lax"

# --- access control (allow-list per app host) ---
access_control:
  # default_policy: deny
  rules:
    # existing rules...
    - domain: "jenkins.neovara.uk"
      policy: one_factor     # or two_factor
      subject:
        - "group:jenkins-admins"
        - "group:platform-admins"
```

> Keep lists in YAML. Secrets (session/storage/jwt) stay in `secrets.env`.

Restart Authelia:

```bash
docker compose -f authelia/compose.yml up -d
```

---

## 2) Expose Authelia on the **new host** under `/authelia`

On the **Authelia service** (labels), add a router for the new host:

```yaml
# Authelia service labels snippet
- traefik.http.routers.authelia-jenkins.rule=Host(`jenkins.neovara.uk`) && PathPrefix(`/authelia`)
- traefik.http.routers.authelia-jenkins.entrypoints=websecure
- traefik.http.routers.authelia-jenkins.tls.certresolver=cloudflare
- traefik.http.routers.authelia-jenkins.middlewares=authelia-add-slash,secure-headers@docker
- traefik.http.routers.authelia-jenkins.service=authelia-jenkins
- traefik.http.services.authelia-jenkins.loadbalancer.server.port=9091
```

> You should already have the two middlewares on Authelia:
>
> * `authelia-root-redirect` (for auth host `/ → /authelia/`)
> * `authelia-add-slash` (`/authelia → /authelia/`)

Reload:

```bash
docker compose -f authelia/compose.yml up -d
```

Sanity check:

```
curl -i https://jenkins.neovara.uk/authelia/api/health   # should be 200
```

---

## 3) Create a **ForwardAuth middleware** for the host (Traefik file)

Edit `traefik/dynamic/forward-auth.yml` and add:

```yaml
http:
  middlewares:
    # existing middlewares ...
    authelia-fa-jenkins:
      forwardAuth:
        address: https://jenkins.neovara.uk/authelia/api/authz/forward-auth
        trustForwardHeader: true
        authResponseHeaders:
          - Remote-User
          - Remote-Groups
          - Remote-Email
          - Remote-Name
```

Traefik’s file provider is already watching this directory; no restart needed.

Sanity check:

```
curl -i https://jenkins.neovara.uk/authelia/api/authz/forward-auth
# Expect 401/302 when not logged in (that’s fine).
```

---

## 4) Attach the middleware to the **app router**

On the **app’s** compose (Jenkins example):

```yaml
labels:
  - traefik.enable=true
  - traefik.docker.network=traefik
  - traefik.http.routers.jenkins.rule=Host(`jenkins.neovara.uk`)
  - traefik.http.routers.jenkins.entrypoints=websecure
  - traefik.http.routers.jenkins.tls.certresolver=cloudflare
  - traefik.http.services.jenkins.loadbalancer.server.port=8080
  - traefik.http.routers.jenkins.middlewares=authelia-fa-jenkins@file,secure-headers@docker
```

Deploy the app stack:

```bash
docker compose -f jenkins/compose.yml up -d
```

---

## 5) Test the flow

1. Open `https://jenkins.neovara.uk`
   → Traefik calls `…/authelia/api/authz/forward-auth` on **jenkins host**
   → Redirect to `https://jenkins.neovara.uk/authelia/...`
   → Login → cookie `jenkins_sess` set → back to Jenkins.

2. In the same browser, open another protected host
   → You’ll be prompted again (separate cookie, **no cross-app SSO**).

---

## Troubleshooting (quick)

* **`cookie scope` error**

  * `session.cookies[*].domain` must match the app FQDN.
  * `authelia_url` must be `https://<same FQDN>/authelia`.

* **404 on `/authelia/*`**

  * Missing router on Authelia service for that host (`PathPrefix('/authelia')`), or router not bound to a service.
  * Add:
    `…routers.authelia-<host>.service=authelia-<host>` and
    `…services.authelia-<host>.loadbalancer.server.port=9091`.

* **Traefik log: “too many services”**

  * Each router must explicitly set `…routers.<name>.service=<serviceName>`.

* **Loop on login**

  * App router accidentally catching `/authelia/*` paths. Ensure the **Authelia** router (with `PathPrefix('/authelia')`) exists for that host; the more specific path will win.

* **Secrets in Git**

  * Keep secrets in `authelia/secrets.env` (git-ignored).
  * Example keys:

    ```
    AUTHELIA_SESSION_SECRET=...
    AUTHELIA_STORAGE_ENCRYPTION_KEY=...
    AUTHELIA_IDENTITY_VALIDATION_RESET_PASSWORD_JWT_SECRET=...
    ```
  * Do **not** put non-config variables with `AUTHELIA_` prefix in that file.

---

## Copy-paste template (what you add per new host)

1. **Authelia `configuration.yml`**:

```yaml
session:
  cookies:
    - domain: "<host>"
      authelia_url: "https://<host>/authelia"
      default_redirection_url: "https://<host>/"
      name: "<shortapp>_sess"
      same_site: "lax"

access_control:
  rules:
    - domain: "<host>"
      policy: one_factor
      subject: ["group:<app>-users", "group:platform-admins"]
```

2. **Authelia service labels**:

```yaml
- traefik.http.routers.authelia-<shortapp>.rule=Host(`<host>`) && PathPrefix(`/authelia`)
- traefik.http.routers.authelia-<shortapp>.entrypoints=websecure
- traefik.http.routers.authelia-<shortapp>.tls.certresolver=cloudflare
- traefik.http.routers.authelia-<shortapp>.middlewares=authelia-add-slash,secure-headers@docker
- traefik.http.routers.authelia-<shortapp>.service=authelia-<shortapp>
- traefik.http.services.authelia-<shortapp>.loadbalancer.server.port=9091
```

3. **Traefik file `dynamic/forward-auth.yml`**:

```yaml
http:
  middlewares:
    authelia-fa-<shortapp>:
      forwardAuth:
        address: https://<host>/authelia/api/authz/forward-auth
        trustForwardHeader: true
        authResponseHeaders:
          - Remote-User
          - Remote-Groups
          - Remote-Email
          - Remote-Name
```

4. **App labels**:

```yaml
- traefik.http.routers.<shortapp>.middlewares=authelia-fa-<shortapp>@file,secure-headers@docker
```

That’s all you need for each new service.
