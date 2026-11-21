import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.execPath, [join(repository, 'scripts', 'screenshots.mjs')], { stdio: 'inherit' });
const markup = await readFile(join(repository, 'app', 'index.html'), 'utf8');
assert.ok(markup.includes('<canvas'), 'The app requires its drawing surface.');
assert.ok(process.env.PLAYWRIGHT_MODULE, 'Set PLAYWRIGHT_MODULE to the existing browser automation module.');
assert.ok(process.env.CHROMIUM_BINARY, 'Set CHROMIUM_BINARY to the cached Chromium executable.');
const { chromium } = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_BINARY, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1150 }, acceptDownloads: true });
  const faults = [];
  page.on('pageerror', error => faults.push(error.message));
  await page.goto(process.env.CAPTURE_URL || 'http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('#photo-library img').length > 0);
  const canvasDigest = () => page.locator('#art').evaluate(canvas => canvas.toDataURL());
  const initialCaption = await page.locator('#caption').inputValue();
  await page.locator('#caption').fill('EDITOR VERIFICATION');
  await page.locator('#caption').dispatchEvent('change');
  await page.locator('#undo').click();
  assert.equal(await page.locator('#caption').inputValue(), initialCaption, 'Undo must restore the title.');
  await page.locator('#redo').click();
  assert.equal(await page.locator('#caption').inputValue(), 'EDITOR VERIFICATION', 'Redo must restore the edit.');
  for (const attribute of ['grade', 'layout', 'style']) {
    const buttons = page.locator(`[data-${attribute}]`);
    for (let index = 0; index < await buttons.count(); index++) {
      const button = buttons.nth(index);
      await button.click();
      assert.ok((await button.getAttribute('class') || '').includes('selected'), `${attribute} selection did not persist.`);
    }
  }
  await page.locator('[data-layout="hero"]').click();
  for (const selector of ['#tag-name', '#tag-line']) {
    await page.locator(selector).fill('CHECK CHARACTER');
    await page.locator(selector).dispatchEvent('change');
    assert.equal(await page.locator(selector).inputValue(), 'CHECK CHARACTER');
  }
  const unflipped = await page.locator('#flip-panel').getAttribute('aria-pressed');
  await page.locator('#flip-panel').click();
  assert.notEqual(await page.locator('#flip-panel').getAttribute('aria-pressed'), unflipped);
  const beforeSwap = await canvasDigest();
  await page.locator('#swap-panel').click();
  assert.notEqual(await canvasDigest(), beforeSwap, 'Swap must change the rendered panels.');
  for (const selector of ['#name-tag', '#furniture-toggle', '#badge-toggle']) {
    const beforeToggle = await canvasDigest();
    await page.locator(selector).uncheck();
    assert.notEqual(await canvasDigest(), beforeToggle, `${selector} must affect the poster.`);
    await page.locator(selector).check();
  }
  const beforeSurprise = await canvasDigest();
  await page.locator('#surprise').click();
  assert.notEqual(await canvasDigest(), beforeSurprise, 'Surprise me must change the poster.');
  for (const [format, width, height] of [['square', 1080, 1080], ['portrait', 1080, 1350], ['story', 1080, 1920], ['landscape', 1920, 1080]]) {
    await page.locator(`[data-size="${format}"]`).click();
    const pendingDownload = page.waitForEvent('download');
    await page.locator('#export').click();
    const download = await pendingDownload;
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const png = Buffer.concat(chunks);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), width, `${format} export width differs.`);
    assert.equal(png.readUInt32BE(20), height, `${format} export height differs.`);
  }
  assert.deepEqual(faults, [], 'The editor must run without browser exceptions.');
  process.stdout.write('Editor check PASS: history, controls, poster furniture and four PNG exports.\n');
} finally {
  await browser.close();
}
