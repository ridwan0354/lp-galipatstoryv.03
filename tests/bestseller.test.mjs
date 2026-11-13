import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('bestseller setup in frontend and data', () => {
  const themesRaw = fs.readFileSync(path.resolve('data/themes.json'), 'utf8');
  const themes = JSON.parse(themesRaw);
  const bestsellers = themes.filter(t => t.bestseller);
  assert.ok(bestsellers.length >= 10, 'Must have at least 10 bestseller themes initially');

  const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8');
  // Check that default category is Bestseller
  assert.match(appJs, /category\s*=\s*['"]Bestseller['"]/);
  // Check that 'Semua' is removed from categories list
  assert.ok(!appJs.includes("['Semua'"), "Category list should not start with 'Semua'");
  assert.ok(appJs.includes("['Bestseller'"), "Category list should start with 'Bestseller'");

  const adminHtml = fs.readFileSync(path.resolve('public/admin.html'), 'utf8');
  assert.ok(adminHtml.includes('id="filter-bestseller-only"'), 'Admin must have bestseller filter');
  assert.ok(adminHtml.includes('name="bestseller"'), 'Theme form must have bestseller checkbox');
});
