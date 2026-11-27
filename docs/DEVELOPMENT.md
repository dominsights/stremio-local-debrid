# Developing with Codex

## Pattern and adaptation

The supplied codex-development-demo.zip demonstrates project rules, a reusable workflow, acceptance specs, one check command, continuous integration (CI) and human review. This project adopts those roles while keeping its architecture, features/ folder and M0-M5 milestones.

| Demo role | This project |
| --- | --- |
| AGENTS.md | Project boundaries, workflow, verification and privacy |
| .agents/skills/implement-change/SKILL.md | Prepared workflow source at docs/codex/implement-change/SKILL.md, installable into .agents |
| changes/*.md | features/<feature>/spec.md and security-hardening/M0.md through M5.md |
| npm run check | Syntax, locales, generated-doc drift and full behavioral tests |
| GitHub Actions | Existing Linux/macOS/Windows matrix runs the same core check |
| PR template / independent review | Spec/evidence links, actual check outcomes and fresh-session review prompt |

This adapts the demo; it is not a claim that one demo is an exhaustive official best-practice standard. No fictional task API, src/ layout or dependency-free demo constraint is copied into the application.

## Daily loop

1. Read AGENTS.md and features/README.md. Select the named spec and inspect existing code/evidence.
2. Prefer a separate branch. Preserve unrelated dirty files and private configuration. If Git is read-only, prepare concrete changes and report the branch/commit limitation instead of abandoning reversible work.
3. Establish acceptance criteria before implementation. Add meaningful failing regressions for missing behavior when feasible. Documentation-only work does not need artificial application tests.
4. Implement within scope, verify focused behavior, and inspect the diff.
5. Run npm run check. Record commands, actual results, tested revision and gaps. Failed/blocked stages do not pass. Keep HTTP, browser and device evidence separate.
6. Complete required user checkpoints. Authorization persists; an authorized production-first choice is recorded, not overridden by a generic staging suggestion.
7. Before authorized publication, review the explicit file list and author/committer identity. Exclude secrets, private notes, media, generated archives and detailed unrelated unpatched-security findings. Preserve license/provenance obligations.

## Install and verify

Use Node.js 24 as the .node-version/CI baseline. On a fresh checkout or when restoring/changing dependencies:

```sh
npm ci
```

Then run:

```sh
npm run check
```

The shared gate stops nonzero on a failed stage:

1. Parse root application modules and script/test/feature ES modules with node --check (parse only, not module execution).
2. Run npm run check:locales.
3. Run npm run build:docs.
4. Compare only generated docs/LANGUAGES.md, docs/guides, public/locales and public/configure output with Git; handwritten development docs are excluded. Include regenerated assets with translation changes. Inspect pre-existing edits rather than discarding them.
5. Run npm test, including real loopback HTTP/WebTorrent contracts.

The runner uses Node's child-process API without shell concatenation. It does not install dependencies, approve scripts, deploy or skip failures. Existing individual commands remain available for diagnosis.

CI installs dependencies and runs this same check on Linux/macOS/Windows. Windows CI also runs scripts/check-windows-startup.mjs, which registers a temporary startup task on a disposable runner. It is intentionally excluded from normal local checks. The Pages publishing workflow is unchanged.

A known Windows runner restriction blocks the startup-validator child PowerShell script (AuthorizationManager check failed). The check must report that failure honestly. Historical VM/user passes do not replace verification of changed code. Native browser/TV tests remain opt-in/manual; HTTP success alone does not prove those contracts.

## Install the reusable workflow

The prepared source is [docs/codex/implement-change/SKILL.md](codex/implement-change/SKILL.md). AGENTS.md points to it, so the written workflow can be followed before automatic discovery is installed.

This session's .agents directory is write-protected. In the user's normal project PowerShell terminal, install the prepared copy:

```powershell
New-Item -ItemType Directory -Force .agents/skills/implement-change | Out-Null
Copy-Item docs/codex/implement-change/SKILL.md .agents/skills/implement-change/SKILL.md
```

If an installed copy already exists, compare it before replacing it. After edits to the source, synchronize the installed copy. Reopen the Codex session if needed for skill discovery. The source is a repository workflow file, not an installed plugin.

## Implementation prompt

After skill installation:

> Use $implement-change for features/security-hardening/M2.md. Read its task IDs and evidence, establish meaningful failing regressions, implement only M2, run npm run check, and report each acceptance criterion. Complete independent work before handing off checkpoint C2. Preserve private configuration and keep later milestones out of scope.

Before installation, use:

> Follow docs/codex/implement-change/SKILL.md for features/<feature>/spec.md and report acceptance/evidence using AGENTS.md.

These examples are prompts, not authorization to begin M2 or deferred layout work now.

## Independent review prompt

Open a fresh Codex session on the same checkout:

> Review the current diff against features/<feature>/spec.md and AGENTS.md. Inspect source/tests for compatibility, validation order, persistence, error paths, concurrency and privacy relevant to the change; run npm run check. Do not modify files, publish or deploy. Report actionable findings with file references and verification gaps. Distinguish browser/device observations from HTTP simulations.

A fresh review is recommended for significant changes, not a command to spawn subagents or a guarantee of correctness. Branch protection can require the existing Tests / test jobs; repository settings have not been configured by this migration.

## Evidence and publication boundaries

- Current acceptance: milestone/feature specs and features/README.md.
- Detailed history: M0_EVIDENCE.md, M1_EVIDENCE.md and download-controls/RESULTS.md. Earlier pending statuses remain historical.
- Implementation order: security-hardening/SECURITY_TASKS.md, with stable Txx IDs.
- Private operations: ignored VM_UPDATE.md, TV_CHECKPOINT.md and runtime data. Do not bulk-publish them.
- M2-M5 remain planned; layout remains deferred. No runtime deployment is part of this workflow migration.
