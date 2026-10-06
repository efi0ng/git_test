// Render a toonkit video to MP4, frame-exact.
//
//   node tools/render.mjs videos/dale-30s                 → out/dale-30s.mp4
//   node tools/render.mjs videos/dale-30s --stills 0,150   → out/dale-30s/frame-0000.png ...
//   node tools/render.mjs videos/dale-30s --sheet 12       → contact sheet of 12 frames
//   options: --from N --to N (frame range), --out path, --no-audio
//
// Drives headless Chromium with Playwright, pulls each frame as JPEG and
// pipes it straight into ffmpeg, which also muxes the soundtrack.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
    try { return require(p); } catch {}
  }
  throw new Error('playwright not found: npm i -D playwright');
}

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--') && !/^[\d,]+$/.test(a)) ?? 'videos/dale-30s';
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1] ?? true; };
const name = path.basename(dir);
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'video.json'), 'utf8'));
fs.mkdirSync('out', { recursive: true });

const server = await serve(0);
const port = server.address().port;
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', (e) => console.error('[page error]', e.message));
await page.goto(`http://127.0.0.1:${port}/${dir}/?render`);
await page.waitForFunction(() => window.__toon?.ready, null, { timeout: 60000 });
const info = await page.evaluate(() => ({ frames: __toon.frames, fps: __toon.fps }));

const grab = async (n, type = 'image/jpeg') => {
  const url = await page.evaluate(([n, type]) => __toon.renderFrame(n, type, 0.93), [n, type]);
  return Buffer.from(url.split(',')[1], 'base64');
};

const stills = opt('stills', null);
const sheet = opt('sheet', null);
if (stills || sheet) {
  const outDir = path.join('out', name);
  fs.mkdirSync(outDir, { recursive: true });
  let frames;
  if (sheet) {
    const n = +sheet;
    frames = Array.from({ length: n }, (_, i) => Math.round((i + 0.5) * (info.frames / n)));
  } else frames = String(stills).split(',').map(Number);
  const files = [];
  for (const f of frames) {
    const file = path.join(outDir, `frame-${String(f).padStart(4, '0')}.png`);
    fs.writeFileSync(file, await grab(f, 'image/png'));
    files.push(file);
    console.log('wrote', file);
  }
  if (sheet) {
    const cols = 4;
    const ff = ['-y', ...files.flatMap((f) => ['-i', f]), '-filter_complex',
      files.map((_, i) => `[${i}:v]scale=480:-1[s${i}]`).join(';') + ';' +
      files.map((_, i) => `[s${i}]`).join('') + `xstack=inputs=${files.length}:layout=` +
      files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join('|'),
      path.join(outDir, 'sheet.png')];
    await new Promise((r) => spawn('ffmpeg', ff, { stdio: 'ignore' }).on('close', r));
    console.log('wrote', path.join(outDir, 'sheet.png'));
  }
} else {
  const from = +opt('from', 0);
  const to = +opt('to', info.frames);
  const out = opt('out', path.join('out', `${name}.mp4`));
  const audio = !args.includes('--no-audio') && cfg.audio ? path.join(dir, cfg.audio) : null;
  const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(info.fps), '-c:v', 'mjpeg', '-i', '-'];
  if (audio) ffArgs.push('-ss', String((cfg.audioStart ?? 0) + from / info.fps), '-i', audio);
  ffArgs.push('-map', '0:v');
  if (audio) {
    const fadeOut = Math.max(0, (to - from) / info.fps - 1.2);
    ffArgs.push('-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-af', `afade=t=in:d=0.15,afade=t=out:st=${fadeOut}:d=1.2`);
  }
  ffArgs.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
    '-t', String((to - from) / info.fps), '-movflags', '+faststart', out);
  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (d) => (err += d));
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    const buf = await grab(f);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 30 === 0) process.stdout.write(`\rframe ${f}/${to}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  const code = await new Promise((r) => ff.on('close', r));
  if (code !== 0) { console.error(err.slice(-2000)); process.exitCode = 1; }
  else console.log(`\nwrote ${out}`);
}
await browser.close();
server.close();
