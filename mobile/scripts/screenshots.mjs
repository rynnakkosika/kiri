// Takes Play Store phone screenshots (1080x1920) of the game with the locally installed Edge.
// Needs the dev server running: powershell -File tools/serve.ps1 8765
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'store', 'screenshots');
mkdirSync(out, { recursive: true });
const URL = process.env.TRAVBANA_URL || 'http://localhost:8765/';
const EDGE = process.env.BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch (e) { /* none */ } });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => { await page.screenshot({ path: join(out, name) }); console.log('wrote', name); };

await page.goto(URL, { waitUntil: 'networkidle0' });
await shot('1-title.png');

await page.click('[data-go="quick"]');
await wait(800);
await shot('2-post-draw.png');
await page.click('#goBtn');
await wait(800);
await shot('2b-race-start.png');

for (let i = 0; i < 6; i++) { await page.keyboard.press('Enter'); await wait(1500); }
await shot('3-race-mid.png');
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await wait(400);
await shot('4-race-controls.png');

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await page.click('[data-go="custom"]');
await wait(500);
await shot('5-custom-race.png');

await browser.close();
