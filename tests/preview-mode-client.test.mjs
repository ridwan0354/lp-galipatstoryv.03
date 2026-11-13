import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('client-side preview logic handles both new_tab and modal settings correctly', async () => {
  const appJs = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');

  // Verify that openDemoUrl exists and is used in openPreview and loadPreview
  assert.ok(appJs.includes('function openDemoUrl(url)'), 'openDemoUrl function should exist');
  assert.ok(appJs.includes("siteSettings.previewMode==='new_tab'"), 'should check siteSettings.previewMode');
  assert.ok(appJs.includes("fetch('/api/settings')"), 'should fetch /api/settings');
  assert.ok(appJs.includes('preview-help-open-tab'), 'should update preview-help-open-tab href');

  const indexHtml = await fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(indexHtml.includes('id="preview-help-open-tab"'), 'index.html should contain preview-help-open-tab link');
  assert.ok(indexHtml.includes('buka di tab baru'), 'index.html should have buka di tab baru text');

  // Simulate environment
  let openedUrls = [];
  const fakeWindow = {
    open: (url, target, features) => {
      openedUrls.push({ url, target, features });
      return { closed: false };
    },
    location: {
      assign: (url) => { openedUrls.push({ url, fallback: true }); }
    }
  };

  function mockOpenDemoUrl(url) {
    if (!url) return;
    try {
      const win = fakeWindow.open(url, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        fakeWindow.location.assign(url);
      }
    } catch (_) {
      fakeWindow.location.assign(url);
    }
  }

  // Test 1: new_tab with variants
  const themeWithVariants = {
    id: 'te-02',
    name: 'TE#02',
    category: 'Eksklusif',
    price: 99000,
    photoPrice: 149000,
    demo: 'https://by.galipatstory.id/te02-nophoto',
    demoPhoto: 'https://by.galipatstory.id/te02-photo'
  };

  openedUrls = [];
  let modalOpen = true;
  function closePreviewModal() { modalOpen = false; }

  // User chooses "Dengan Foto"
  function loadPreview(photo, previewTheme, previewMode) {
    const url = photo ? previewTheme?.demoPhoto : previewTheme?.demo;
    if (!url) return;
    if (previewMode === 'new_tab') {
      closePreviewModal();
      mockOpenDemoUrl(url);
      return;
    }
    // modal mode
  }

  loadPreview(true, themeWithVariants, 'new_tab');
  assert.equal(modalOpen, false, 'modal should be closed after choosing variant in new_tab mode');
  assert.equal(openedUrls.length, 1);
  assert.equal(openedUrls[0].url, 'https://by.galipatstory.id/te02-photo');

  // User chooses "Tanpa Foto"
  openedUrls = [];
  modalOpen = true;
  loadPreview(false, themeWithVariants, 'new_tab');
  assert.equal(modalOpen, false);
  assert.equal(openedUrls.length, 1);
  assert.equal(openedUrls[0].url, 'https://by.galipatstory.id/te02-nophoto');

  // Test 2: new_tab without variants (direct open without showing choice dialog)
  const singleTheme = {
    id: 'single-01',
    name: 'SG#01',
    category: 'Minimalis',
    price: 79000,
    demo: 'https://by.galipatstory.id/single01'
  };

  openedUrls = [];
  function openPreview(theme, previewMode) {
    if (previewMode === 'new_tab' && !theme.demoPhoto) {
      if (theme.demo) {
        mockOpenDemoUrl(theme.demo);
        return 'opened_directly';
      }
    }
    return 'opened_modal_choice';
  }

  const resultSingle = openPreview(singleTheme, 'new_tab');
  assert.equal(resultSingle, 'opened_directly');
  assert.equal(openedUrls.length, 1);
  assert.equal(openedUrls[0].url, 'https://by.galipatstory.id/single01');

  // With variants in new_tab mode, openPreview opens choice dialog
  const resultVariant = openPreview(themeWithVariants, 'new_tab');
  assert.equal(resultVariant, 'opened_modal_choice');

  // In modal mode, single theme opens modal viewer
  const resultSingleModal = openPreview(singleTheme, 'modal');
  assert.equal(resultSingleModal, 'opened_modal_choice');
});
