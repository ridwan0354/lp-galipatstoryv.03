import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyAnalyticsState,
  recordVisit,
  recordWaClick,
  buildAnalyticsSummary,
  resolveVisitorId,
  jktMonth,
  getPrevMonthKey,
  purgeOldMonths
} from '../analytics.mjs';

test('monthly unique visitor deduplication ignores refreshes and repeat visits in the same month', () => {
  const tNov1 = Date.UTC(2026, 10, 1, 10, 0, 0); // 1 Nov 2026
  const state = createEmptyAnalyticsState(tNov1);
  const vid = resolveVisitorId('gs_user_12345678', '1.2.3.4', 'Mozilla/5.0');

  // First visit on Home
  const v1 = recordVisit(state, { page: 'home', visitorId: vid, now: tNov1 });
  assert.equal(v1.isNewOnPage, true);
  assert.equal(v1.isNewGlobal, true);

  // Refresh 10 seconds later
  const v2 = recordVisit(state, { page: 'home', visitorId: vid, now: tNov1 + 10_000 });
  assert.equal(v2.isNewOnPage, false);

  // Reopen 5 days later (still November)
  const v3 = recordVisit(state, { page: 'home', visitorId: vid, now: tNov1 + 5 * 86400_000 });
  assert.equal(v3.isNewOnPage, false);

  // Reopen 25 days later (26 Nov 2026)
  const v4 = recordVisit(state, { page: 'home', visitorId: vid, now: tNov1 + 25 * 86400_000 });
  assert.equal(v4.isNewOnPage, false);

  const summaryNov = buildAnalyticsSummary(state, tNov1 + 25 * 86400_000);
  assert.equal(summaryNov.months['2026-11'].pages.home.uniqueMonthly, 1);
  assert.equal(summaryNov.months['2026-11'].pages.home.totalPageviews, 4);

  // Reopen in December 2026 (new month: 2 Dec 2026)
  const tDec2 = Date.UTC(2026, 11, 2, 8, 0, 0);
  const v5 = recordVisit(state, { page: 'home', visitorId: vid, now: tDec2 });
  assert.equal(v5.isNewOnPage, true);

  const summaryDec = buildAnalyticsSummary(state, tDec2);
  // In December: 1 unique visitor in December
  assert.equal(summaryDec.months['2026-12'].pages.home.uniqueMonthly, 1);
  assert.equal(summaryDec.months['2026-12'].pages.home.totalPageviews, 1);
  // November is still available as previous month!
  assert.ok(summaryDec.months['2026-11']);
  assert.equal(summaryDec.months['2026-11'].pages.home.uniqueMonthly, 1);
  assert.equal(summaryDec.months['2026-11'].pages.home.totalPageviews, 4);
});

test('auto-purges data older than 1 month passed (November deleted when January arrives)', () => {
  const tNov = Date.UTC(2026, 10, 15, 8, 0, 0); // Nov 2026
  const state = createEmptyAnalyticsState(tNov);
  const user = resolveVisitorId('gs_user_test_retention');

  // Visit in November
  recordVisit(state, { page: 'home', visitorId: user, now: tNov });
  assert.ok(state.months['2026-11']);

  // Move to December 2026
  const tDec = Date.UTC(2026, 11, 15, 8, 0, 0); // Dec 2026
  recordVisit(state, { page: 'home', visitorId: user, now: tDec });
  // Both November and December exist
  assert.ok(state.months['2026-11']);
  assert.ok(state.months['2026-12']);

  // Move to January 2027
  const tJan = Date.UTC(2027, 0, 20, 8, 0, 0); // Jan 2027
  recordVisit(state, { page: 'home', visitorId: user, now: tJan });

  // Now January and December exist, while November has been automatically purged!
  assert.ok(state.months['2027-01']);
  assert.ok(state.months['2026-12']);
  assert.equal(state.months['2026-11'], undefined, 'November 2026 data must be deleted in January 2027');

  const summaryJan = buildAnalyticsSummary(state, tJan);
  assert.equal(summaryJan.currentMonth, '2027-01');
  assert.equal(summaryJan.prevMonth, '2026-12');
  assert.equal(summaryJan.months['2026-11'], undefined);
});

test('separates visitor and WhatsApp click data across home, web, and tema pages per month', () => {
  const now = Date.UTC(2026, 10, 14, 8, 0, 0);
  const state = createEmptyAnalyticsState(now);
  const userA = resolveVisitorId('gs_user_aaaaaaaa', '10.0.0.1', 'UA-1');
  const userB = resolveVisitorId('gs_user_bbbbbbbb', '10.0.0.2', 'UA-2');

  recordVisit(state, { page: 'home', visitorId: userA, now });
  recordVisit(state, { page: 'tema', visitorId: userA, now: now + 1000 });
  recordVisit(state, { page: 'web', visitorId: userB, now: now + 2000 });

  recordWaClick(state, {
    page: 'home',
    visitorId: userA,
    location: 'theme-card',
    theme: 'TE#06',
    category: 'Eksklusif',
    now: now + 3000
  });

  recordWaClick(state, {
    page: 'tema',
    visitorId: userA,
    location: 'preview',
    theme: 'TE#06',
    category: 'Eksklusif',
    now: now + 4000
  });

  const summary = buildAnalyticsSummary(state, now + 5000);
  const nov = summary.months['2026-11'];
  assert.ok(nov);
  assert.equal(nov.pages.home.uniqueMonthly, 1);
  assert.equal(nov.pages.tema.uniqueMonthly, 1);
  assert.equal(nov.pages.web.uniqueMonthly, 1);
  assert.equal(nov.pages.all.uniqueMonthly, 2);

  assert.equal(nov.pages.home.totalWaClicks, 1);
  assert.equal(nov.pages.tema.totalWaClicks, 1);
  assert.equal(nov.pages.all.totalWaClicks, 2);

  const te06All = nov.pages.all.themes.find(t => t.name === 'TE#06');
  assert.equal(te06All.totalClicks, 2);
  assert.equal(te06All.fromCard, 1);
  assert.equal(te06All.fromPreview, 1);
});

test('HTTP /api/track and /api/admin/analytics work end-to-end with monthly data and period selection', async () => {
  const { spawn } = await import('node:child_process');
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'galipat-monthly-test-'));
  let child;
  const port = 14356;
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

    // Visit home page twice
    const trackHeaders = { Origin: base, 'Content-Type': 'application/json' };
    const r1 = await fetch(base + '/api/track', {
      method: 'POST',
      headers: trackHeaders,
      body: JSON.stringify({ type: 'visit', page: 'home', visitorId: 'gs_test_nov_001' })
    });
    const j1 = await r1.json();
    assert.equal(j1.isNewOnPage, true);

    const r2 = await fetch(base + '/api/track', {
      method: 'POST',
      headers: trackHeaders,
      body: JSON.stringify({ type: 'visit', page: 'home', visitorId: 'gs_test_nov_001' })
    });
    const j2 = await r2.json();
    assert.equal(j2.isNewOnPage, false);

    // Login as admin
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

    assert.ok(data.availableMonths);
    assert.equal(data.availableMonths.length, 2);
    assert.equal(data.availableMonths[0].isCurrent, true);
    assert.equal(data.availableMonths[1].isCurrent, false);

    const currMonthKey = data.currentMonth;
    const currSummary = data.months[currMonthKey];
    assert.equal(currSummary.pages.home.uniqueMonthly, 1);
    assert.equal(currSummary.pages.home.totalPageviews, 2);
  } finally {
    if (child?.exitCode === null) await stop();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
