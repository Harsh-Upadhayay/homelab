ARG OPENCLAW_BASE_IMAGE=ghcr.io/openclaw/openclaw:latest

FROM ${OPENCLAW_BASE_IMAGE}

USER root

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      xvfb \
      xauth && \
    install -d -m 0755 -o node -g node /home/node/.cache/ms-playwright && \
    PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright \
      node /app/node_modules/playwright-core/cli.js install --with-deps chromium && \
    chromium_path="$(find /home/node/.cache/ms-playwright -type f -path '*/chrome-linux*/chrome' | head -n 1)" && \
    test -n "$chromium_path" && \
    ln -sf "$chromium_path" /usr/bin/chromium && \
    install -d -m 1777 /tmp/.X11-unix && \
    chown -R node:node /home/node/.cache/ms-playwright && \
    rm -rf /var/lib/apt/lists/*

COPY --chown=node:node start-gateway.sh /usr/local/bin/openclaw-start-gateway
RUN chmod 755 /usr/local/bin/openclaw-start-gateway

ENV PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright

USER node
