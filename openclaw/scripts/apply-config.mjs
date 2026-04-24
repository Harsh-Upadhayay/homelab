#!/usr/bin/env node

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const env = process.env;

const required = [
  "OPENCLAW_GATEWAY_BIND",
  "OPENCLAW_GATEWAY_PORT",
  "OPENCLAW_HOST",
  "OPENCLAW_DEFAULT_MODEL",
  "OPENCLAW_FALLBACK_MODEL",
  "OPENCLAW_BROWSER_PROFILE",
  "OPENCLAW_BROWSER_CDP_URL",
  "OPENCLAW_BROWSER_COLOR",
  "CAREERFLOW_API_URL",
];

for (const name of required) {
  if (!env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const basePath =
  env.BOOTSTRAP_OPENCLAW_BATCH_BASE_FILE ||
  "/opt/openclaw/config/batch/base.json";
const baseConfig = JSON.parse(await readFile(basePath, "utf8"));

const allowedOrigins = [
  `http://localhost:${env.OPENCLAW_GATEWAY_PORT}`,
  `http://127.0.0.1:${env.OPENCLAW_GATEWAY_PORT}`,
  `https://${env.OPENCLAW_HOST}`,
];

const batch = [
  ...baseConfig,
  { path: "gateway.bind", value: env.OPENCLAW_GATEWAY_BIND },
  { path: "gateway.controlUi.allowedOrigins", value: allowedOrigins },
  { path: "browser.defaultProfile", value: env.OPENCLAW_BROWSER_PROFILE },
  {
    path: `browser.profiles.${env.OPENCLAW_BROWSER_PROFILE}.cdpUrl`,
    value: env.OPENCLAW_BROWSER_CDP_URL,
  },
  {
    path: `browser.profiles.${env.OPENCLAW_BROWSER_PROFILE}.color`,
    value: env.OPENCLAW_BROWSER_COLOR,
  },
  {
    path: "agents.defaults.model",
    value: {
      primary: env.OPENCLAW_DEFAULT_MODEL,
      fallbacks: [env.OPENCLAW_FALLBACK_MODEL],
    },
  },
  {
    path: "env.CAREERFLOW_API_URL",
    value: env.CAREERFLOW_API_URL,
  },
];

if (env.OPENCLAW_CONTROL_UI_DISABLE_DEVICE_AUTH === "true") {
  batch.push({
    path: "gateway.controlUi.dangerouslyDisableDeviceAuth",
    value: true,
  });
}

const tmpDir = await mkdtemp(join(tmpdir(), "openclaw-config-"));
const batchFile = join(tmpDir, "config-set.batch.json");
await writeFile(batchFile, JSON.stringify(batch, null, 2));

const child = spawn(
  "node",
  ["dist/index.js", "config", "set", "--batch-file", batchFile],
  {
    stdio: "inherit",
    env,
  },
);

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
