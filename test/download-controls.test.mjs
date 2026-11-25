import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import WebTorrent from 'webtorrent';
import { createService } from '../server.mjs';
import { engineOptions, syntheticTorrent, cacheTorrent } from '../features/security-hardening/repro/fixtures.mjs';

async function waitFor(predicate) {
  const until = Date.now() + 10000;
  while (!await predicate()) { if (Date.now() > until) throw new Error('Timed out waiting for download state'); await delay(25); }
}

async function setup(t) {
  const directory = await mkdtemp(join(tmpdir(), 'download-controls-'));
  const seed = new WebTorrent(engineOptions);
  let service;
  t.after(async () => {
    try { await service?.close(); } finally {
      await new Promise(done => seed.destroy(done));
      await rm(directory, { recursive: true, force: true });
    }
  });
  const seedDir = join(directory, 'seed');
  await mkdir(seedDir);
  await writeFile(join(seedDir, 'one.mp4'), randomBytes(2 * 1024 * 1024));
  await writeFile(join(seedDir, 'two.mp4'), randomBytes(2 * 1024 * 1024));
  const torrent = await new Promise((done, reject) => { seed.once('error', reject); seed.seed(seedDir, { private: true, announce: [], pieceLength: 16384 }, done); });
  const config = { host: '127.0.0.1', port: 0, baseUrl: 'http://127.0.0.1', token: 'synthetic-control-test-token', language: 'en-US', cacheDir: join(directory, 'cache'), stateDir: join(directory, 'state'), maxCacheBytes: 16 * 1024 * 1024, minFreeBytes: 0, sources: [] };
  await mkdir(join(config.stateDir, 'torrents'), { recursive: true });
  await writeFile(join(config.stateDir, 'torrents', `${torrent.infoHash}.torrent`), torrent.torrentFile);
  async function start() {
    const client = new WebTorrent({ ...engineOptions, downloadLimit: 128 * 1024 });
    client.on('torrent', download => download.addPeer(`127.0.0.1:${seed.torrentPort}`));
    service = await createService(config, { client });
  }
  await start();
  const base = () => `${config.baseUrl}/${config.token}/en-US`;
  const control = hash => `${base()}/downloads/${hash || torrent.infoHash}/stop`;
  const form = async hash => {
    const response = await fetch(control(hash));
    assert.equal(response.status, 200);
    const html = await response.text();
    return { html, csrf: /name="csrf" value="([^"]+)"/.exec(html)[1] };
  };
  const post = async (mode, options = {}) => {
    const { csrf } = await form(options.hash);
    return fetch(control(options.hash), { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...options.headers }, body: new URLSearchParams({ mode, csrf: options.csrf ?? csrf }), signal: AbortSignal.timeout(10000) });
  };
  const play = async (index = 0) => {
    const response = await fetch(service.playURL({ infoHash: torrent.infoHash, fileIdx: index }), { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 206);
    await response.arrayBuffer();
    await waitFor(() => service.listDownloads().some(job => job.infoHash === torrent.infoHash));
  };
  return { config, torrent, base, control, form, post, play, get service() { return service; }, async restart() { await service.close(); service = null; await start(); } };
}

test('stopping retains real partial files and progress across restart, then playback resumes', { timeout: 30000 }, async t => {
  const f = await setup(t);
  await f.play();
  await f.play(1);
  const dashboard = await (await fetch(`${f.base()}/`)).text();
  assert.ok(dashboard.includes('Stop download…'));
  const { html } = await f.form();
  assert.ok(html.includes('one.mp4') && html.includes('two.mp4'));
  assert.ok(html.includes('Stop and keep files') && html.includes('Stop and delete files'));
  assert.equal((await f.post('keep')).status, 303);
  assert.equal(f.service.client.torrents.length, 0);
  for (const job of f.service.listDownloads()) {
    assert.equal(job.status, 'stopped');
    assert.ok(job.downloaded > 0 && job.downloaded < job.bytes);
  }
  const progress = f.service.listDownloads().map(job => job.downloaded);
  await access(join(f.config.cacheDir, f.torrent.infoHash));
  await f.restart();
  assert.equal(f.service.client.torrents.length, 0);
  assert.deepEqual(f.service.listDownloads().map(job => job.downloaded), progress);
  assert.ok((await (await fetch(`${f.base()}/`)).text()).includes('Stopped'));
  await f.play();
  assert.equal(f.service.listDownloads()[0].status, 'downloading');
});

