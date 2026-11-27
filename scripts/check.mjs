// Shared local/CI gate. No deployment, dependency installation or policy bypass.
import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
if (Number(process.versions.node.split('.')[0]) < 24) {
  console.error('Node.js 24 or later is required; .node-version pins the CI baseline.');
  process.exit(1);
}
function run(label, executable, args) {
  console.log(`\n[check] ${label}`);
  const result = spawnSync(executable, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error) console.error(result.error.message);
  if (result.error || result.status !== 0) {
    console.error(`[check] FAILED: ${label}${result.signal ? ` (${result.signal})` : ''}`);
    process.exit(result.status || 1);
  }
}
async function modules(directory, recursive = true) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.mjs')) result.push(join(directory, entry.name));
    else if (recursive && entry.isDirectory()) result.push(...await modules(join(directory, entry.name)));
  }
  return result;
}
const files = [
  ...await modules(root, false),
  ...await modules(join(root, 'scripts')),
  ...await modules(join(root, 'test')),
  ...await modules(join(root, 'features'))
].sort();
for (const file of files) run(`Syntax: ${relative(root, file)}`, process.execPath, ['--check', file]);

// npm run check supplies its CLI path. Execute it through Node rather than a
// Windows .cmd shell, and honor the existing package script definitions.
const npm = process.env.npm_execpath;
if (!npm) {
  console.error('Invoke this gate with npm run check.');
  process.exit(1);
}
run('Locale dictionaries', process.execPath, [npm, 'run', 'check:locales']);
run('Generate documentation', process.execPath, [npm, 'run', 'build:docs']);
run('Generated documentation matches tracked files', 'git', ['-c', 'core.safecrlf=false', 'diff', '--exit-code', '--', 'docs/LANGUAGES.md', 'docs/guides', 'public/locales', 'public/configure']);
run('Full test suite', process.execPath, [npm, 'test']);
console.log('\n[check] PASS');
