# Stremio Local Debrid: development instructions

## Project boundaries

- Use Node.js 24 for the supported development/continuous integration (CI) baseline; package.json still permits newer supported Node versions.
- This is an existing application with root-level ES modules. Do not copy the demo's src/ layout or fictional task API into it.
- HTTP/authentication, download jobs and playback live in server.mjs; dashboard HTML in ui.mjs; source discovery in addons.mjs; torrent conversion in torrents.mjs. Setup/runtime installation lives in setup.mjs, install.mjs and startup.mjs. Locales and generated guides have their existing build/check scripts.
- Preserve access tokens, signed descriptors, configuration and state compatibility, byte ranges, background downloads and offline/restart recovery unless the active feature spec explicitly revises them.

## Change workflow

- Read features/README.md, then the named feature spec. Security milestones remain M0-M5; detailed implementation task IDs remain in features/security-hardening/SECURITY_TASKS.md. The repeatable workflow source is docs/codex/implement-change/SKILL.md; use an installed .agents/skills/implement-change/SKILL.md copy when available. The .agents directory may be write-protected in this environment.
- Add/update a feature spec for user-visible behavior or a significant workflow change. State the goal, rationale, scope, acceptance criteria, implementation tasks, evidence and any manual checkpoint before implementing.
- Prefer a separate branch per change. Preserve existing dirty files. If Git metadata is read-only, prepare the authorized changes without committing/pushing and report the exact limitation; do not halt reversible work solely for branch creation.
- For behavior changes, add meaningful regressions and demonstrate the expected pre-fix failure when feasible. Use real local HTTP/WebTorrent fixtures for relevant contracts. Do not manufacture failing tests for documentation-only work or treat implementation-mirroring tests as useful evidence.
- Stay within the requested feature. M2-M5 security work and the deferred dashboard layout are not authorized by a workflow-only request.

## Verification and evidence

- Install locked dependencies with npm ci on a fresh checkout or when the dependency tree/lockfile requires it. Do not force incompatible audit fixes, disable required scripts or broaden script approvals to make checks pass.
- Run npm run check before handoff. It checks ES module syntax, locales, generated documentation drift and the full test suite. CI runs the same command on Linux, macOS and Windows; Windows CI additionally exercises real Task Scheduler registration on its disposable runner.
- Keep the CI-only startup registration script out of normal local checks: it changes OS startup registration.
- Record the exact commands, actual results, tested revision/working tree and environment limitations in the feature spec or linked evidence. A blocked/failed check must remain nonzero and must never be reported as passed or silently skipped.
- Separate automated evidence, real browser observations and user-reported TV/VM acceptance. A passing HTTP test is not proof that a native form, browser decoder or TV works. Earlier pending evidence is historical when a later dated result supersedes it.
- At a planned manual checkpoint, finish the independent work, provide concrete instructions and wait only for dependent test results. Existing authorization persists; do not ask again for already authorized actions.

## Privacy, delivery and review

- Use synthetic fixtures. Never commit real private URLs/tokens, session keys, provider configuration, downloaded media, local deployment state, identifying paths, screenshots containing credentials or private VM notes. Local evidence may be deliberately untracked/ignored; do not publish all of features/ indiscriminately.
- Review an explicit commit file list and its contents. Review Git author AND committer metadata before publishing; use the user's chosen public identity/noreply address rather than exposing private contact information.
- Preserve MIT-PoU notices and matching provenance credits/records. If upstream submission is blocked, prepare the concrete record and report it; do not invent a successful submission.
- Summarize changed behavior, acceptance results, checks actually run and remaining gaps. Use the PR template and link the active spec. Do not deploy, push or open a PR solely because a template mentions it; follow the user's authorized scope.
- Independent review can be requested in a fresh Codex session using docs/DEVELOPMENT.md. Do not spawn review subagents unless explicitly requested or otherwise authorized.
