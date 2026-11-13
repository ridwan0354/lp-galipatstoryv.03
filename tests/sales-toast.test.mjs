import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('sales-data.json has 250 realistic purchases partitioned across 7 days with valid assets', () => {
  const filePath = path.resolve('public/sales-data.json');
  assert.ok(fs.existsSync(filePath), 'public/sales-data.json must exist');

  const raw = fs.readFileSync(filePath, 'utf8');
  const sales = JSON.parse(raw);

  assert.equal(sales.length, 250, 'Sales pool must contain exactly 250 items');

  const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const ids = new Set();

  for (const item of sales) {
    assert.ok(item.id, 'item must have an id');
    assert.ok(!ids.has(item.id), `duplicate id ${item.id}`);
    ids.add(item.id);

    assert.ok(typeof item.day === 'number' && item.day >= 0 && item.day <= 6, 'day must be between 0 and 6');
    dayCounts[item.day]++;

    assert.ok(item.name && item.name.length >= 3, 'name must be realistic');
    assert.ok(item.city && item.city.length >= 3, 'city must be specified');
    assert.ok(item.themeName, 'themeName must be specified');
    assert.ok(item.themeImage, 'themeImage must be specified');

    // Verify image exists on disk in public/
    const imgPath = path.resolve('public', item.themeImage.replace(/^\//, ''));
    assert.ok(fs.existsSync(imgPath), `image file must exist on disk: ${item.themeImage}`);
  }

  // Verify balanced 7-day distribution (~35-36 per day)
  for (let d = 0; d < 7; d++) {
    assert.ok(dayCounts[d] >= 34, `Day ${d} must have at least 34 items (found ${dayCounts[d]})`);
  }
});

test('index.html and style.css contain sales toast element and styling', () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  assert.ok(html.includes('id="sales-toast"'), 'index.html must contain #sales-toast');
  assert.ok(html.includes('id="sales-toast-close"'), 'index.html must contain #sales-toast-close');
  assert.ok(html.includes('id="sales-toast-name"'), 'index.html must contain #sales-toast-name');
  assert.ok(html.includes('id="sales-toast-theme"'), 'index.html must contain #sales-toast-theme');

  const css = fs.readFileSync('public/style.css', 'utf8');
  assert.ok(css.includes('.sales-toast'), 'style.css must define .sales-toast');
  assert.ok(css.includes('@media(max-width:600px)'), 'style.css must have mobile responsive rules');
});
