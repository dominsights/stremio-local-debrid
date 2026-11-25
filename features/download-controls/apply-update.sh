#!/usr/bin/env bash
set -euo pipefail
if [ "$(id -u)" -ne 0 ]; then echo 'Run with sudo as the VM administrator.' >&2; exit 1; fi
case "${1:-}" in
  staging) app=/home/stremio/m1-checkpoint; unit=stremio-m1-checkpoint.service ;;
  production) app=/srv/stremio-local-debrid; unit=stremio-local-debrid.service ;;
  *) echo 'Usage: sudo bash apply-update.sh staging|production' >&2; exit 1 ;;
esac
bundle=$(cd -- "$(dirname -- "$0")/../.." && pwd)
node_bin=$(command -v node)
if [ "$(systemctl show "$unit" -p WorkingDirectory --value)" != "$app" ]; then
  echo 'Unexpected service working directory; stopped without changing files.' >&2; exit 1
fi
files=(server.mjs ui.mjs i18n.mjs SECURITY.md)
if [ "$1" = staging ]; then files+=(features/security-hardening/repro/checkpoint.mjs); fi
"$node_bin" --input-type=module - "$app" "$bundle" "$1" <<'JS'
import { readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const [app, bundle, mode] = process.argv.slice(2);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const normalized = bytes => digest(Buffer.from(bytes.toString().replaceAll('\r\n', '\n')));
const manifest = JSON.parse(await readFile(join(bundle, 'update-manifest.json'), 'utf8'));
if (normalized(await readFile(join(app, 'package-lock.json'))) !== manifest.lockHash) throw new Error('Dependency lock differs; review before updating.');
for (const [file, expected] of Object.entries({ ...manifest.runtime, ...(mode === 'staging' ? manifest.stagingRuntime : {}) })) {
  if ((await lstat(join(app, file))).isSymbolicLink()) throw new Error('Refusing a symlink runtime file.');
  if (digest(await readFile(join(bundle, file))) !== expected.sha256) throw new Error('Bundle checksum mismatch: ' + file);
  if (!expected.accepted.includes(normalized(await readFile(join(app, file))))) throw new Error('Unrecognized deployed changes: ' + file);
}
console.log('Runtime and dependency compatibility checks passed.');
JS
for file in server.mjs ui.mjs i18n.mjs; do "$node_bin" --check "$bundle/$file"; done
backup_root=/var/backups/stremio-local-debrid
install -d -m 0700 "$backup_root"
backup=$(mktemp -d "$backup_root/download-controls.XXXXXXXX")
for file in "${files[@]}"; do mkdir -p -- "$(dirname -- "$backup/$file")"; cp -p -- "$app/$file" "$backup/$file"; done
printf '%s\n%s\n' "$app" "$unit" > "$backup/target.txt"
changed=0
rollback_on_error() {
  result=$?
  if [ "$result" -ne 0 ] && [ "$changed" -eq 1 ]; then
    echo 'Update failed; restoring previous code.' >&2
    systemctl stop "$unit" || true
    for file in "${files[@]}"; do cp -p -- "$backup/$file" "$app/$file" || true; done
    systemctl start "$unit" || true
  fi
  if [ "$result" -ne 0 ]; then echo "Retained backup: $backup" >&2; fi
}
trap rollback_on_error EXIT
systemctl stop "$unit"
changed=1
for file in "${files[@]}"; do install -o stremio -g stremio -m 0644 "$bundle/$file" "$app/$file"; done
systemctl start "$unit"
"$node_bin" --input-type=module - "$app" "$1" <<'JS'
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const [app, mode] = process.argv.slice(2);
let url;
if (mode === 'staging') url = JSON.parse(await readFile(join(app, 'private/urls.json'), 'utf8')).localManifest;
else {
  const config = JSON.parse(await readFile(join(app, 'config.json'), 'utf8'));
  url = `http://127.0.0.1:${config.port || 7810}/${config.token}/manifest.json`;
}
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
    if (response.ok && (await response.json()).id) { ready = true; break; }
  } catch {}
  await delay(500);
}
if (!ready) throw new Error('Manifest readiness failed; private URL suppressed.');
console.log('Updated backend manifest is ready.');
JS
systemctl is-active --quiet "$unit"
changed=0
echo "Updated $unit. Code backup: $backup"
echo 'Configuration, token, cache and download state were not replaced. Verify playback and download controls now.'
