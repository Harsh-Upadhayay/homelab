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

## Configure it
Use the browser dashboard for day-to-day admin and chat, or run CLI commands inside the stack:

```bash
cd openclaw
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli config
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli configure
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli config validate
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli dashboard --no-open
```

## Channels
```bash
cd openclaw
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli channels login
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli channels add --channel telegram --token "<token>"
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli channels add --channel discord --token "<token>"
```
