// Records the screen part of one training video with Playwright.
// Usage: VIDEO_EMAIL=… VIDEO_PASSWORD=… node video/record.mjs s2-voorraadbewegingen [--live]
// Default is the CRM's ?demo=1 sample stock (no real writes). --live books real movements: only on the demo Supabase project.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';

const [slug, ...flags] = process.argv.slice(2);
if (!slug) throw new Error('usage: node video/record.mjs <slug> [--live]');
const live = flags.includes('--live');
const base = process.env.VIDEO_BASE ?? 'http://127.0.0.1:3017';
const script = JSON.parse(readFileSync(`video/scripts/${slug}.json`, 'utf8'));
const out = `video/out/${slug}`;
mkdirSync(out, { recursive: true });

const withDemo = (url) => live ? url : url + (url.includes('?') ? '&' : '?') + 'demo=1';
// channel 'chrome': Playwright's bundled Chromium does not support macOS 12; the installed Google Chrome does.
const browser = await chromium.launch({ channel: 'chrome', slowMo: 350 });
const context = await browser.newContext({ viewport: script.viewport, deviceScaleFactor: 1, recordVideo: { dir: out, size: script.viewport }, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
const page = await context.newPage();
// Visible cursor so the viewer can follow clicks. ponytail: a CSS dot, not a cursor library.
await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
  const dot = Object.assign(document.createElement('div'), { id: '__cursor' });
  dot.style.cssText = 'position:fixed;z-index:99999;width:22px;height:22px;border-radius:50%;background:rgba(250,204,21,.55);border:2px solid #ca8a04;pointer-events:none;transform:translate(-50%,-50%);transition:transform .08s';
  document.body.append(dot);
  document.addEventListener('mousemove', (e) => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; });
  document.addEventListener('mousedown', () => { dot.style.transform = 'translate(-50%,-50%) scale(1.6)'; });
  document.addEventListener('mouseup', () => { dot.style.transform = 'translate(-50%,-50%)'; });
}));

if (process.env.VIDEO_EMAIL) {
  await page.goto(`${base}/admin/login`);
  await page.fill('input[name=email]', process.env.VIDEO_EMAIL);
  await page.fill('input[name=password]', process.env.VIDEO_PASSWORD ?? '');
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 20_000 });
}

const t0 = Date.now();
const marks = [];
for (const scene of script.scenes) {
  if (scene.type) continue; // avatar/card scenes are not screen footage
  marks.push({ id: scene.id, at: (Date.now() - t0) / 1000 });
  if (scene.url) {
    await page.goto(base + withDemo(scene.url)); await page.waitForLoadState('networkidle'); await page.waitForTimeout(800);
    if (page.url().includes('/admin/login')) throw new Error(`redirected to login at scene "${scene.id}": set VIDEO_EMAIL and VIDEO_PASSWORD`);
  }
  for (const step of scene.steps ?? []) {
    if (step.click) { await page.locator(step.click).first().hover(); await page.waitForTimeout(400); await page.locator(step.click).first().click(); }
    else if (step.fill) { await page.locator(step.fill[0]).first().click(); await page.locator(step.fill[0]).first().pressSequentially(step.fill[1], { delay: 60 }); }
    else if (step.select) await page.locator(step.select[0]).first().selectOption(step.select[1]);
    else if (step.wait) await page.waitForTimeout(step.wait);
    await page.waitForTimeout(500);
  }
}
marks.push({ id: 'end', at: (Date.now() - t0) / 1000 });
const video = page.video();
await context.close();
await browser.close();
renameSync(await video.path(), `${out}/screen.webm`);
writeFileSync(`${out}/marks.json`, JSON.stringify(marks, null, 2));
console.log(`screen.webm + marks.json → ${out}`, marks);
