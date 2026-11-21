import assert from 'node:assert/strict';
import { access, mkdir, readFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const captures = JSON.parse(await readFile(join(workspace, 'shots.json'), 'utf8'));
assert.equal(captures.length, 4, 'The capture manifest must specify four views.');

function jpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'Screenshot must begin with a JPEG signature.');
  let cursor = 2;
  while (cursor + 4 <= bytes.length) {
    assert.equal(bytes[cursor++], 255, 'Malformed JPEG marker.');
    while (bytes[cursor] === 255) cursor++;
    const marker = bytes[cursor++];
    const blockLength = bytes.readUInt16BE(cursor);
    if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
      return { width: bytes.readUInt16BE(cursor + 5), height: bytes.readUInt16BE(cursor + 3) };
    }
    assert.ok(blockLength >= 2, 'JPEG marker length must advance the reader.');
    cursor += blockLength;
  }
  throw new Error('JPEG dimensions were not found.');
}

if (process.argv.includes('--capture')) {
  const moduleLocation = process.env.PLAYWRIGHT_MODULE;
  assert.ok(moduleLocation, 'Set PLAYWRIGHT_MODULE to the installed Playwright index.mjs.');
  const { chromium } = await import(pathToFileURL(resolve(moduleLocation)).href);
  let executablePath = process.env.CHROMIUM_BINARY;
  if (!executablePath) {
    const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), '.cache', 'ms-playwright');
    const installations = (await readdir(cache)).filter(name => name.startsWith('chromium')).sort().reverse();
    for (const installation of installations) {
      for (const relative of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/headless_shell']) {
        const candidate = join(cache, installation, relative);
        try { await access(candidate); executablePath = candidate; break; } catch {}
      }
      if (executablePath) break;
    }
  }
  assert.ok(executablePath, 'A cached Chromium installation is required.');
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  try {
    await mkdir(join(workspace, 'screenshots'), { recursive: true });
    for (const capture of captures) {
      const page = await browser.newPage({ viewport: { width: capture.w, height: capture.h }, deviceScaleFactor: 1 });
      try {
        const address = new URL(capture.query, process.env.CAPTURE_URL || 'http://127.0.0.1:8080/');
        await page.goto(address.href, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => document.querySelectorAll('#photo-library img').length > 0);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: join(workspace, 'screenshots', capture.name), type: 'jpeg', quality: 90, fullPage: false });
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
}

const storedNames = await readdir(join(workspace, 'screenshots'));
assert.deepEqual(storedNames.sort(), captures.map(capture => capture.name).sort());
for (const capture of captures) {
  const bytes = await readFile(join(workspace, 'screenshots', capture.name));
  assert.ok(bytes.length <= 262144, `${capture.name} exceeds the screenshot byte limit.`);
  const dimensions = jpegDimensions(bytes);
  assert.deepEqual(dimensions, { width: capture.w, height: capture.h }, `${capture.name} differs from its viewport.`);
  assert.ok(Math.max(dimensions.width, dimensions.height) <= 1280, 'Screenshot long side exceeds 1280 pixels.');
  assert.ok(Math.min(dimensions.width, dimensions.height) >= 480, 'Screenshot short side falls below 480 pixels.');
}
process.stdout.write('Screenshot validation PASS: four JPEG headers, dimensions and sizes.\n');
