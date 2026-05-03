# OpenClaw

Containerized OpenClaw Gateway with the bundled browser tool enabled for headed
browser automation.

## First run

Set the gateway token in `ops/.env.local`:

```bash
OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)
OPENCLAW_HOST=openclaw.${HOMELAB_DOMAIN}
```

Build the image and start the stack:

```bash
make build-openclaw
make up-openclaw
```

On first boot the gateway creates `openclaw.json` with the managed browser
enabled, headed mode selected, `browser.noSandbox=true`, and Chromium pinned to
`/usr/bin/chromium`. Existing configs are left alone. To re-apply those browser
settings later, run:

```bash
docker compose --env-file ../ops/.env.local --env-file ./app.env --profile setup run --rm openclaw-configure-browser
```

Then open `https://${OPENCLAW_HOST}` or use the local published gateway at
`http://127.0.0.1:18789`.

## Browser mode

The image bakes in Chromium via OpenClaw's documented Playwright install path
and exposes it at `/usr/bin/chromium`. The default display mode is `xvfb`, so
OpenClaw launches a headed browser (`browser.headless=false`) even on the
headless host.

If you want windows on the host X display instead, set:

```bash
OPENCLAW_BROWSER_DISPLAY_MODE=host
OPENCLAW_BROWSER_DISPLAY=:0
```

and add an X11 socket mount to `openclaw-gateway`. The host currently has an
Xorg server on `:0`, but this shell could not authenticate to it; `xvfb` avoids
that dependency.

Useful checks:

```bash
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli browser --browser-profile openclaw doctor --deep
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli browser --browser-profile openclaw status --json
docker compose --env-file ../ops/.env.local --env-file ./app.env run --rm openclaw-cli browser --browser-profile openclaw start
```
