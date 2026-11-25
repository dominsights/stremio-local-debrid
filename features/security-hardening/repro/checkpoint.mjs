import { parseArgs } from 'node:util';
import { readFile, writeFile, stat, chmod, rename } from 'node:fs/promises';
import http from 'node:http';
import { pipeline } from 'node:stream/promises';
import { join, extname, resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { randomBytes } from 'node:crypto';
import { syntheticTorrent, workspace, cacheTorrent, localServer, engineOptions, serviceConfig, harmlessHTML } from './fixtures.mjs';

const { values } = parseArgs({ options: {
  media: { type: 'string' }, html: { type: 'boolean' }, disguised: { type: 'boolean' },
  address: { type: 'string' }, help: { type: 'boolean' },
  'base-url': { type: 'string' }, port: { type: 'string' }, 'url-file': { type: 'string' }
} });
if (values.help) {
  console.log(`Isolated playback checkpoint (no existing config or installed service changes):
  node features/security-hardening/repro/checkpoint.mjs --media "C:\\path\\small-video.mp4"
  Add --address YOUR_LOCAL_IPV4 to test from a TV on the same network.
  node features/security-hardening/repro/checkpoint.mjs --html
  node features/security-hardening/repro/checkpoint.mjs --disguised
  --html is a separate harmless, loopback-only browser reproduction.
  --disguised serves the same harmless HTML bytes as a .mp4 media fixture.
  Reverse-proxy staging: --base-url https://HOST/m1-checkpoint --port 7811 --url-file PRIVATE_PATH
  In staging, bind only to loopback and strip /m1-checkpoint/ at the proxy.
  --url-file saves private URLs without printing them and preserves the test token on restart.
  Keep printed private URLs local. Ctrl+C stops the service and removes test data.`);
  process.exit(0);
}
if ([values.media, values.html, values.disguised].filter(Boolean).length !== 1) throw new Error('Choose exactly one: --media PATH, --html or --disguised');
if ((values.html || values.disguised) && values.address) throw new Error('Active-content fixtures must remain loopback-only');
const port = values.port == null ? 0 : Number(values.port);
if (!Number.isInteger(port) || port < 0 || port > 65535 || values.port != null && !/^\d+$/.test(values.port)) throw new Error('Use a port between 0 and 65535');
if ((values['base-url'] || values.port) && !values.media) throw new Error('Proxy/port options require --media');
let publicBase;
if (values['base-url']) {
  const url = new URL(values['base-url']);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || values.address) throw new Error('Use a credential-free HTTPS base URL; proxy staging is loopback-only');
  publicBase = url.href.replace(/\/+$/, '');
}
if (values.address && !Object.values(networkInterfaces()).flat().some(item => item?.family === 'IPv4' && item.address === values.address && !item.internal)) {
  throw new Error('--address must be an IPv4 address assigned to this computer');
}

