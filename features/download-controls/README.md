# Download controls

Branch: `feature/download-controls`. Includes the existing M1 safe-media selection and browser response protections; PR #6 streaming-only mode is not imported.

## Behavior

The dashboard's **Stop download…** link opens a confirmation page listing every job belonging to that torrent. **Stop and keep files** removes the torrent from the running client, records unfinished jobs as stopped, saves progress and keeps media/metadata. Stopped jobs do not restart automatically; requesting playback resumes them. Complete jobs stay complete.

**Stop and delete files** removes the torrent's entire managed cache directory, metadata and job records, releasing its cache reservation. This is torrent-wide because files can share pieces. Other torrents are untouched. Any active playback reader for that torrent blocks both operations with HTTP 409; close playback on every device first. Stopping the video alone still leaves downloads running unless you explicitly use these controls.

Mutations require the existing private token and a signed form submitted with POST. GET/HEAD only display confirmation. Cross-origin form requests are rejected, bodies are limited to 1 KiB, and no filesystem path comes from a submitted form or saved job.path. Per-torrent operations and shared cache mutations are serialized to avoid playback/delete races. Keep/delete persistence failures report an error rather than claiming success.

Stopped files continue to reserve cache space until explicitly deleted. Automatic partial-file eviction is not included. Deleting a torrent is irreversible; code rollback cannot restore its media. No automatic same-movie cancellation is introduced.

Controls are provided in English and Portuguese; other locales use English for these new controls. Existing locale dictionaries and guides remain unchanged.

## Tasks and checkpoint

- [x] Add dashboard confirmation, keep/delete controls and stopped status.
- [x] Persist stop state/progress and resume on playback.
- [x] Block mutations during playback; serialize conflicting work.
- [x] Protect POST actions and constrain filesystem deletion targets.
- [x] Exercise real local WebTorrent transfers, two files in one torrent, restart/resume, isolation from another torrent, cache release, form authorization and active playback.
- [x] Run repository checks and record the environment-blocked startup validator in [RESULTS.md](RESULTS.md).
- [ ] Staging acceptance deferred: user explicitly chose direct production deployment.
- [x] User deployed combined M1 + controls to production; compatibility and manifest readiness passed, code backup created. User subsequently reported the controls worked.

Manual checkpoint (staging first):

1. Play a test video, then close playback. Open the private dashboard, choose Stop download…, and verify the affected filename(s).
2. Choose Stop and keep files. Confirm Stopped, retained progress and unchanged cache reservation. Restart staging; it must stay stopped. Play the video again; it must resume and seek correctly.
3. While playback is active, try both actions: each must be rejected without interrupting the video.
4. Close playback, choose Stop and delete files, and verify the row/reservation disappears. Check another torrent remains available.
5. Repeat normal TV playback, seeking and stop/reopen through the existing HTTPS route. M1 protections must still be present.

See [VM_UPDATE.md](VM_UPDATE.md) for the combined update. All private URLs and configuration remain local; do not commit generated bundles, deployment state or personal details.

## Credits

Based on [Stremio Local Debrid](https://github.com/origami-ltd/stremio-local-debrid), copyright Origami Ltd, under its MIT-PoU license. Manual download controls and verification assisted by OpenAI Codex GPT-6 for the individual public contributor account `dominsights`. Usage timestamp: `2026-11-25T21:44:57Z`. Provenance SHA-256: `3ec5914fa182d15fcec891de95423552e8de952630fc88fff4eadc61025a8b25`. Matching usage row is prepared in `PROVENANCE_ROW.md`; submission to the upstream proof-of-usage branch is pending Git write/authentication access.

## Deferred layout follow-up

- [ ] Improve dashboard table sizing for long filenames. The production screenshot shows Status and Progress wrapping inside words and the action link splitting over lines. Reserve sensible widths for these columns and let filenames wrap, with a usable narrow-screen layout. User requested deferring this change; no layout modification is authorized now.

Production result (2026-11-25): user reported that the deployed controls worked. Individual restart/TV/protection checks were not enumerated, so they are not separately marked passed. Private URL and media names from the screenshot are intentionally not copied into documentation.

### Native-form compatibility correction

Production deletion later reported an authorization error. Fixed the matching no-referrer native POST case by allowing Origin: null only with same-origin fetch metadata and the mandatory signed form field. Cross-site/unknown-origin cases stay blocked. Previous general acceptance does not establish deletion success; production retry is pending. See RESULTS.md for regression evidence and the browser-runner limitation.

The user confirmed that production deletion worked after applying the native-form authorization correction. The layout follow-up remains deferred.
