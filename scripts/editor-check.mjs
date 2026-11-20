import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_BINARY, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1150 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(process.env.CAPTURE_URL || 'http://127.0.0.1:8080/');
  await page.waitForSelector('.thumb');
  const art = () => page.locator('#art').evaluate((canvas) => canvas.toDataURL());
  const initial = await art();
  await page.click('[data-grade="teal"]');
  assert.notEqual(await art(), initial);
  await page.click('#undo');
  assert.equal(await art(), initial, 'Undo must restore the exact render');
  await page.click('#redo');
  assert.notEqual(await art(), initial, 'Redo must restore the changed render');
  for (const grade of ['sunset', 'night', 'golden', 'mono', 'teal', 'heat']) {
    await page.selectOption('#panel-grade', grade);
    assert.equal(await page.locator('#panel-grade').inputValue(), grade);
  }
  for (const layout of ['mosaic', 'strip', 'seven', 'hero', 'grid']) {
    await page.click('[data-layout="' + layout + '"]');
    const source = await art();
    await page.click('#name-tag');
    assert.notEqual(await art(), source, 'Panel tag toggle must render in ' + layout);
    await page.click('#name-tag');
    await page.click('#auto-fill');
  }
  const originalTag = await page.locator('#tag-name').inputValue();
  await page.fill('#tag-name', 'THE TEST DRIVER');
  await page.locator('#tag-name').blur();
  assert.equal(await page.locator('#tag-name').inputValue(), 'THE TEST DRIVER');
  await page.click('#undo');
  assert.equal(await page.locator('#tag-name').inputValue(), originalTag);
  await page.click('#flip-panel');
  assert.equal(await page.locator('#flip-panel').getAttribute('aria-pressed'), 'true');
  await page.click('#swap-panel');
  assert.equal(await page.locator('#flip-panel').getAttribute('aria-pressed'), 'true', 'Swap follows the selected photo');
  const beforeFurniture = await art();
  await page.click('#furniture-toggle');
  assert.notEqual(await art(), beforeFurniture);
  await page.click('#undo');
  assert.equal(await art(), beforeFurniture);
  const previousLayout = await page.locator('[data-layout].selected').getAttribute('data-layout');
  const previousGrade = await page.locator('[data-grade].selected').getAttribute('data-grade');
  await page.click('#surprise');
  assert.notEqual(await page.locator('[data-layout].selected').getAttribute('data-layout'), previousLayout);
  assert.notEqual(await page.locator('[data-grade].selected').getAttribute('data-grade'), previousGrade);
  for (const [format, w, h] of [['square',1080,1080], ['portrait',1080,1350], ['story',1080,1920], ['landscape',1920,1080]]) {
    await page.click('[data-size="' + format + '"]');
    const downloadEvent = page.waitForEvent('download');
    await page.click('#export');
    const download = await downloadEvent;
    assert(download.suggestedFilename().endsWith(w + 'x' + h + '.png'));
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const png = Buffer.concat(chunks);
    assert.equal(png.readUInt32BE(16), w);
    assert.equal(png.readUInt32BE(20), h);
  }
  assert.deepEqual(errors, []);
  console.log('Editor: history, six grades, five layouts, tags, flip, swap, furniture, surprise and four PNG exports PASS');
} finally {
  await browser.close();
}