let data = harmlessHTML;
let name = values.disguised ? 'disguised.mp4' : 'fixture.html';
if (values.media) {
  const extension = extname(values.media).toLowerCase();
  if (!['.mp4', '.m4v', '.mkv', '.webm', '.mov', '.avi', '.ts', '.m2ts'].includes(extension)) throw new Error('Choose a supported video file');
  const metadata = await stat(resolve(values.media));
  if (!metadata.isFile() || metadata.size === 0 || metadata.size > 64 * 1024 * 1024) throw new Error('Use a nonempty test video no larger than 64 MiB');
  data = await readFile(resolve(values.media));
  name = `checkpoint${extension}`;
}
const [{ default: WebTorrent }, { createService }] = await Promise.all([import('webtorrent'), import('../../../server.mjs')]);
const space = await workspace();
const client = new WebTorrent(engineOptions);
let service;
let catalog;
let onStop;
try {
  let token = randomBytes(24).toString('hex');
  if (values['url-file']) {
    try {
      const saved = JSON.parse(await readFile(values['url-file'], 'utf8'));
      if (!/^[a-f0-9]{48}$/.test(saved.token)) throw new Error('Invalid saved checkpoint token');
      token = saved.token;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const torrent = syntheticTorrent(name, data);
  await cacheTorrent(space, torrent);
  const descriptor = { infoHash: torrent.infoHash, fileIdx: 0, filename: name, type: 'movie', id: 'm0-checkpoint' };
  await writeFile(join(space.stateDir, 'downloads.json'), JSON.stringify([{
    ...descriptor, status: 'complete', length: data.length, lastAccess: Date.now(),
    path: join(space.cacheDir, torrent.infoHash, name)
  }]));
  const config = { ...serviceConfig(space), token, maxCacheBytes: 128 * 1024 * 1024 };
  if (values.address) config.host = '0.0.0.0';
  service = await createService(config, { client });
  // createService chooses the ephemeral port; advertise the selected local address.
  config.baseUrl = publicBase || `http://${values.address || '127.0.0.1'}:${service.server.address().port}`;
  const base = `${config.baseUrl}/${config.token}`;
  const urls = { token: config.token, dashboard: `${base}/`, manifest: `${base}/manifest.json`, streamListing: `${base}/stream/movie/m0-checkpoint.json`, playback: service.playURL(descriptor) };
  if (values.media) {
    // Test-only catalog supplies a discoverable synthetic title. Streaming still
    // uses the unmodified application's getStreams and playback route.
    const meta = { id: 'm0-checkpoint', type: 'movie', name: 'M0 local playback checkpoint', description: 'Isolated local test video' };
    catalog = await localServer(async (req, res) => {
      const url = new URL(req.url, 'http://fixture.invalid');
      const prefix = `/${config.token}`;
      const route = url.pathname.startsWith(`${prefix}/`) ? url.pathname.slice(prefix.length) : '';
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      const controlPost = req.method === 'POST' && publicBase && /^\/(?:[a-z]{2}-[A-Z]{2}\/)?downloads\/[a-f0-9]{40}\/stop$/.test(route);
      if (!['GET', 'HEAD'].includes(req.method) && !controlPost) { res.writeHead(405); res.end('{}'); return; }
      let body;
      if (route === '/manifest.json') body = {
        id: 'local.stremio.m0.fixture', version: '0.0.1', name: 'M0 isolated checkpoint',
        description: 'Temporary local catalog for verifying playback and seeking through the cache service.',
        resources: ['catalog', 'meta', 'stream'], types: ['movie'],
        catalogs: [{ type: 'movie', id: 'm0', name: 'M0 test video' }]
      };
      else if (route === '/catalog/movie/m0.json') body = { metas: [meta] };
      else if (route === '/meta/movie/m0-checkpoint.json') body = { meta };
      else if (route === '/stream/movie/m0-checkpoint.json') body = await service.getStreams('movie', 'm0-checkpoint');
      else if (publicBase && url.pathname.startsWith(`${prefix}/`) && (['GET', 'HEAD'].includes(req.method) || controlPost)) {
        // Nginx strips the public namespace. The fixed loopback gateway forwards
        // playback/dashboard routes to this isolated service, retaining ranges
        // and the application's security headers. No user-controlled destination.
        await new Promise((done, reject) => {
          const upstream = http.request({ hostname: '127.0.0.1', port: service.server.address().port, method: req.method, path: req.url, headers: Object.fromEntries(['range', 'content-type', 'content-length', 'origin', 'sec-fetch-site'].filter(key => req.headers[key] != null).map(key => [key, req.headers[key]])) }, response => {
            res.writeHead(response.statusCode, response.headers);
            pipeline(response, res).then(done, error => res.destroyed ? done() : reject(error));
          });
          const stop = () => upstream.destroy();
          res.once('close', stop);
          upstream.once('close', () => res.off('close', stop));
          upstream.once('error', error => res.destroyed ? done() : reject(error));
          if (controlPost) req.pipe(upstream);
          else upstream.end();
        });
        return;
      } else { res.writeHead(404); res.end('{}'); return; }
      res.end(JSON.stringify(body));
    }, { host: config.host, port });
    const origin = catalog.origin.replace('127.0.0.1', values.address || '127.0.0.1');
    urls.localManifest = `${origin}/${config.token}/manifest.json`;
    urls.fixtureManifest = publicBase ? `${base}/manifest.json` : urls.localManifest;
  }
  if (values['url-file']) {
    const path = resolve(values['url-file']);
    await writeFile(`${path}.tmp`, JSON.stringify(urls, null, 2) + '\n', { mode: 0o600 });
    if (process.platform !== 'win32') await chmod(`${path}.tmp`, 0o600);
    await rename(`${path}.tmp`, path);
    console.log(`Checkpoint ready. Private URLs saved to ${path}; none printed.`);
  } else {
    if (urls.fixtureManifest) console.log(`Fixture catalog manifest (install this for the TV checkpoint): ${urls.fixtureManifest}`);
    console.log(`Dashboard: ${urls.dashboard}`);
    console.log(`Manifest: ${urls.manifest}`);
    console.log(`Stream listing: ${urls.streamListing}`);
    console.log(`Playback: ${urls.playback}`);
  }
  console.log(values.html
    ? 'Browser test: open Playback. After M1, expect a 404 JSON error and no script-execution text. The old baseline displayed the inline-script message.'
    : values.disguised
      ? 'Browser test: open Playback. Expect a media player/unsupported-media error, never the inline-script execution message. The content is harmless HTML bytes, not a playable video.'
      : 'TV test: install Fixture catalog manifest, open its M0 test video catalog, select the title, play and seek. The fixture catalog routes playback through the original service.');
  console.log('Ctrl+C stops this isolated server and removes its temporary data. No startup task is installed.');
  await new Promise(done => {
    onStop = done;
    process.once('SIGINT', onStop);
    process.once('SIGTERM', onStop);
  });
} finally {
  if (onStop) { process.off('SIGINT', onStop); process.off('SIGTERM', onStop); }
  try {
    try { await catalog?.close(); }
    finally {
      if (service) await service.close();
      else if (!client.destroyed) await new Promise(done => client.destroy(done));
    }
  } finally { await space.close(); }
}
