#!/usr/bin/env node

import fs from "node:fs";

const baseUrl = (process.env.CAREERFLOW_API_URL || "http://127.0.0.1:18810").replace(/\/$/, "");
const SEARCH_TEMPLATE = {
  search_term: "software engineer",
  location: "Tokyo, Japan",
  job_boards: ["linkedin", "indeed", "google"],
  results_wanted: 25,
  hours_old: 168,
  is_remote: false,
  country_indeed: "usa",
  fetch_descriptions: false,
  description_format: "markdown",
  require_any_keywords: [],
  require_all_keywords: [],
  exclude_keywords: [],
  language_blacklist: [],
};

const RENDER_TEMPLATE = {
  bundle_name: "company-role",
  rendercv_yaml: "# Paste full RenderCV YAML here\n",
  cover_letter_markdown: "# Cover letter draft\n",
  notes_markdown: "- Target company\n- Key requirements\n- Risks and unknowns\n",
  job: {
    title: "Software Engineer",
    company: "Example Co",
    location: "Remote",
    url: "https://example.com/jobs/software-engineer",
  },
  extra_text_files: {
    "application-summary.md": "# Application summary\n",
    "screening-answers.md": "# Screening answers\n",
  },
};

function readInput() {
  const argParts = process.argv.slice(3);
  if (argParts.length > 0) {
    const joined = argParts.join(" ").trim();
    if (joined.startsWith("@")) {
      return fs.readFileSync(joined.slice(1), "utf8").trim();
    }
    if (joined) return joined;
  }

  try {
    return fs.readFileSync(0, "utf8").trim();
  } catch {
    return "";
  }
}

function parseJsonOrQuery(input) {
  if (!input) return {};
  try {
    return JSON.parse(input);
  } catch {
    return { natural_language_query: input };
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    console.error(JSON.stringify({ status: response.status, body }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(body, null, 2));
}

async function main() {
  const command = process.argv[2] || "capabilities";
  const input = readInput();

  if (command === "healthz") {
    await request("/healthz");
    return;
  }

  if (command === "capabilities") {
    await request("/capabilities");
    return;
  }

  if (command === "search-template") {
    console.log(JSON.stringify(SEARCH_TEMPLATE, null, 2));
    return;
  }

  if (command === "render-template") {
    console.log(JSON.stringify(RENDER_TEMPLATE, null, 2));
    return;
  }

  if (command === "search" || command === "source") {
    const payload = parseJsonOrQuery(input);
    await request("/source/search", { method: "POST", body: JSON.stringify(payload) });
    return;
  }

  if (command === "render") {
    const payload = parseJsonOrQuery(input);
    await request("/artifacts/render", { method: "POST", body: JSON.stringify(payload) });
    return;
  }

  throw new Error(
    `Unknown command: ${command}. Supported commands: healthz, capabilities, search-template, render-template, search, source, render`,
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exit(1);
});
