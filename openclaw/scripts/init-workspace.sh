#!/bin/sh
set -eu

config_dir="${BOOTSTRAP_OPENCLAW_HOME:-/home/node/.openclaw}"
workspace_dir="${BOOTSTRAP_OPENCLAW_WORKSPACE:-$config_dir/workspace}"
skills_dir="$workspace_dir/skills"
skills_src_dir="${BOOTSTRAP_OPENCLAW_SKILLS_SRC_DIR:-/opt/openclaw-careerflow-skills}"

mkdir -p "$config_dir" "$workspace_dir" "$skills_dir"

if [ -d "$skills_src_dir" ]; then
  rm -rf "$skills_dir"/careerflow-*
  cp -R "$skills_src_dir"/careerflow-* "$skills_dir"/ 2>/dev/null || true
fi

chown -R 1000:1000 "$config_dir"
