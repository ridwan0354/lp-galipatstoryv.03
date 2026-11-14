import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WINDOW_30D_MS,
  createEmptyAnalyticsState,
  recordVisit,
  recordWaClick,
  buildAnalyticsSummary,
  resolveVisitorId
} from '../analytics.mjs';

test('30-day unique visitor deduplication ignores refreshes and repeat visits within 30 days', () => {
  const state = createEmptyAnalyticsState();
  const t0 = Date.UTC(2026, 10, 1, 10, 0, 0);
  const vid = resolveVisitorId('gs_user_12345678', '1.2.3.4', 'Mozilla/5.0');

  // First visit on Home
  const v1 = recordVisit(state, { page: 'home', visitorId: vid, now: t0 });
  assert.equal(v1.isNewOnPage, true);
  assert.equal(v1.isNewGlobal, true);

  // Refresh 10 seconds later
  const v2 = recordVisit(state, { page: 'home', visitorId: vid, now: t0 + 10_000 });
  assert.equal(v2.isNewOnPage, false);

  // Reopen 5 days later
  const v3 = recordVisit(state, { page: 'home', visitorId: vid, now: t0 + 5 * 86400_000 });
  assert.equal(v3.isNewOnPage, false);

  // Reopen 29 days later (still within 1 month / 30 days)
  const v4 = recordVisit(state, { page: 'home', visitorId: vid, now: t0 + 29 * 86400_000 });
  assert.equal(v4.isNewOnPage, false);

  const summary29d = buildAnalyticsSummary(state, t0 + 29 * 86400_000);
  assert.equal(summary29d.pages.home.uniqueMonthly, 1);
  assert.equal(summary29d.pages.home.totalPageviews, 4);

  // Reopen 31 days later (new 1-month cycle)
  const v5 = recordVisit(state, { page: 'home', visitorId: vid, now: t0 + WINDOW_30D_MS + 1000 });
  assert.equal(v5.isNewOnPage, true);

  const summary31d = buildAnalyticsSummary(state, t0 + WINDOW_30D_MS + 1000);
  assert.equal(summary31d.pages.home.uniqueMonthly, 2);
  assert.equal(summary31d.pages.home.totalPageviews, 5);
});

test('separates visitor and WhatsApp click data across home, web, and tema pages', () => {
  const state = createEmptyAnalyticsState();
  const now = Date.UTC(2026, 10, 14, 8, 0, 0);
  const userA = resolveVisitorId('gs_user_aaaaaaaa', '10.0.0.1', 'UA-1');
  const userB = resolveVisitorId('gs_user_bbbbbbbb', '10.0.0.2', 'UA-2');

  // User A visits Home and Tema
  recordVisit(state, { page: 'home', visitorId: userA, now });
  recordVisit(state, { page: 'tema', visitorId: userA, now: now + 1000 });

  // User B visits Web Invitation
  recordVisit(state, { page: 'web', visitorId: userB, now: now + 2000 });

  // User A clicks TE#06 on Home (from card) and Add-on Proses Prioritas on Home
  recordWaClick(state, {
    page: 'home',
    visitorId: userA,
    location: 'theme-card',
    theme: 'TE#06',
    category: 'Eksklusif',
    now: now + 3000
  });
  recordWaClick(state, {
    page: 'home',
    visitorId: userA,
    location: 'addon-priority',
    theme: 'Add-on Proses Prioritas',
    category: 'Add-on',
    now: now + 4000
  });

  // User A clicks TE#06 on Tema page (from preview modal)
  recordWaClick(state, {
    page: 'tema',
    visitorId: userA,
    location: 'preview',
    theme: 'TE#06',
    category: 'Eksklusif',
    now: now + 5000
  });

  // User B clicks Nav WA button on Web Invitation page
  recordWaClick(state, {
    page: 'web',
    visitorId: userB,
    location: 'nav',
    theme: '',
    category: '',
    now: now + 6000
  });

  const summary = buildAnalyticsSummary(state, now + 7000);

  // Page visitor separation
  assert.equal(summary.pages.home.uniqueMonthly, 1);
  assert.equal(summary.pages.tema.uniqueMonthly, 1);
  assert.equal(summary.pages.web.uniqueMonthly, 1);
  assert.equal(summary.pages.all.uniqueMonthly, 2); // 2 distinct people overall

  // Page WA click separation
  assert.equal(summary.pages.home.totalWaClicks, 2);
  assert.equal(summary.pages.tema.totalWaClicks, 1);
  assert.equal(summary.pages.web.totalWaClicks, 1);
  assert.equal(summary.pages.all.totalWaClicks, 4);

  // Theme breakdown in 'all' vs 'home' vs 'tema'
  const te06All = summary.pages.all.themes.find(t => t.name === 'TE#06');
  assert.ok(te06All);
  assert.equal(te06All.totalClicks, 2);
  assert.equal(te06All.fromCard, 1);
  assert.equal(te06All.fromPreview, 1);
  assert.equal(te06All.uniqueClickers, 1);

  const te06Home = summary.pages.home.themes.find(t => t.name === 'TE#06');
  assert.equal(te06Home.totalClicks, 1);
  assert.equal(te06Home.fromCard, 1);
  assert.equal(te06Home.fromPreview, 0);

  const te06Tema = summary.pages.tema.themes.find(t => t.name === 'TE#06');
  assert.equal(te06Tema.totalClicks, 1);
  assert.equal(te06Tema.fromCard, 0);
  assert.equal(te06Tema.fromPreview, 1);

  // Web page has general consultation click on 'nav'
  assert.equal(summary.pages.web.locations[0].location, 'nav');
  assert.equal(summary.pages.web.themes[0].name, 'Konsultasi Umum (Tanpa Tema Spesifik)');
});

