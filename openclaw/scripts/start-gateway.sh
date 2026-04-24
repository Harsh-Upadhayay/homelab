#!/bin/sh
set -eu

config_dir="${BOOTSTRAP_OPENCLAW_HOME:-/home/node/.openclaw}"
workspace_dir="${BOOTSTRAP_OPENCLAW_WORKSPACE:-$config_dir/workspace}"

mkdir -p "$config_dir" "$workspace_dir"

node /opt/openclaw/scripts/apply-config.mjs
exec node dist/index.js gateway --bind "${OPENCLAW_GATEWAY_BIND}" --port 18789
