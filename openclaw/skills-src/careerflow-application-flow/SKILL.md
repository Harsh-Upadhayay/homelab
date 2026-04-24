---
name: careerflow-application-flow
description: Run the full OpenClaw-first job search and application workflow by sequencing sourcing, bundle generation, review, and final submit/outreach gates.
---

Use this skill when the user asks for an end-to-end job search, application, or outreach workflow rather than a single isolated step.

Required behavior:

- Keep OpenClaw as the orchestrator. The local helper only handles bulk board search and deterministic artifact rendering.
- Run the workflow in this order unless the user explicitly narrows scope:
  1. `careerflow-source` to search helper-supported boards and identify browser-only follow-up work.
  2. OpenClaw browser verification on promising postings before recommending a target.
  3. `careerflow-generate-assets` only after the user chooses a specific role.
  4. `careerflow-review` before any send or submit action.
  5. `careerflow-submit-approved` only after explicit approval in the current session.
- Work one target role at a time once tailoring starts, so resume and cover-letter claims do not bleed across companies.
- Preserve a clear handoff between stages:
  - shortlist with URLs and disqualifiers
  - approved target role
  - generated artifact bundle path
  - approval decision
  - final submission or outreach summary
- Do not treat generated drafts as approved automatically.
