import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

test('checkpoint catalog manifest includes required fields and relays a playable stream URL', { timeout: 20000 }, async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'stremio-checkpoint-contract-'));
  const media = join(temporary, 'fixture.mp4');
  let child;
  let exited;
  try {
    // Only endpoint/byte serving is tested here, not video decoding.
    await writeFile(media, Buffer.from('synthetic checkpoint bytes'));
    child = spawn(process.execPath, [fileURLToPath(new URL('../features/security-hardening/repro/checkpoint.mjs', import.meta.url)), '--media', media], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), windowsHide: true,
      // Keep every child-created workspace inside this test's owned subtree,
      // including on Windows where terminating a child may skip its finally.
      env: { ...process.env, TEMP: temporary, TMP: temporary, TMPDIR: temporary },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    exited = new Promise(done => child.once('close', done));
    const manifestURL = await new Promise((done, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error('Checkpoint did not advertise its catalog manifest')), 10000);
      const closed = () => { clearTimeout(timer); reject(new Error('Checkpoint exited before advertising its manifest')); };
      child.once('error', reject);
      child.once('close', closed);
      child.stdout.on('data', chunk => {
        output += chunk.toString();
        const match = /Fixture catalog manifest[^\r\n]*: (http:\/\/[^\s]+)/.exec(output);
        if (!match) return;
        clearTimeout(timer); child.off('close', closed); done(match[1]);
      });
      child.stderr.resume();
    });
    const get = url => fetch(url, { signal: AbortSignal.timeout(5000) });
    const response = await get(manifestURL);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    const manifest = await response.json();
    for (const key of ['id', 'name', 'description', 'version']) {
      assert.equal(typeof manifest[key], 'string', `${key} must be present`);
      assert.ok(manifest[key].length > 0, `${key} must be nonempty`);
    }
    for (const key of ['types', 'resources', 'catalogs']) assert.ok(Array.isArray(manifest[key]));
    const base = manifestURL.replace(/\/manifest\.json$/, '');
    const catalog = await (await get(`${base}/catalog/movie/m0.json`)).json();
    assert.equal(catalog.metas.length, 1);
    const id = catalog.metas[0].id;
    const meta = await (await get(`${base}/meta/movie/${id}.json`)).json();
    assert.equal(meta.meta.id, id);
    const streams = await (await get(`${base}/stream/movie/${id}.json`)).json();
    assert.equal(streams.streams.length, 1);
    const playback = await get(streams.streams[0].url);
    assert.equal(playback.status, 200);
    assert.equal(playback.headers.get('content-type'), 'video/mp4');
    assert.equal(await playback.text(), 'synthetic checkpoint bytes');
  } finally {
    if (child && child.exitCode == null && child.signalCode == null) child.kill();
    if (exited) await exited;
    const root = resolve(temporary);
    assert.ok(root.startsWith(resolve(tmpdir()) + sep), 'Cleanup must stay in the test temporary directory');
    await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
});

test('HTTPS staging keeps manifest and ranged playback in one namespace without printing private URLs', { timeout: 20000 }, async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'stremio-checkpoint-https-'));
  const media = join(temporary, 'fixture.webm');
  const urlFile = join(temporary, 'urls.json');
  const bytes = Buffer.from('synthetic media bytes for HTTPS gateway range tests');
  let child;
  let exited;
  try {
    await writeFile(media, bytes);
    await writeFile(urlFile, JSON.stringify({ token: 'a'.repeat(48) }), { mode: 0o600 });
    child = spawn(process.execPath, [fileURLToPath(new URL('../features/security-hardening/repro/checkpoint.mjs', import.meta.url)), '--media', media,
      '--base-url', 'https://fixture.invalid/m1-checkpoint', '--url-file', urlFile], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), windowsHide: true,
      env: { ...process.env, TEMP: temporary, TMP: temporary, TMPDIR: temporary },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    exited = new Promise(done => child.once('close', done));
    const output = await new Promise((done, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error('HTTPS checkpoint did not become ready')), 10000);
      child.once('error', reject);
      child.once('close', () => { clearTimeout(timer); reject(new Error('HTTPS checkpoint exited early')); });
      child.stdout.on('data', chunk => {
        output += chunk.toString();
        if (output.includes('Checkpoint ready.')) { clearTimeout(timer); done(output); }
      });
      child.stderr.resume();
    });
    const urls = JSON.parse(await readFile(urlFile, 'utf8'));
    assert.equal(urls.token, 'a'.repeat(48), 'Restart must preserve the saved private test token');
    if (process.platform !== 'win32') assert.equal((await stat(urlFile)).mode & 0o777, 0o600);
    assert.ok(!output.includes(urls.token));
    for (const key of ['fixtureManifest', 'dashboard', 'manifest', 'streamListing', 'playback']) {
      assert.ok(urls[key].startsWith(`https://fixture.invalid/m1-checkpoint/${urls.token}/`), key);
    }
    // Model Nginx's trailing-slash proxy_pass: remove only the namespace and
    // connect to the fixed loopback gateway. This test does not verify TLS.
    const localURL = publicURL => new URL(new URL(publicURL).pathname.replace(/^\/m1-checkpoint\//, '/'), urls.localManifest).href;
    const get = (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
    const preflight = await get(localURL(urls.fixtureManifest), { method: 'OPTIONS', headers: { Origin: 'https://fixture-client.invalid', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Private-Network': 'true' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-private-network'), 'true');
    assert.match(preflight.headers.get('access-control-allow-methods'), /GET/);
    const manifest = await (await get(localURL(urls.fixtureManifest))).json();
    assert.ok(manifest.description);
    const streams = await (await get(localURL(urls.streamListing))).json();
    assert.equal(streams.streams[0].url, urls.playback);
    const response = await get(localURL(urls.playback), { headers: { Range: 'bytes=0-3' } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('content-type'), 'video/webm');
    assert.equal(response.headers.get('content-range'), `bytes 0-3/${bytes.length}`);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('content-security-policy'), /sandbox/);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(0, 4));
    const head = await get(localURL(urls.playback), { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    const invalid = await get(localURL(urls.playback), { headers: { Range: 'bytes=999-' } });
    assert.equal(invalid.status, 416);
    await invalid.arrayBuffer();
    const dashboard = await (await get(localURL(urls.dashboard))).text();
    const manage = /href="([^"]+\/downloads\/[a-f0-9]{40}\/stop)"/.exec(dashboard)[1];
    const confirmation = await (await get(localURL(manage))).text();
    const csrf = /name="csrf" value="([^"]+)"/.exec(confirmation)[1];
    const post = (mode, origin = 'https://fixture.invalid', site) => get(localURL(manage), {
      method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: origin, ...(site ? { 'Sec-Fetch-Site': site } : {}) },
      body: new URLSearchParams({ mode, csrf })
    });
    assert.equal((await post('delete', 'https://untrusted.invalid')).status, 403);
    assert.equal((await post('delete', 'null', 'cross-site')).status, 403);
    const stopped = await post('keep', 'null', 'same-origin');
    assert.equal(stopped.status, 303);
    assert.ok(stopped.headers.get('location').startsWith('https://fixture.invalid/m1-checkpoint/'));
    assert.equal((await post('delete', 'null', 'same-origin')).status, 303);
    assert.equal((await get(localURL(manage))).status, 404);
  } finally {
    if (child && child.exitCode == null && child.signalCode == null) child.kill();
    if (exited) await exited;
    const root = resolve(temporary);
    assert.ok(root.startsWith(resolve(tmpdir()) + sep), 'Cleanup must stay in the owned temporary directory');
    await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
});