test('delete removes only the selected torrent, releases its budget and ignores persisted file paths', { timeout: 30000 }, async t => {
  const f = await setup(t);
  await f.play();
  const other = syntheticTorrent('keep.mp4', 'other cached video');
  await cacheTorrent(f.config, other);
  const otherURL = f.service.playURL({ infoHash: other.infoHash, fileIdx: 0 });
  await (await fetch(otherURL)).arrayBuffer();
  await f.restart();
  // A saved path must never become a deletion target.
  const stateFile = join(f.config.stateDir, 'downloads.json');
  assert.equal((await f.post('keep')).status, 303);
  const saved = JSON.parse(await readFile(stateFile, 'utf8'));
  saved.find(job => job.infoHash === f.torrent.infoHash).path = join(f.config.cacheDir, other.infoHash);
  await writeFile(stateFile, JSON.stringify(saved));
  await f.restart();
  assert.equal((await f.post('delete')).status, 303);
  await assert.rejects(access(join(f.config.cacheDir, f.torrent.infoHash)), { code: 'ENOENT' });
  await assert.rejects(access(join(f.config.stateDir, 'torrents', `${f.torrent.infoHash}.torrent`)), { code: 'ENOENT' });
  await access(join(f.config.cacheDir, other.infoHash, other.name));
  const status = await (await fetch(`${f.base()}/downloads.json`)).json();
  assert.equal(status.downloads.length, 1);
  assert.equal(status.cacheBytes, other.data.length);
  await f.restart();
  assert.equal(f.service.listDownloads().length, 1);
  assert.equal((await fetch(f.control())).status, 404);
});

test('control mutations require authentication, signed POST forms and an allowed origin', { timeout: 30000 }, async t => {
  const f = await setup(t);
  await f.play();
  assert.equal((await fetch(f.control().replace(f.config.token, 'wrong'))).status, 404);
  assert.equal((await fetch(f.control(), { method: 'HEAD' })).status, 200);
  assert.equal(f.service.listDownloads()[0].status, 'downloading');
  assert.equal((await f.post('delete', { csrf: 'forged' })).status, 403);
  assert.equal((await f.post('delete', { headers: { Origin: 'https://untrusted.invalid' } })).status, 403);
  assert.equal((await f.post('delete', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await f.post('unknown')).status, 403);
  assert.equal((await f.post('delete', { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  const large = await fetch(f.control(), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'x'.repeat(1025) });
  assert.equal(large.status, 413);
  await access(join(f.config.cacheDir, f.torrent.infoHash));
  assert.equal(f.service.listDownloads()[0].status, 'downloading');
});

test('active playback blocks stop/delete until the reader disconnects', { timeout: 30000 }, async t => {
  const f = await setup(t);
  const abort = new AbortController();
  const playing = await fetch(f.service.playURL({ infoHash: f.torrent.infoHash, fileIdx: 0 }), { signal: abort.signal });
  const reader = playing.body.getReader();
  await reader.read();
  try {
    for (const mode of ['keep', 'delete']) assert.equal((await f.post(mode)).status, 409);
    assert.equal(f.service.listDownloads()[0].status, 'downloading');
  } finally { abort.abort(); await reader.cancel().catch(() => {}); }
  let response;
  await waitFor(async () => { response = await f.post('keep'); return response.status !== 409; });
  assert.equal(response.status, 303);
  assert.equal(f.service.listDownloads()[0].status, 'stopped');
});

test('failed stop-state persistence reports failure before deletion and a retry can recover', { timeout: 30000 }, async t => {
  const f = await setup(t);
  await f.play();
  const temporaryState = join(f.config.stateDir, 'downloads.json.tmp');
  await mkdir(temporaryState);
  const failed = await f.post('delete');
  assert.equal(failed.status, 500);
  assert.equal((await failed.json()).error, 'Could not update this download. Please try again.');
  await access(join(f.config.cacheDir, f.torrent.infoHash));
  await rm(temporaryState, { recursive: true });
  assert.equal((await f.post('keep')).status, 303);
  await f.restart();
  assert.equal(f.service.client.torrents.length, 0);
  assert.equal(f.service.listDownloads()[0].status, 'stopped');
});

test('no-referrer native forms accept null Origin only with same-origin fetch metadata and a valid signature', { timeout: 30000 }, async t => {
  const f = await setup(t);
  await f.play();
  for (const site of [undefined, 'cross-site', 'same-site', 'none']) {
    const headers = { Origin: 'null', ...(site ? { 'Sec-Fetch-Site': site } : {}) };
    assert.equal((await f.post('delete', { headers })).status, 403, String(site));
  }
  assert.equal((await f.post('delete', { headers: { Origin: 'null', 'Sec-Fetch-Site': 'same-origin' }, csrf: 'forged' })).status, 403);
  assert.equal((await f.post('delete', { headers: { Origin: 'https://untrusted.invalid', 'Sec-Fetch-Site': 'same-origin' } })).status, 403);
  assert.equal((await f.post('keep', { headers: { Origin: 'null', 'Sec-Fetch-Site': 'same-origin' } })).status, 303);
  assert.equal((await f.post('delete', { headers: { Origin: 'null', 'Sec-Fetch-Site': 'same-origin' } })).status, 303);
  assert.equal(f.service.listDownloads().length, 0);
});
