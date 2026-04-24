# Careerflow service integration

This directory contains only homelab runtime integration files for the helper service:

- `compose.yml`
- `app.env`

The full service source code has been moved to `/home/neovara/careerflow`.

The homelab service now expects a `careerflow` image tag configured in `ops/.env.local`. Build locally with `docker build -t careerflow:latest /home/neovara/careerflow` or publish the image externally; this folder now holds only the homelab stack inputs.
