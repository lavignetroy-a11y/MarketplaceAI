/**
 * Full-page visual harness.
 *
 * Judging sections one at a time is how a page ends up as a stack of individually-fine blocks
 * that don't cohere. This captures the entire scroll at the viewports people actually use --
 * including the reviewer's own 100% and 80% zoom widths -- then downscales and slices each
 * capture into readable tiles so the whole thing can be looked at as one continuous document.
 *
 *   node scripts/shoot.mjs            # every viewport
 *   node scripts/shoot.mjs 1273 390   # just these widths
 *
 * Output lands in .shots/<width>/ as tile-1.png, tile-2.png ...
 */
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = process.env.SHOOT_URL || 'http://localhost:3000/';
const OUT = '.shots';

// 1590 and 1273 are the reviewer's 80% and 100% zoom on their own display; the rest bracket it.
const VIEWPORTS = [1920, 1590, 1440, 1273, 1024, 768, 390];
const TILE_WIDTH = 760;   // wide enough to read type, small enough to view whole
const TILE_HEIGHT = 2200; // each slice is roughly two screens of scroll

const widths = process.argv.slice(2).map(Number).filter(Boolean);
const targets = widths.length ? widths : VIEWPORTS;

const browser = await chromium.launch({ executablePath: CHROME });

for (const width of targets) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Scroll the whole page once so anything lazy or transition-based has settled, then return.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);

  const shot = await page.screenshot({ fullPage: true });
  const dir = path.join(OUT, String(width));
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });

  const scaled = sharp(shot).resize({ width: TILE_WIDTH });
  const buf = await scaled.png().toBuffer();
  const { height } = await sharp(buf).metadata();

  const tiles = Math.ceil(height / TILE_HEIGHT);
  for (let i = 0; i < tiles; i++) {
    const top = i * TILE_HEIGHT;
    await sharp(buf)
      .extract({ left: 0, top, width: TILE_WIDTH, height: Math.min(TILE_HEIGHT, height - top) })
      .toFile(path.join(dir, `tile-${i + 1}.png`));
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  console.log(`${String(width).padStart(4)}  page ${height * (width / TILE_WIDTH) | 0}px tall  ${tiles} tiles  overflow=${overflow}`);
  await page.close();
}

await browser.close();
