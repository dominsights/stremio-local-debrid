# Download-controls verification (2026-11-25)

> Historical verification chronology; current acceptance summary: [spec.md](spec.md). Earlier pending retry statements are superseded by the final explicit user result, not retroactively erased.

Branch: `feature/download-controls`, based on M1 plus its credit commit `8162c96`. Implementation is uncommitted; no push, new PR, or VM deployment was performed by the agent.

| Check | Observed result |
| --- | --- |
| Locked dependency installation | PASS using a cache under the permitted temporary directory; 176 packages installed. No dependency/lockfile changes. |
| Locale dictionaries | PASS: 51 locales, 60 dictionary strings each. New control labels have English/Portuguese text with explicit English fallback. |
| Documentation generation | PASS: 51 guides and portal dictionaries built. |
| Focused real HTTP/WebTorrent tests | PASS: 13/13 (five new controls tests, two checkpoint contracts, four M1 security regressions, two service regressions). |
| Final full test suite | 23 passed / 1 environment-blocked failure, 24 total. The pre-existing Windows startup validator cannot execute its child PowerShell script: AuthorizationManager check failed. No execution-policy bypass used. |
| Updater JavaScript | Both embedded programs parsed successfully with node --check. |
| Bash updater | Execution/syntax validation blocked by the Windows runner's MSYS access restriction. User must run bash -n in the VM before using it. |
| VM staging / production | Staging deferred by user. User-run production updater passed compatibility and manifest readiness, retained a code backup and preserved existing configuration/state. User reported controls worked; layout follow-up deferred. |

The first npm ci attempt failed because node-datachannel's prebuilt-binary cache was not writable; its source-build fallback also failed. A second complete npm ci with an allowed temporary cache succeeded and restored the locked dependency tree. No scripts were broadly approved or disabled. Existing install-script warnings and five audit entries remain; dependency remediation is separate from this feature.

The persistence-failure test deliberately creates a directory where the temporary JSON state file should be. Its expected EISDIR log demonstrates that deletion does not proceed when the stop cannot be saved. Retrying after removing the synthetic obstruction succeeds and stopped state survives restart.

Coverage: two real files in one torrent; retained partial bytes/progress; resume after restart; whole-torrent deletion; cache reservation release; another torrent preserved; malicious saved path ignored; active HTTP playback rejection; wrong authentication, forged form token, disallowed origins, invalid modes/content types, oversized body; signed POST routing through the staging gateway. Normal M1 media protections, ranges, background downloads and offline recovery pass.

Known boundaries: delete affects all files in one torrent, not just one row; stopped data remains reserved until manually deleted; buffered playback may outlive an HTTP reader, so close players before confirming; no automatic duplicate-source cancellation or PR #6 streaming-only behavior; rollback restores code, not deleted media. Live TV and shell/updater acceptance remain for the user checkpoint in VM_UPDATE.md.

Tested raw-file SHA-256 values:

| File | SHA-256 |
| --- | --- |
| `server.mjs` | `febb24969db68531d6bc29a054180561b578827b30bb5eaff787f470369a94ba` |
| `ui.mjs` | `f7c5c7a35aee6757343038719616803e72be70b06469c9bb5d40cf596180a236` |
| `i18n.mjs` | `e838f674d2841ca5c26567660629ce26336ca965d55d0caf21c4b45e8976b174` |
| `test/download-controls.test.mjs` | `0c87d8dde313ab1addc9e8364ce3acd789378b2ed91d4742604a120491e4585b` |
| `features/security-hardening/repro/checkpoint.mjs` | `07a0b2aa5d2cc06df4a4f327bb48961f35a4df99404e1da029d926f60e17aa25` |
| `test/checkpoint.test.mjs` | `ed6b5514af9d44bfb91fb242f15406616c1e33bffc10b9e929daf3e8ad6e7dde` |

## Production follow-up

On 2026-11-25 the user chose production deployment directly, supplied successful updater output and then reported the controls worked. The screenshot identifies a dashboard table sizing defect: long filenames crowd Status/Progress/Actions, causing mid-word wrapping. The user explicitly deferred layout work. Production deployment is user-observed; the agent performed no SSH deployment. Individual restart, TV and active-reader checks were not enumerated in the result and are not claimed separately.

## Native browser form authorization follow-up

The user subsequently reported an authorization error when deleting from the production confirmation form. This supersedes the earlier general report that controls worked; deletion acceptance remains open.

Found a matching defect: the application's no-referrer policy can cause native POST navigation forms to send Origin: null. The strict origin check rejected this before examining the signed form field. The existing fetch-based tests did not model that native-form header combination. See the [Fetch Standard](https://fetch.spec.whatwg.org/#append-a-request-origin-header) and [MDN Referrer-Policy documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy#effect_on_the_origin_header).

The correction accepts null Origin only when Sec-Fetch-Site is exactly same-origin, still requiring the authenticated route and valid signed form field. Nonmatching origins, cross-site/same-site/none or missing metadata with null Origin, forged signatures and unknown modes remain rejected. No changes to no-referrer or playback sandbox protections were made. A new real HTTP/WebTorrent regression failed with 403 before the fix and passes afterward. Gateway coverage now forwards the same header combination.

Native browser execution was attempted with a fresh headless Edge profile but the runner returned no DOM; the pre-existing M1 browser probe also failed in this environment. No native-browser execution result is claimed. The opt-in browser-forms.mjs harness is available for execution outside this runner; it is not part of npm test. Browser reproduction is therefore supported by the standard and HTTP regression, not an observed capture of the user's request headers.

Revised VM bundle explicitly accepts the previous production download-controls server checksum so the compatibility guard can deploy this correction. User retry of the updated production confirmation form is pending.

Correction verification: 14 focused tests passed. Final full suite: 24 passed / 1 pre-existing PowerShell-policy-blocked startup validator, 25 total. Rebuilt bundle runtime checksums match and its compatibility list accepts the previously deployed runtime. Latest corrected server SHA-256 (raw checkout): `25c28af09b4568636ece6e50d63a83ba1a994eff24f19f7ca1f6813ffadcfb85`. Previous hash table is historical and predates this correction. Native browser/production retry remains pending.

Final production follow-up: user explicitly confirmed the corrected stop/delete form worked after deploying the authorization fix. This resolves the reported deletion failure; the agent did not independently access the VM. Layout remains deferred.
