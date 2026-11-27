# Feature and milestone index

The demo's acceptance-spec pattern uses this project's existing features/ organization, not a second changes/ backlog. Security work keeps M0-M5 IDs. Detailed task IDs remain in SECURITY_TASKS.md; milestone specs capture current acceptance and link historical evidence.

| Work | Current outcome | Spec |
| --- | --- | --- |
| M0: baseline evidence | Accepted for scoped browser baseline, 2026-11-20 | [M0](security-hardening/M0.md) |
| M1: safe playback | Accepted for tested browser/Stremio/TV workflow; PR #7 and provenance PR #8 submitted | [M1](security-hardening/M1.md) |
| M2: outbound destinations | Planned; not started | [M2](security-hardening/M2.md) |
| M3: upstream processing limits | Planned; not started | [M3](security-hardening/M3.md) |
| M4: metadata storage accounting | Planned; not started | [M4](security-hardening/M4.md) |
| M5: integrated verification | Planned; depends on earlier milestones | [M5](security-hardening/M5.md) |
| Manual download controls | Implemented; user confirmed production/form fix; verification limitations recorded | [Spec](download-controls/spec.md) |
| Dashboard table layout | Deferred by user; spec only | [Spec](dashboard-layout/spec.md) |
| Codex development workflow | Implemented; check results and protected-directory installation gap recorded | [Spec](codex-workflow/spec.md) |

Start new work with [_template.md](_template.md). See [the development guide](../docs/DEVELOPMENT.md) for implementation/review prompts, commands and artifact boundaries.

This index records current status, not a rerun of historical evidence. Preserve dated partial/failed observations; later explicit acceptance supersedes them only within the tested scope. Do not close M2-M5 because M1 or download controls passed.

Some detailed security/reproduction notes and deployment instructions are intentionally local or ignored. For a public PR choose only the sanitized documents needed for that change; never expose private deployment details or unrelated unpatched findings merely to make every local evidence link public.
