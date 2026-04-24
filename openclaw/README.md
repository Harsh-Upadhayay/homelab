# OpenClaw

## Access
- Local host UI: `http://127.0.0.1:18789/`
- Proxied UI: `https://openclaw.${HOMELAB_DOMAIN}`
- The dashboard is the built-in Control UI served by the gateway itself.
- This stack disables OpenClaw Control UI device pairing for the proxied browser UI and relies on Authelia plus the gateway token instead.
- If the plain proxied URL asks for a token, print a tokenized URL with:
```bash
cd openclaw
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli dashboard --no-open
```
Then replace `http://127.0.0.1:18789/` with `https://openclaw.${HOMELAB_DOMAIN}/`.

## Common commands
```bash
make up-openclaw
make logs-openclaw
make ps-openclaw
make exec-openclaw SERVICE=openclaw-gateway SH=/bin/sh
```

## Layout
- Runtime env vars: `openclaw/app.env`
- Bootstrap config defaults: `openclaw/config/batch/base.json`
- Browser CDP proxy config: `openclaw/config/nginx/browser-cdp-proxy.conf`
- Startup scripts: `openclaw/scripts/`
- Local skills source: `openclaw/skills-src/`

The compose file now just wires services together. OpenClaw settings are applied from the batch config plus env-driven values during gateway startup.

## Configure it
Use the browser dashboard for day-to-day admin and chat, or run CLI commands inside the stack:

```bash
cd openclaw
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli config
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli configure
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli config validate
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli dashboard --no-open
```

To change the built-in gateway/browser behavior, edit:

- `openclaw/config/batch/base.json` for stable defaults
- `openclaw/app.env` for deployment-specific values such as ports, hostnames, models, and browser profile settings

## Channels
```bash
cd openclaw
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli channels login
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli channels add --channel telegram --token "<token>"
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli channels add --channel discord --token "<token>"
```

## Careerflow skills
Skill source lives in `openclaw/skills-src/careerflow-*`. Install into the active OpenClaw workspace skills directory:

```bash
mkdir -p "${OPENCLAW_WORKSPACE_DIR}/skills"
cp -R openclaw/skills-src/careerflow-* "${OPENCLAW_WORKSPACE_DIR}/skills/"
```

The stack also keeps those skills synced into the workspace automatically through `openclaw-skill-sync`.

From inside the OpenClaw Docker network, the helper API is reachable at `http://careerflow-api:8000` when the `careerflow` stack is running.

OpenClaw owns:

- browser automation
- LLM calls and model routing
- approval and revision flow
- final submission and outreach sending

The helper service only provides:

- bulk search for helper-supported boards
- RenderCV artifact rendering

Rendered files are shared into the OpenClaw workspace at `/home/node/.openclaw/workspace/careerflow-artifacts`.

## Careerflow Automation

The recurring program now lives in the OpenClaw workspace bootstrap and cron runtime:

- standing order: `/storage/openclaw/workspace/AGENTS.md`
- automation config: `/storage/openclaw/workspace/careerflow/automation.yaml`
- base resume template: `/storage/openclaw/workspace/careerflow/base_resume.rendercv.yaml`

Current schedule:

- `Automated Job Search`: weekdays at `13:15 UTC`

Useful commands:

```bash
docker exec openclaw-gateway node dist/index.js cron list
docker exec openclaw-gateway node dist/index.js cron runs --id <job-id>
docker exec openclaw-gateway node dist/index.js tasks list
```
