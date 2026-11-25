import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const runtime = ['server.mjs', 'ui.mjs', 'i18n.mjs', 'SECURITY.md'];
const stagingFile = 'features/security-hardening/repro/checkpoint.mjs';
const files = [...runtime, stagingFile, 'test/download-controls.test.mjs', 'test/checkpoint.test.mjs', 'test/playback-security.test.mjs', 'features/security-hardening/repro/fixtures.mjs', 'features/download-controls/apply-update.sh', 'features/download-controls/README.md'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalizedHash = bytes => hash(Buffer.from(bytes.toString().replaceAll('\r\n', '\n')));
const baseline = 'ff23debf087e01bcdd8c7a64f149ef4937347169';
const previouslyDeployedServer = '03f31dc2922858230498da6faf04932b5b2569cad053dc0da7a9ba78da5abe7f';
const manifest = { baseline, runtime: {}, stagingRuntime: {}, lockHash: normalizedHash(await readFile(join(root, 'package-lock.json'))) };
const directory = await mkdtemp(join(tmpdir(), 'download-controls-bundle-'));
const archive = join(root, 'features/download-controls/download-controls-update.tar.gz');
try {
  for (const file of files) {
    let bytes = await readFile(join(root, file));
    if (file.endsWith('.sh')) bytes = Buffer.from(bytes.toString().replaceAll('\r\n', '\n'));
    await mkdir(dirname(join(directory, file)), { recursive: true });
    await writeFile(join(directory, file), bytes);
    if (file === stagingFile) manifest.stagingRuntime[file] = { sha256: hash(bytes), accepted: ['6f38409162d0e3a43c2a60c70d20d8feeb86b559aad886c4fde76ff34e83e04c', normalizedHash(bytes)] };
    if (runtime.includes(file)) {
      const previous = [baseline, 'f631a767cf58de5c54db9e7d027137651ccef43c'].map(ref => normalizedHash(execFileSync('git', ['show', `${ref}:${file}`], { cwd: root, windowsHide: true })));
      manifest.runtime[file] = { sha256: hash(bytes), accepted: [...new Set([...previous, ...(file === 'server.mjs' ? [previouslyDeployedServer] : []), normalizedHash(bytes)])] };
    }
  }
  await writeFile(join(directory, 'update-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  execFileSync('tar', ['-czf', archive, '-C', directory, ...files, 'update-manifest.json'], { windowsHide: true });
} finally { await rm(directory, { recursive: true, force: true }); }
await writeFile(`${archive}.sha256`, `${hash(await readFile(archive))}  download-controls-update.tar.gz\n`);
console.log('Created explicit-file M1 + download-controls update and checksum; no configuration, tokens, state or media included.');