test('HTTP /api/track and /api/admin/analytics work end-to-end with 30-day deduplication', async () => {
  const { spawn } = await import('node:child_process');
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'galipat-analytics-test-'));
  let child;
  const port = 14355;
  const base = `http://127.0.0.1:${port}`;

  async function start() {
    child = spawn(process.execPath, [path.join(dir, 'server.mjs')], {
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await new Promise((resolve, reject) => {
      child.stdout.once('data', resolve);
      child.once('exit', () => reject(Error('Server stopped')));
      child.once('error', reject);
    });
  }

  async function stop() {
    child.kill();
    await new Promise(r => child.once('exit', r));
  }

  try {
    await fs.mkdir(path.join(dir, 'public'));
    await fs.mkdir(path.join(dir, 'data'));
    await fs.writeFile(path.join(dir, 'data/themes.json'), '[]');
    await fs.copyFile(new URL('../server.mjs', import.meta.url), path.join(dir, 'server.mjs'));
    await fs.copyFile(new URL('../preview.mjs', import.meta.url), path.join(dir, 'preview.mjs'));
    await start();

    const secret = await fs.readFile(path.join(dir, 'AKSES-ADMIN.txt'), 'utf8');
    const password = secret.match(/Kata sandi awal: (.+)/)[1];

    // Unauthenticated access to /api/admin/analytics must return 401
    const unauth = await fetch(base + '/api/admin/analytics');
    assert.equal(unauth.status, 401);

    // Track visits from same user on home page twice (simulating refresh)
    const trackHeaders = { Origin: base, 'Content-Type': 'application/json' };
    const r1 = await fetch(base + '/api/track', {
      method: 'POST',
      headers: trackHeaders,
      body: JSON.stringify({ type: 'visit', page: 'home', visitorId: 'gs_test_visitor_001' })
    });
    assert.equal(r1.status, 200);
    const j1 = await r1.json();
    assert.equal(j1.isNewOnPage, true);

    // Refreshing the page should not count as a new monthly unique visitor
    const r2 = await fetch(base + '/api/track', {
      method: 'POST',
      headers: trackHeaders,
      body: JSON.stringify({ type: 'visit', page: 'home', visitorId: 'gs_test_visitor_001' })
    });
    const j2 = await r2.json();
    assert.equal(j2.isNewOnPage, false);

    // Click WA button on /tema
    const r3 = await fetch(base + '/api/track', {
      method: 'POST',
      headers: trackHeaders,
      body: JSON.stringify({
        type: 'wa_click',
        page: 'tema',
        visitorId: 'gs_test_visitor_001',
        location: 'preview',
        theme: 'TE#06',
        category: 'Eksklusif'
      })
    });
    assert.equal(r3.status, 200);

    // Login as admin and inspect /api/admin/analytics
    const loginRes = await fetch(base + '/api/login', {
      method: 'POST',
      headers: trackHeaders,
      body: JSON.stringify({ username: 'admin', password })
    });
    const cookie = loginRes.headers.get('set-cookie').split(';')[0];

    const analyticsRes = await fetch(base + '/api/admin/analytics', {
      headers: { Cookie: cookie }
    });
    assert.equal(analyticsRes.status, 200);
    const data = await analyticsRes.json();

    assert.equal(data.pages.home.uniqueMonthly, 1);
    assert.equal(data.pages.home.totalPageviews, 2);
    assert.equal(data.pages.tema.totalWaClicks, 1);
    assert.equal(data.pages.tema.themes[0].name, 'TE#06');
    assert.equal(data.pages.tema.themes[0].fromPreview, 1);
  } finally {
    if (child?.exitCode === null) await stop();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
