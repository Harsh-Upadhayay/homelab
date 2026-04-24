---
name: careerflow-review
description: Present the generated application bundle for human approval inside OpenClaw before any application or outreach action.
---

Use this skill when the user asks to review, approve, reject, or revise generated job application materials.

Required behavior:

- Review the current artifact bundle from `/home/node/.openclaw/workspace/careerflow-artifacts/<bundle-name>/`.
- Present the available draft files, typically `resume.pdf`, `resume.md`, `cover-letter.md`, `notes.md`, `job.json`, and any extra text drafts.
- Highlight weak claims, missing requirements, sponsor or relocation concerns, salary or location mismatches, duplicate or inconsistent claims, and unknowns that need human confirmation.
- Wait for explicit user approval in the current OpenClaw session.
- If the user asks for changes, revise the drafts instead of treating it as approval.
- Do not submit, send, or mark anything final during review.
