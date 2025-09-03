# Authelia Configuration Summary

## 1. Deployment model

* **Authelia** runs in its own stack with config mounted read-only, secrets injected via Go templates (`mustEnv`, `b64dec`).
* **Traefik v3** is the reverse proxy.
* **DNS-01 (Cloudflare)** provides TLS certificates.
* **Session cookies are scoped per hostname** (no cross-app SSO).

---

## 2. Endpoint layout

* **Each app lives on its own subdomain**, e.g.:

  * `nextcloud.neovara.uk`
  * `audiobookshelf.neovara.uk`
  * `ollama.neovara.uk`
  * `jenkins.neovara.uk`
* **Authelia is exposed per host** at `/authelia`:

  * `https://nextcloud.neovara.uk/authelia`
  * `https://audiobookshelf.neovara.uk/authelia`
  * etc.
* This ensures session cookies are bound to the **individual host only** (per-app login, no cross-SSO).

---

## 3. Session cookies

```yaml
session:
  cookies:
    - domain: "{{ mustEnv `NEXTCLOUD_HOST` }}"
      authelia_url: "https://{{ mustEnv `NEXTCLOUD_HOST` }}/authelia"
      default_redirection_url: "https://{{ mustEnv `NEXTCLOUD_HOST` }}/"
      name: "nc_sess"
      same_site: "lax"
    - domain: "{{ mustEnv `AUDIOBOOKSHELF_HOST` }}"
      authelia_url: "https://{{ mustEnv `AUDIOBOOKSHELF_HOST` }}/authelia"
      default_redirection_url: "https://{{ mustEnv `AUDIOBOOKSHELF_HOST` }}/"
      name: "abs_sess"
      same_site: "lax"
    - domain: "{{ mustEnv `OLLAMA_HOST` }}"
      authelia_url: "https://{{ mustEnv `OLLAMA_HOST` }}/authelia"
      default_redirection_url: "https://{{ mustEnv `OLLAMA_HOST` }}/"
      name: "ollama_sess"
      same_site: "lax"
    # …add new host entries here
```

---

## 4. OIDC clients (apps with native OIDC)

* Each OIDC-enabled app has its own client definition under `identity_providers.oidc.clients`.
* Example (Nextcloud):

  ```yaml
  - client_id: nextcloud
    client_name: Nextcloud
    client_secret: "{{ mustEnv `NC_CLIENT_SECRET_DIGEST` }}"
    public: false
    redirect_uris:
      - https://{{ mustEnv `NEXTCLOUD_HOST` }}/apps/user_oidc/callback
      - https://{{ mustEnv `NEXTCLOUD_HOST` }}/index.php/apps/user_oidc/callback
      - https://{{ mustEnv `NEXTCLOUD_HOST` }}/apps/user_oidc/code
    scopes: [openid, profile, email, groups]
    authorization_policy: two_factor
    token_endpoint_auth_method: client_secret_post
    require_pkce: true
    pkce_challenge_method: S256
    consent_mode: auto
  ```
* Example (Audiobookshelf):

  ```yaml
  - client_id: audiobookshelf
    client_name: Audiobookshelf
    client_secret: "{{ mustEnv `ABS_CLIENT_SECRET_DIGEST` }}"
    public: false
    redirect_uris:
      - https://{{ mustEnv `AUDIOBOOKSHELF_HOST` }}/auth/openid/callback
      - https://{{ mustEnv `AUDIOBOOKSHELF_HOST` }}/auth/openid/mobile-redirect
      - audiobookshelf://oauth
    scopes: [openid, profile, email, groups]
    authorization_policy: two_factor
    token_endpoint_auth_method: client_secret_basic
    require_pkce: true
    pkce_challenge_method: S256
    access_token_signed_response_alg: "none"
    userinfo_signed_response_alg: "none"
    consent_mode: auto
  ```
* **Scopes always include `groups`** so apps can enforce authorization internally.
* Each client has its **own consent & lifespan settings** if needed.

---

## 5. ForwardAuth apps

* Apps without native OIDC (e.g., Ollama, Jenkins) are protected by Traefik ForwardAuth.
* Authelia’s `access_control.rules` enforce **group-based access per subdomain**:

```yaml
access_control:
  default_policy: deny

  rules:
    - domain: "{{ mustEnv `OLLAMA_HOST` }}"
      policy: two_factor
      subject:
        - "group:ollama-users"
        - "group:platform-admins"

    - domain: "jenkins.neovara.uk"
      policy: two_factor
      subject:
        - "group:jenkins-users"
        - "group:platform-admins"
```

---

## 6. Group management

* **Groups are authoritative in Authelia** (`users.yaml` or LDAP).
* For OIDC apps:

  * `groups` claim is passed in ID tokens.
  * Apps (Nextcloud, ABS) map those groups internally (e.g., Nextcloud group provisioning with whitelist regex).
* For ForwardAuth apps:

  * Authelia enforces access rules directly against group membership.

---

## 7. 2FA enforcement

* **ForwardAuth apps:** set `policy: two_factor` in rules.
* **OIDC apps:** set `authorization_policy: two_factor` in client config.
* Supported 2FA methods: TOTP, WebAuthn (with `rp_id: neovara.uk`).

---

## 8. Security defaults

* `default_policy: deny` → no app is accessible unless explicitly listed.
* No shared cookies across apps.
* Secrets (HMAC, signing keys, client secrets) are injected via env + template filter (base64 decoded).
* JWKS contains RSA signing keys, rotated by adding a new entry with a fresh `key_id`.

---

✨ **In short:**

* Every subdomain has its own Authelia endpoint (`/authelia`) and host-scoped cookie.
* Apps that support OIDC use the OIDC provider config.
* Apps without OIDC use ForwardAuth + `access_control.rules`.
* All access is gated by group membership + mandatory 2FA.

