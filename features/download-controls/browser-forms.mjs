// Opt-in native browser form regression; uses synthetic data and a fresh profile.
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify, parseArgs } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebTorrent from 'webtorrent';
import { createService } from '../../server.mjs';
import { syntheticTorrent, workspace, cacheTorrent, serviceConfig, engineOptions } from '../security-hardening/repro/fixtures.mjs';

const { values } = parseArgs({ options: { browser: { type: 'string' }, 'expect-rejected': { type: 'boolean' } } });
const expected = values['expect-rejected'] ? 403 : 303;
const browser = values.browser || join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe');
const execute = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), 'download-control-browser-'));
const space = await workspace();
let service;
let gateway;
try {
  const torrent = syntheticTorrent('browser-fixture.mp4', 'synthetic cached media');
  await cacheTorrent(space, torrent);
  const config = serviceConfig(space);
  service = await createService(config, { client: new WebTorrent(engineOptions) });
  const backend = `http://127.0.0.1:${service.server.address().port}`;
  const observation = [];
  let mode;
  gateway = http.createServer((req, res) => {
    const upstream = http.request(new URL(req.url, backend), { method: req.method, headers: req.headers }, response => {
      if (req.method === 'POST') observation.push({ mode, origin: req.headers.origin, site: req.headers['sec-fetch-site'], refererPresent: !!req.headers.referer, status: response.statusCode });
      if (req.method === 'GET' && req.url.endsWith('/stop') && response.statusCode === 200) {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
          const headers = { ...response.headers };
          delete headers['content-length']; delete headers['transfer-encoding'];
          res.writeHead(200, headers);
          // Only the owned test gateway injects this click. The form and headers
          // are the actual application's; no production script is added.
          res.end(body + `<script>document.querySelector('form[method="post"]').requestSubmit(document.querySelector('button[value="${mode}"]'))</script>`);
        });
      } else { res.writeHead(response.statusCode, response.headers); response.pipe(res); }
    });
    upstream.on('error', () => { res.writeHead(502); res.end('Fixture proxy error'); });
    req.pipe(upstream);
  });
  await new Promise(done => gateway.listen(0, '127.0.0.1', done));
  config.baseUrl = `http://127.0.0.1:${gateway.address().port}`;
  await (await fetch(service.playURL({ infoHash: torrent.infoHash, fileIdx: 0 }))).arrayBuffer();
  for (mode of ['keep', 'delete']) {
    const { stdout } = await execute(browser, [
      '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions',
      `--user-data-dir=${join(directory, mode)}`, '--virtual-time-budget=2000', '--dump-dom',
      `${config.baseUrl}/${config.token}/en-US/downloads/${torrent.infoHash}/stop`
    ], { windowsHide: true, timeout: 20000, maxBuffer: 256 * 1024 });
    assert.ok(!stdout.includes('ERR_CONNECTION'), 'Browser must reach the real test service');
    const actual = observation.find(item => item.mode === mode);
    assert.ok(stdout.trim(), 'Browser returned no DOM in this environment; native form execution could not be verified');
    assert.ok(actual, 'Browser must submit a native POST form');
    assert.equal(actual.origin, 'null');
    assert.equal(actual.site, 'same-origin');
    assert.equal(actual.refererPresent, false, 'Private path must remain absent from Referer');
    assert.equal(actual.status, expected, mode);
    if (expected === 303 && mode === 'delete') assert.equal(service.listDownloads().length, 0);
  }
  console.log(JSON.stringify({ result: 'PASS', expected, observations: observation, limitation: 'Real headless Edge native forms over loopback, not a VM/TLS deployment test' }, null, 2));
} finally {
  if (gateway) { gateway.closeAllConnections(); await new Promise(done => gateway.close(done)); }
  await service?.close();
  await space.close();
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
