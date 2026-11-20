import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const shots = JSON.parse(readFileSync(new URL('../shots.json', import.meta.url)));
const directory = new URL('../screenshots/', import.meta.url);

function dimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'Expected a JPEG');
  assert.equal(bytes.readUInt16BE(bytes.length - 2), 0xffd9, 'Incomplete JPEG');
  for (let offset = 2; offset < bytes.length;) {
    assert.equal(bytes[offset], 0xff, 'Invalid JPEG marker');
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      return { w: bytes.readUInt16BE(offset + 7), h: bytes.readUInt16BE(offset + 5) };
    }
    assert(length >= 2, 'Invalid JPEG segment');
    offset += length + 2;
  }
  throw Error('Missing JPEG dimensions');
}

assert(shots.length >= 3 && shots.length <= 4);
assert.deepEqual(readdirSync(directory).sort(), shots.map(({ name }) => name).sort());
if (process.argv.includes('--capture')) {
  const modulePath = process.env.PLAYWRIGHT_MODULE;
  const executablePath = process.env.CHROMIUM_BINARY;
  assert(modulePath && executablePath, 'Set PLAYWRIGHT_MODULE and CHROMIUM_BINARY to existing cached tools');
  const { chromium } = await import(modulePath);
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  try {
    for (const { name, query, w, h } of shots) {
      assert(Math.max(w, h) <= 1280 && Math.min(w, h) >= 480, name);
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto((process.env.CAPTURE_URL || 'http://127.0.0.1:8080/') + query);
      await page.waitForSelector('.thumb', { state: 'attached' });
      await page.evaluate(() => document.fonts.ready);
      assert.deepEqual(errors, [], name);
      if (!query.includes('poster')) {
        assert(await page.locator('#export').evaluate((node) => node.getBoundingClientRect().bottom <= innerHeight), 'Editor export must be visible');
      }
      const options = { type: 'jpeg', quality: 86, animations: 'disabled' };
      assert((await page.screenshot(options)).length <= 262144, name + ' exceeds byte cap');
      await page.screenshot({ ...options, path: new URL(name, directory).pathname, fullPage: false });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

for (const { name, w, h } of shots) {
  const bytes = readFileSync(new URL(name, directory));
  const actual = dimensions(bytes);
  assert.deepEqual(actual, { w, h }, name + ' differs from shots.json');
  assert(Math.max(actual.w, actual.h) <= 1280, name + ' long side exceeds 1280');
  assert(Math.min(actual.w, actual.h) >= 480, name + ' short side below 480');
  assert(bytes.length <= 262144, name + ' exceeds 256 KiB');
  console.log(name, actual.w + 'x' + actual.h, bytes.length + ' bytes — PASS');
}
