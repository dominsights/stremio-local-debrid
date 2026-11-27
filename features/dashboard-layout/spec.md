# Dashboard table layout

Status: deferred by the user; specification only. No layout implementation authorized in the current workflow task.

## Goal

Keep long cached-media filenames readable without squeezing Status, Progress and Actions into mid-word wrapping.

## Why and evidence

The production screenshot supplied on 2026-11-25 shows long filenames crowding the other columns. The user explicitly chose to leave the layout for later. Do not copy the screenshot, private addon URL or media names into repository evidence.

## Scope

Future table sizing, wrapping and narrow-screen layout; accessible action labels. Preserve stop/keep/delete semantics, authentication, locale selection, range/playback behavior and state. Backend behavior is excluded.

## Acceptance criteria

- [ ] AC1: Long synthetic filenames wrap within their column while short status/progress labels remain readable without mid-word breaks.
- [ ] AC2: Actions remain visible and usable on desktop and narrow/mobile layouts, with keyboard-accessible links/buttons.
- [ ] AC3: Existing locale direction and download controls still work without exposing private data in screenshots/evidence.

## Implementation tasks

- [ ] Begin only on a later explicit layout request.
- [ ] Inspect current rendered table/CSS and create a synthetic long-filename fixture.
- [ ] Apply scoped layout changes and inspect actual browser rendering at relevant widths/directions.
- [ ] Run relevant checks and npm run check; record before/after observations without real private URLs.

## Verification and evidence

Not implemented or tested. A future UI/layout change needs actual visual inspection, not only HTML string assertions.

## Manual checkpoint

Compare desktop and narrow-screen readability using synthetic media names; verify the controls are reachable and unchanged. No checkpoint is being requested now.

## Handoff and limitations

Backlog/deferred work only. This spec does not close the layout issue or authorize implementing it as a side effect of the workflow migration.
