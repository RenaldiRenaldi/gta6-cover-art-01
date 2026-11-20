import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_BINARY, args: ['--no-sandbox'] });
const root = new URL('../', import.meta.url);
const references = new URL('../../cover-art-R3-refs/', import.meta.url);
const shots = JSON.parse(readFileSync(new URL('shots.json', root)));
const data = (file, type) => `data:image/${type};base64,${readFileSync(file).toString('base64')}`;
try {
  for (const width of [1024, 512]) {
    for (const { name } of shots) {
      const page = await browser.newPage({ viewport: { width: width * 3, height: 2000 }, deviceScaleFactor: 1 });
      await page.setContent(`<body style="margin:0;background:#161326;color:white;font:16px Arial"><main style="display:flex;align-items:flex-start"><section style="width:${width}px">${name}<img style="display:block;width:100%" src="${data(new URL('screenshots/' + name, root), 'jpeg')}"></section>${['top1-ryanp1632-lead.webp', 'top10-crisp-lead.webp'].map((ref) => `<section style="width:${width}px">${ref}<img style="display:block;width:100%" src="${data(new URL(ref, references), 'webp')}"></section>`).join('')}</main></body>`);
      await page.locator('img').evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
      await page.locator('main').screenshot({ path: `/tmp/rainline-real-${width}-${name}`, type: 'jpeg', quality: 90 });
      await page.close();
    }
  }
  for (const { name, query } of shots.filter(({ name }) => name !== '2-studio.jpg')) {
    const page = await browser.newPage();
    await page.goto((process.env.CAPTURE_URL || 'http://127.0.0.1:8080/') + query);
    await page.waitForSelector('.thumb', { state: 'attached' });
    const sources = await page.locator('.thumb img').evaluateAll((images) => images.map((image) => new URL(image.src).pathname));
    assert.equal(sources.length, 7);
    assert(sources.every((source) => ['/samples/boulevard.jpg', '/samples/pier.jpg'].includes(source)));
    const regions = name === '1-rainline.jpg'
      ? [[0,0,.245,.405], [.255,0,.24,.405], [.505,0,.24,.405], [.755,0,.245,.405], [0,.419,.327,.285], [.337,.419,.326,.285], [.673,.419,.327,.285]]
      : name === '3-stories.jpg'
        ? [[0,0,.62,.46], [.62,0,.38,.22], [.60,.24,.40,.22], [0,.48,.48,.22], [.47,.48,.53,.22]]
        : [[.48,.034,.494,.835]];
    const dimensions = await page.locator('#art').evaluate(({ width, height }) => ({ width, height }));
    const panels = regions.map(([x, y, w, h]) => ({ box: { x: x * dimensions.width, y: y * dimensions.height, w: w * dimensions.width, h: h * dimensions.height } }));
    for (const [index, { box }] of panels.entries()) {
      const panel = await page.evaluate(({ x, y, w, h }) => {
        const output = document.createElement('canvas');
        output.width = Math.ceil(w); output.height = Math.ceil(h);
        output.getContext('2d').drawImage(document.querySelector('#art'), x, y, w, h, 0, 0, output.width, output.height);
        return output.toDataURL();
      }, box);
      const inspection = await browser.newPage({ viewport: { width: 1536, height: 2200 }, deviceScaleFactor: 1 });
      await inspection.setContent(`<body style="margin:0;background:#161326"><main style="display:flex;align-items:flex-start"><img style="width:1024px" src="${panel}"><img style="width:512px" src="${panel}"></main></body>`);
      await inspection.locator('img').evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
      await inspection.locator('main').screenshot({ path: `/tmp/rainline-panel-${name}-${index}.jpg`, type: 'jpeg', quality: 90 });
      await inspection.close();
    }
    console.log(name, panels);
    await page.close();
  }
} finally {
  await browser.close();
}
