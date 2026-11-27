---
name: implement-change
description: Implement a named Stremio Local Debrid feature or milestone from features/, with acceptance criteria, behavioral verification and evidence. Use for requested feature/fix implementation or milestone work; not as authorization to deploy or publish.
---

1. Read AGENTS.md, features/README.md and the named spec. For security milestones also read the relevant design/task IDs and evidence. Inspect application contracts and tests. Preserve unrelated work and accepted milestone results.
2. Establish the baseline: branch, commit, dirty files, scope and acceptance status. Prefer a separate branch. If Git writes are blocked, continue authorized reversible work, retain a concrete handoff and report the limitation.
3. Map acceptance criteria to evidence. Add a focused failing regression for missing behavior when appropriate. For forms/native players, plan actual browser/device checks separately from fetch/HTTP tests. Keep fixtures synthetic and bounded. Documentation-only changes do not need artificial application tests.
4. Make the smallest coherent implementation. Preserve token/state formats, ranges and lifecycle behavior unless explicitly revised. Do not implement later milestones or deferred layout incidentally.
5. Run focused checks, then npm run check. Inspect generated/new files. Never bypass execution policy, disable checks, weaken security or change tests to hide an environment failure. Record failed/blocked results as such. Repeat verification only when changes or unresolved issues justify it.
6. Update acceptance and dated evidence. Link existing reports instead of copying conflicting status logs. Mark manual checkpoints passed only on actual results, preserving their device/revision scope. Existing authorization overrides generic staging suggestions; record an authorized production-first choice honestly.
7. Review the diff against every criterion. If delivery is in scope, prepare concrete backup/rollback instructions with private host-specific data kept in ignored files. Before authorized publishing, inspect the explicit file list and author/committer identity and preserve matching provenance records/credits. Report blocked submissions honestly.
8. Hand off changed behavior, checks/results, remaining criteria and the next checkpoint. A fresh-session read-only review is useful for significant work; it is not authorization to spawn subagents or create extra approval steps.
