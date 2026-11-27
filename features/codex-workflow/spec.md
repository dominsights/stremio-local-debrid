# Adopt the Codex demo development workflow

Status: implemented and locally verified with an explicit full-gate environment failure. Automatic skill installation and Git branch creation remain environment-blocked.

## Goal

Apply the supplied demo's project instructions, reusable implementation workflow, acceptance specs, unified checks, CI and review evidence to the existing Stremio Local Debrid project.

## Why and evidence

The demo separates these responsibilities clearly. Existing M0/M1 and download-control evidence is thorough but current status is mixed with historical partial results, and local/CI commands are maintained separately. Preserve that evidence while making the next change easier to execute and review.

Reference archive: codex-development-demo.zip, SHA-256 `86a7fa676461ed37187051e8a52288fa8a57c237b02bc504f3fd0f2e91629308`. Inspected its AGENTS.md, reusable skill, two change specs, package scripts, CI and PR template. The archive was read as a reference; its app/demo implementation was not imported.

## Scope

Documentation, feature specs, one verification runner, package script, Node baseline file, CI wiring and PR template. Preserve application/runtime code, current tests, dependency versions/lockfile, deployment configuration and historical security evidence. Do not implement M2-M5, deferred layout, or another runtime deployment.

## Acceptance criteria

- [x] AC1: AGENTS.md defines actual project boundaries, verification, checkpoint/evidence and privacy rules instead of the demo's fictional app rules.
- [x] AC2: A reusable implement-change workflow is prepared and referenced; documentation gives its automatic-discovery installation step and reports the protected-directory limitation.
- [x] AC3: features/ keeps M0-M5 IDs, current acceptance specs, stable task IDs and links to retained historical evidence. Download controls and deferred layout have clear scopes/status.
- [x] AC4: npm run check and the existing three-platform CI use the same core gate, preserving the CI-only native startup check and Pages deployment workflow.
- [x] AC5: PR template, feature template and development guide connect criteria, regressions, actual results, independent review and privacy/publishing boundaries.
- [x] AC6: Execute the shared gate, inspect links/diffs and record actual results, including expected environment blocks, without converting them into a pass.

## Implementation tasks

- [x] Inspect the exact reference archive and existing project evidence/CI.
- [x] Add adapted project rules, reusable workflow source and templates.
- [x] Add per-milestone/current feature specs without deleting historical reports.
- [x] Consolidate local/CI verification; retain cross-platform and native CI coverage.
- [x] Validate the new workflow and record the handoff with actual results and limitations.

## Verification and evidence

Verified on 2026-11-26 against base commit `f385020d0eb692311267073e51ee3dd8e1bd1074` plus these uncommitted workflow changes, Node.js 24.20.0 on Windows.

| Check | Actual result |
| --- | --- |
| Exact archive inspection | Completed; archive SHA-256 recorded above |
| Internal links / private identifier scan | PASS for 16 new workflow/spec Markdown files |
| Shared gate: ES module syntax | PASS for 30 root/script/test/feature modules |
| Shared gate: locale dictionaries | PASS: 51 locales, 60 existing dictionary strings each |
| Shared gate: documentation generation | PASS: 51 guides/portal dictionaries generated |
| Shared gate: tracked generated-file drift | PASS; handwritten development docs excluded from the generated path set |
| Shared gate: full suite | 24 passed / 1 existing PowerShell-policy-blocked failure, 25 total |
| Shared gate exit code | 1, correctly propagated; no pass claim, skip or policy bypass |
| CI inspection | Existing three-OS matrix, read-only permissions, Node 24 baseline and CI-only startup registration retained; core command unified. Hosted CI not run here. YAML parser unavailable, so text inspection is not claimed as parsed/hosted validation. |
| Diff scope | Runtime modules, application tests, dependency lockfile and Pages workflow unchanged; pre-existing generated-file status noise preserved |
| Automatic skill discovery | Not installed: .agents is read-only; complete source and copy instructions prepared |
| Git branch / publishing | Branch creation denied by read-only .git; no commit, push, PR or VM deployment performed |

No application tests were added for this documentation/configuration migration. The actual shared gate verifies the workflow and existing behavioral suite. The final gate was run after narrowing generated-file drift checks to the real generator outputs. A local gate failure is retained even though implementation/spec migration is complete.

## Manual checkpoint

Review features/README.md and this spec. The user's normal PowerShell terminal must install the prepared skill into the protected .agents/skills/implement-change directory. Until then AGENTS.md directs the written workflow explicitly; automatic discovery is not claimed. No TV or VM retest is needed for a workflow-only change.

## Handoff and limitations

Git could not create chore/codex-workflow because .git is read-only in this environment. Authorized reversible changes are prepared in the working tree on the current branch; no commit/push/PR or repository branch-protection change is claimed. Skill auto-discovery installation is blocked by read-only .agents, with the complete source available at docs/codex/implement-change/SKILL.md. Publishing must use a reviewed sanitized file list; detailed local security notes are not implicitly public.

Credits and matching prepared usage record: [CREDITS.md](CREDITS.md). Upstream provenance submission is pending the same Git/authentication limitations; no submission is invented.
