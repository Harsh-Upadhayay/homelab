#!/bin/sh
set -eu

workspace_dir="${BOOTSTRAP_OPENCLAW_WORKSPACE:-/workspace}"
skills_dir="$workspace_dir/skills"
skills_src_dir="${BOOTSTRAP_OPENCLAW_SKILLS_SRC_DIR:-/skills-src}"
sync_interval="${OPENCLAW_SKILL_SYNC_INTERVAL_SECONDS:-60}"

while true; do
  mkdir -p "$skills_dir"

  for dir in "$skills_src_dir"/careerflow-*; do
    [ -d "$dir" ] || continue
    name="$(basename "$dir")"
    tmp_dir="$skills_dir/$name.tmp"
    target_dir="$skills_dir/$name"

    rm -rf "$tmp_dir"
    cp -R "$dir" "$tmp_dir"
    rm -rf "$target_dir"
    mv "$tmp_dir" "$target_dir"
  done

  chown -R 1000:1000 "$skills_dir"/careerflow-* 2>/dev/null || true
  sleep "$sync_interval"
done
