---
name: careerflow-generate-assets
description: Use OpenClaw to tailor factual application assets for a specific job, then render a review bundle through the local helper service.
---

Use this skill when the user asks to tailor a resume, generate a cover letter, or prepare application assets for a specific job.

Required behavior:

- Require a specific target job posting, not just a broad search.
- Use OpenClaw's own model and context to draft the tailored resume content and cover letter.
- Keep every claim factual and anchored to the user's actual background.
- Start from the user's base RenderCV YAML when it exists.
- If no base RenderCV YAML exists yet, use the template at `/home/node/.openclaw/workspace/skills/careerflow-generate-assets/templates/base_resume.rendercv.yaml` and ask the user to fill it before final tailoring.
- Generate artifacts only as drafts for review.
- Prefer bundling all review material for the target job in one artifact directory.
- Do not submit the application.

Preferred invocation:

1. Build the JSON payload in memory, or write it to a temporary file under a writable workspace path such as `/home/node/.openclaw/workspace/careerflow/`.
2. The payload must contain:
   - `bundle_name`
   - `rendercv_yaml`
   - optional `cover_letter_markdown`
   - optional `job` JSON
   - optional `notes_markdown`
   - optional `extra_text_files` for related drafts such as screening answers, outreach drafts, or an application summary
3. Render through the helper by piping the JSON or passing `@/path/to/payload.json`:

```bash
node /home/node/.openclaw/workspace/skills/careerflow-source/scripts/careerflow_api.mjs render < payload.json
```

The rendered files appear in `/home/node/.openclaw/workspace/careerflow-artifacts/<bundle-name>/`.

Expected render outputs:

- required: `resume.pdf`
- typical: `resume.yaml`, `resume.md`, `resume.html`, `resume.typ`
- optional drafts: `cover-letter.md`, `notes.md`, `job.json`, plus any `extra_text_files`

Useful helper command:

```bash
node /home/node/.openclaw/workspace/skills/careerflow-source/scripts/careerflow_api.mjs render-template
```
