// Headless renderer.
//   node render.mjs stills 1.5,6.8,14 <dir>     -> <dir>/t_1.50.jpg ...
//   node render.mjs video <out.mp4> [fps] [from] [to]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.m4a': 'audio/mp4' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const args = ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
if (process.env.GL === 'swiftshader' || !process.env.GL) args.push('--use-gl=angle', '--use-angle=swiftshader');
const browser = await chromium.launch({ args });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', (e) => { console.error('[page error]', e.message); process.exitCode = 1; });
await page.goto(url);
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });

const frame = async (t) => {
  const data = await page.evaluate((tt) => window.renderAt(tt), t);
  return Buffer.from(data.split(',')[1], 'base64');
};

const [mode, a, b, c, d] = process.argv.slice(2);
if (mode === 'stills') {
  const dir = b || 'stills';
  fs.mkdirSync(dir, { recursive: true });
  for (const t of a.split(',').map(Number)) {
    const t0 = Date.now();
    fs.writeFileSync(path.join(dir, `t_${t.toFixed(2)}.jpg`), await frame(t));
    console.log(`t=${t} (${Date.now() - t0} ms)`);
  }
} else if (mode === 'video') {
  const fps = Number(b || 30);
  const duration = await page.evaluate(() => window.DURATION);
  const from = Number(c || 0), to = Number(d || duration);
  const n = Math.round((to - from) * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', a], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await frame(from + i / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 30 === 0) {
      const per = (Date.now() - t0) / (i + 1) / 1000;
      console.log(`frame ${i}/${n}  ${per.toFixed(2)} s/frame  ~${Math.round(per * (n - i) / 60)} min left`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`wrote ${a}`);
}
await browser.close();
server.close();
