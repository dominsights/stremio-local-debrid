# Manual torrent download controls

Status: implemented; production controls and authorization correction user-confirmed on 2026-11-25. Automated verification has an explicit Windows startup-validator gap.

## Goal

Let the user stop an abandoned source manually and choose whether to keep or delete its downloaded data, without automatically cancelling another source or device's work.

## Why and evidence

Switching from a failing playback source left its torrent downloading while a second source started. Existing persistent background downloads are intentional; control belongs to the user. Requirements and behavior are in [README.md](README.md), real HTTP/WebTorrent verification and dated production results in [RESULTS.md](RESULTS.md).

## Scope

Whole-torrent confirmation with keep/delete choices, durable stopped state/progress, playback resume, cache reservation release, authorization and active HTTP reader protection. Keep M1 media protections and default background downloads. Exclude PR #6 streaming-only behavior, automatic duplicate-source cancellation, partial-media eviction, later security milestones and layout changes.

## Acceptance criteria

- [x] AC1: Dashboard confirmation lists affected files and offers explicit keep/delete choices; opening GET/HEAD does not mutate state.
- [x] AC2: Keep stops the client torrent, retains partial bytes/progress across service restart, avoids automatic resume and resumes on playback.
- [x] AC3: Delete removes only the validated managed torrent directory/metadata/jobs and releases its cache reservation; saved job.path is never a deletion target.
- [x] AC4: Active HTTP readers reject either mutation; conflicting operations are serialized and unrelated torrents are preserved.
- [x] AC5: Authenticated signed POST forms reject forged/cross-site requests and oversized/invalid bodies. Null Origin from no-referrer native forms is accepted only with same-origin browser metadata and the valid signature.
- [x] AC6: M1 headers, supported selections, byte ranges, intentional background downloads and offline/restart regression tests still pass.

## Implementation tasks

Completed implementation checklist remains in [README.md](README.md); evidence and the browser-form correction are in [RESULTS.md](RESULTS.md). Do not treat the user's explicit production-first choice as an unfinished mandatory staging step.

## Verification and evidence

| Criteria | Evidence | Actual outcome |
| --- | --- | --- |
| AC1-AC5 | test/download-controls.test.mjs, test/checkpoint.test.mjs | Real HTTP/WebTorrent coverage, including restart and gateway forwarding |
| AC5 native form | Header regression failed 403 before correction, passed afterward; user retried the deployed form | User confirmed production correction worked; current headless-browser runner did not produce a DOM |
| AC6 | test/playback-security.test.mjs, test/service.test.mjs | Included in 14/14 focused passing tests |
| Full gate before this workflow migration | npm test, 2026-11-25 | 24 passed / 1 existing PowerShell-policy-blocked startup validator, 25 total |

Implementation commit: f385020, based on M1 and its credits. This evidence is historical, not a new run. The shared gate is now npm run check; new revisions must record its actual result.

## Manual checkpoint

User deployed M1 plus controls directly to production with compatibility/readiness checks and a code backup, then confirmed the corrected controls worked. Individual production restart, TV and active-reader checks were not enumerated, so they are not separately claimed. Earlier M1 TV acceptance remains scoped to its original candidate.

Private host-specific instructions stay in ignored local VM_UPDATE.md. Do not publish that file or credential-bearing screenshots. No new deployment is part of this workflow migration.

## Handoff and limitations

Stopped data still reserves space until deleted. Deletion applies to every file in a torrent and cannot be undone by code rollback. Buffered playback may outlive an HTTP reader, so close players before confirming. Layout remains [deferred](../dashboard-layout/spec.md). Native-browser form automation and full platform verification have explicit environment gaps.
