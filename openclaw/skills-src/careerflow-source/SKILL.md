---
name: careerflow-source
description: Source jobs with the local helper service for helper-supported boards, then use the OpenClaw browser to verify, extend, and rank the shortlist.
---

Use this skill when the user asks to find, source, search, rank, or filter jobs.

OpenClaw owns the reasoning and browsing flow. Use the local helper only for bulk aggregation.

Required behavior:

- Treat the helper as a deterministic search backend, not as the final decision-maker.
- Use helper-supported boards first: `linkedin`, `indeed`, `glassdoor`, `google`, `zip_recruiter`.
- Route browser-only boards straight to OpenClaw browsing: `wellfound`, `himalayas`, `remoteok`, `remote_ok`.
- Turn the user's request into a structured helper payload. Use these fields when relevant:
  - required: `search_term` or `natural_language_query`
  - common: `location`, `job_boards`, `results_wanted`, `is_remote`, `hours_old`
  - board-specific: `google_search_term`, `country_indeed`
  - filtering: `require_any_keywords`, `require_all_keywords`, `exclude_keywords`, `language_blacklist`
  - enrichment: `fetch_descriptions`, `description_format`
- Prefer helper-side filtering over manual post-filtering when the user specifies must-have or disqualifying terms.
- Keep `fetch_descriptions` off for broad sourcing. Turn it on only when body text is needed for a tighter shortlist, because it is slower.
- Respect the helper limits:
  - `results_wanted` maximum is `200`
  - supported-board searches paginate automatically
  - filtered searches expand the upstream fetch window before trimming back to the requested count
- Read and surface helper `notes`, especially partial board failures and unsupported-board reminders.
- Browse the actual job page for promising matches before presenting a final shortlist.
- Return the shortlist with job title, company, location, board, URL, posted date when available, and any disqualifiers you found.
- Do not submit applications or send messages.

Preferred invocation:

```bash
node {baseDir}/scripts/careerflow_api.mjs search '{"search_term":"software engineer","location":"Tokyo, Japan","job_boards":["linkedin","indeed","google"],"results_wanted":30,"hours_old":168,"require_any_keywords":["backend","platform","distributed systems"],"exclude_keywords":["senior director","staff frontend"],"language_blacklist":["japanese required","business japanese","jlpt"],"fetch_descriptions":true,"description_format":"markdown"}'
```

Useful helper commands:

```bash
node {baseDir}/scripts/careerflow_api.mjs healthz
node {baseDir}/scripts/careerflow_api.mjs capabilities
node {baseDir}/scripts/careerflow_api.mjs search-template
```
