# <Feature or milestone ID>: <title>

Status: planned

## Goal

Observable user/developer outcome.

## Why and evidence

Observed problem or design need, supporting code/evidence, and qualifications. No private URLs, real identities, deployment configuration or screenshots in publishable text.

## Scope

Included behavior, contracts to preserve, exclusions and milestone dependencies.

## Acceptance criteria

- [ ] AC1: Observable success and relevant existing behavior preserved.
- [ ] AC2: Invalid/error/concurrent or security behavior appropriate to this change.
- [ ] AC3: Required compatibility/manual checkpoint, scoped to actual evidence.

## Implementation tasks

- [ ] Inspect source and establish baseline evidence.
- [ ] Add meaningful behavioral regressions; demonstrate expected pre-fix failure when feasible.
- [ ] Implement within scope.
- [ ] Run focused verification and npm run check; inspect the intended diff.
- [ ] Record actual results and manual acceptance without claiming unrun checks.

Existing security milestones reference stable Txx tasks in SECURITY_TASKS.md instead of copying that checklist here.

## Verification and evidence

| Criterion | Evidence / command | Actual result and date |
| --- | --- | --- |
| AC1 | Not selected | Not run |
| AC2 | Not selected | Not run |
| AC3 | Not selected | Not run |

Baseline/revision: not recorded. Default final gate: npm run check. Install with npm ci on a fresh checkout or when restoring/changing dependencies. Failed/blocked checks remain failures, never implicit passes.

## Manual checkpoint

Concrete steps, expected outcome, requested result and cleanup/rollback. Keep private host-specific instructions in ignored local notes. If unnecessary, state why.

## Handoff and limitations

What is complete, what remains and whether a commit, upstream PR or deployment actually happened.
