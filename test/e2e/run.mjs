import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 2560, height: 1080 }, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const css = readFileSync(process.env.SLIDER_CSS || 'styles.css', 'utf8');
const bundle = readFileSync(process.env.SLIDER_BUNDLE || 'main.js', 'utf8');
mkdirSync('test-results', { recursive: true });
let passed = 0;
async function check(name, action) {
  await action();
  console.log(`PASS ${++passed}: ${name}`);
}
async function mount(dimensions, width = '100%', initialIndex = 0) {
  await page.setContent(`<style>body{margin:0;background:#fafafa}#host{width:${width};margin:auto}${css}</style><div id="host"></div>`);
  await page.evaluate(() => {
    HTMLElement.prototype.createEl = function(tag, options = {}) {
      const el = document.createElement(tag);
      if (options.cls) el.className = options.cls;
      if (options.text) el.textContent = options.text;
      for (const [key, value] of Object.entries(options.attr || {})) el.setAttribute(key, value);
      this.append(el); return el;
    };
    HTMLElement.prototype.createDiv = function(o) { return this.createEl('div', o); };
    HTMLElement.prototype.createSpan = function(o) { return this.createEl('span', o); };
    HTMLElement.prototype.setAttr = function(k, v) { this.setAttribute(k, v); };
    HTMLElement.prototype.addClass = function(c) { this.classList.add(c); };
    HTMLElement.prototype.removeClass = function(c) { this.classList.remove(c); };
    HTMLElement.prototype.hasClass = function(c) { return this.classList.contains(c); };
    HTMLElement.prototype.toggleClass = function(c, b) { this.classList.toggle(c, b); };
    window.module = { exports: {} };
    window.require = () => ({ Plugin: class { register() {} }, TFile: class {}, setIcon() {} });
  });
  await page.addScriptTag({ content: bundle });
  await page.evaluate(({ dimensions, initialIndex }) => {
    const slides = dimensions.map(([w, h], i) => ({
      path: `image-${i}.svg`, caption: `Image ${i + 1}: ${w}×${h}`, alt: `Image ${i + 1}`,
      resourcePath: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${['#ddd4ef','#b9dfed','#d8eabc'][i % 3]}"/><rect x="1" y="1" width="${w-2}" height="${h-2}" fill="none" stroke="black"/><text x="20" y="40" font-size="24">${w} × ${h}</text></svg>`)
    }));
    window.plugin = new module.exports.default();
    plugin.createSlider(document.querySelector('#host'), slides, 0, initialIndex, (index) => window.selected = index);
  }, { dimensions, initialIndex });
  await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
}
async function geometry() {
  return page.evaluate(() => {
    const rect = selector => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    return { host: rect('#host'), frame: rect('.simple-image-slider__frame'), image: rect('.simple-image-slider__image--current'), selected: window.selected, scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth };
  });
}
async function fit() {
  const g = await geometry();
  assert(g.frame.width <= g.host.width + 1, JSON.stringify(g));
  assert(g.image.width <= g.frame.width && g.image.height <= g.frame.height, JSON.stringify(g));
  assert(Math.abs(g.image.x + g.image.width / 2 - g.frame.x - g.frame.width / 2) < 2, JSON.stringify(g));
  assert(g.scrollWidth <= g.viewportWidth, JSON.stringify(g));
  assert(g.frame.height <= Math.max(220, Math.min(680, (await page.viewportSize()).height * .78)) + 3, JSON.stringify(g));
  return g;
}
async function settled(index) {
  await page.waitForFunction(i => window.selected === i, index);
  await page.waitForFunction(() => [...document.images].every(i => i.complete));
  return fit();
}
const mixed = [[1023,934],[1908,690],[600,900],[80,60]];
try {
  await check('2560×1080: wide image exceeds old 740px cap', async () => {
    await mount(mixed, '2200px', 1);
    const g = await fit(); assert(g.image.width > 1800, JSON.stringify(g));
    await page.screenshot({ path: 'test-results/wide.png' });
  });
  await check('buttons and wraparound preserve canvas and image proportions', async () => {
    const before = await geometry();
    for (const index of [2,3,0,1]) {
      await page.locator('.simple-image-slider__button--next').click();
      const g = await settled(index);
      assert(Math.abs(g.frame.height - before.frame.height) < 1);
      assert(Math.abs(g.image.width / g.image.height - mixed[index][0] / mixed[index][1]) < .01);
    }
  });
  await check('keyboard and index-menu jumps', async () => {
    await page.locator('.simple-image-slider').focus(); await page.keyboard.press('ArrowLeft'); await settled(0);
    await page.locator('.simple-image-slider__index-button').click();
    await page.locator('.simple-image-slider__index-option').nth(2).click(); await settled(2);
  });
  await check('mouse swipe navigation', async () => {
    const g = await geometry();
    await page.mouse.move(g.frame.x + 400, g.frame.y + 120); await page.mouse.down();
    await page.mouse.move(g.frame.x + 250, g.frame.y + 120, { steps: 8 }); await page.mouse.up();
    await settled(3);
  });
  await check('375px narrow pane, mixed ratios, no horizontal overflow', async () => {
    await page.setViewportSize({ width:375, height:812 }); await mount(mixed);
    for (let i=0;i<4;i++) {
      await fit(); await page.locator('.simple-image-slider__button--next').click(); await settled((i+1)%4);
    }
    await page.screenshot({ path:'test-results/narrow.png' });
  });
  await check('window and pane resize without recreating slider', async () => {
    for (const [width,height] of [[2560,1080],[768,600],[320,300],[1200,800]]) {
      await page.setViewportSize({ width,height }); await fit();
    }
    await page.evaluate(() => document.querySelector('#host').style.width = '600px'); await fit();
    await page.locator('.simple-image-slider__button--next').click(); await settled(1);
  });
  await check('single panorama and portrait use intrinsic canvas sizes', async () => {
    await page.setViewportSize({ width:2560,height:1080 });
    await mount([[1908,690]], '2200px'); let g = await fit(); assert(g.image.width >1800);
    assert.equal(await page.locator('.simple-image-slider__button').count(),0);
    await mount([[600,900]], '1000px'); g=await fit(); assert(g.image.height>650); assert(g.image.width<500);
  });
  await check('small images do not upscale and restored index is honored', async () => {
    await mount(mixed,'1000px',3); const g=await fit(); assert.equal(g.selected,3); assert(g.image.width<=80); assert(g.image.height<=60);
  });
  await check('touch swipe on mobile', async () => {
    await page.setViewportSize({width:375,height:812}); await mount(mixed);
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:280,y:150}]});
    await session.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:170,y:150}]});
    await session.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    await settled(1); await session.detach();
  });
  await check('resize during animated transition settles correctly', async () => {
    await page.locator('.simple-image-slider__button--next').click();
    await page.setViewportSize({width:1200,height:800}); await settled(2);
    await page.locator('.simple-image-slider__button--previous').click(); await settled(1);
  });
  assert.deepEqual(errors, []);
  console.log(`${passed} browser scenarios passed. These use the real compiled slider and CSS with mocked Obsidian host APIs, not the Obsidian application.`);
} finally { await browser.close(); }
