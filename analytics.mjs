import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

export const WINDOW_30D_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari (1 bulan)
export const WINDOW_7D_MS = 7 * 24 * 60 * 60 * 1000;   // 7 hari

export const PAGE_KEYS = ['home', 'web', 'tema'];

export const PAGE_LABELS = {
  all: 'Semua Halaman (Gabungan)',
  home: 'Halaman Utama (/)',
  web: 'Web Invitation (/web-invitation)',
  tema: 'Katalog Tema (/tema)'
};

export const LOCATION_LABELS = {
  'theme-card': 'Kartu Tema di Katalog ("Pilih tema ini")',
  'preview': 'Pop-up Preview Tema ("Pilih tema ini via WA")',
  'nav': 'Tombol Navigasi Atas ("Tanya admin")',
  'hero': 'Tombol Hero Atas ("Konsultasi dulu")',
  'mobile-bar': 'Bar Melayang Bawah HP ("Konsultasi WhatsApp")',
  'catalog-help': 'Banner Bantuan Katalog ("Bantu pilih tema")',
  'faq': 'Bagian Tanya Jawab / FAQ ("Tanyakan ke admin")',
  'closing': 'Bagian Penutup Bawah ("Cerita dulu ke admin")',
  'addon-priority': 'Add-on: Proses Prioritas (+50K)',
  'addon-video': 'Add-on: Web to Video (+30K)',
  'addon-link': 'Add-on: Link Custom URL (+50K)',
  'addon-theme': 'Add-on: Ganti Tema (+30K)',
  'addon-lang': 'Add-on: Ganti Bahasa (+20K)',
  'addon-guestbook': 'Add-on: Barcode Buku Tamu (499K)',
  'other': 'Tombol WhatsApp Lainnya'
};

function createEmptyBucket() {
  return {
    uniqueMonthlyTotal: 0,
    totalPageviews: 0,
    totalWaClicks: 0,
    uniqueWaClickersTotal: 0,
    visitors: {},
    waClickVisitors: {},
    byLocation: {},
    byTheme: {},
    daily: {}
  };
}

export function createEmptyAnalyticsState() {
  return {
    version: 1,
    updatedAt: Date.now(),
    pages: {
      all: createEmptyBucket(),
      home: createEmptyBucket(),
      web: createEmptyBucket(),
      tema: createEmptyBucket()
    },
    recentClicks: []
  };
}

export function normalizePageKey(rawPage) {
  const s = String(rawPage || '').trim().toLowerCase();
  if (s === 'web' || s === 'web-invitation' || s === '/web-invitation' || s === '/web-invitation/') return 'web';
  if (s === 'tema' || s === '/tema' || s === '/tema/') return 'tema';
  return 'home';
}

export function getJakartaDateKey(ts = Date.now()) {
  // WIB (UTC+7) YYYY-MM-DD
  const d = new Date(ts + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export function resolveVisitorId(clientVid, ip = '', userAgent = '', salt = 'gs-analytics-v1') {
  const cleanVid = String(clientVid || '').trim();
  if (/^[a-zA-Z0-9_-]{8,64}$/.test(cleanVid)) {
    return 'v_' + cleanVid;
  }
  const raw = `${ip || 'unknown'}|${userAgent || 'unknown'}|${salt}`;
  return 'fp_' + createHash('sha256').update(raw).digest('hex').slice(0, 24);
}

function ensureBucketStructure(bucket) {
  if (!bucket || typeof bucket !== 'object') return createEmptyBucket();
  bucket.uniqueMonthlyTotal = Number(bucket.uniqueMonthlyTotal) || 0;
  bucket.totalPageviews = Number(bucket.totalPageviews) || 0;
  bucket.totalWaClicks = Number(bucket.totalWaClicks) || 0;
  bucket.uniqueWaClickersTotal = Number(bucket.uniqueWaClickersTotal) || 0;
  bucket.visitors = bucket.visitors && typeof bucket.visitors === 'object' ? bucket.visitors : {};
  bucket.waClickVisitors = bucket.waClickVisitors && typeof bucket.waClickVisitors === 'object' ? bucket.waClickVisitors : {};
  bucket.byLocation = bucket.byLocation && typeof bucket.byLocation === 'object' ? bucket.byLocation : {};
  bucket.byTheme = bucket.byTheme && typeof bucket.byTheme === 'object' ? bucket.byTheme : {};
  bucket.daily = bucket.daily && typeof bucket.daily === 'object' ? bucket.daily : {};
  return bucket;
}

export function ensureAnalyticsState(raw) {
  const base = createEmptyAnalyticsState();
  if (!raw || typeof raw !== 'object') return base;
  base.version = 1;
  base.updatedAt = Number(raw.updatedAt) || Date.now();
  if (raw.pages && typeof raw.pages === 'object') {
    for (const k of ['all', ...PAGE_KEYS]) {
      base.pages[k] = ensureBucketStructure(raw.pages[k]);
    }
  }
  base.recentClicks = Array.isArray(raw.recentClicks) ? raw.recentClicks.slice(0, 100) : [];
  return base;
}

function recordVisitInBucket(bucket, visitorId, now, dateKey) {
  bucket.totalPageviews += 1;

  if (!bucket.daily[dateKey]) {
    bucket.daily[dateKey] = { views: 0, uniqueVisitors: 0, waClicks: 0, visitors: {} };
  }
  const dayRec = bucket.daily[dateKey];
  dayRec.views = (Number(dayRec.views) || 0) + 1;
  dayRec.visitors = dayRec.visitors && typeof dayRec.visitors === 'object' ? dayRec.visitors : {};
  if (!dayRec.visitors[visitorId]) {
    dayRec.visitors[visitorId] = now;
    dayRec.uniqueVisitors = (Number(dayRec.uniqueVisitors) || 0) + 1;
  }

  const existing = bucket.visitors[visitorId];
  let isNewMonthlyUnique = false;
  if (!existing || typeof existing.lastCountedAt !== 'number' || (now - existing.lastCountedAt) >= WINDOW_30D_MS) {
    isNewMonthlyUnique = true;
    bucket.uniqueMonthlyTotal += 1;
    bucket.visitors[visitorId] = {
      firstSeenAt: existing?.firstSeenAt || now,
      lastCountedAt: now,
      lastSeenAt: now,
      totalViews: (existing?.totalViews || 0) + 1
    };
  } else {
    existing.lastSeenAt = now;
    existing.totalViews = (existing.totalViews || 0) + 1;
  }

  return isNewMonthlyUnique;
}

export function recordVisit(state, { page, visitorId, now = Date.now() }) {
  const pageKey = normalizePageKey(page);
  const dateKey = getJakartaDateKey(now);
  state.updatedAt = now;

  const isNewOnPage = recordVisitInBucket(state.pages[pageKey], visitorId, now, dateKey);
  const isNewGlobal = recordVisitInBucket(state.pages.all, visitorId, now, dateKey);

  return { page: pageKey, isNewOnPage, isNewGlobal };
}

function recordWaClickInBucket(bucket, visitorId, { locationKey, themeName, categoryName, now, dateKey }) {
  bucket.totalWaClicks += 1;

  if (!bucket.daily[dateKey]) {
    bucket.daily[dateKey] = { views: 0, uniqueVisitors: 0, waClicks: 0, visitors: {} };
  }
  bucket.daily[dateKey].waClicks = (Number(bucket.daily[dateKey].waClicks) || 0) + 1;

  // Unique WA clicker in bucket (30-day deduplicated)
  const lastClickAt = bucket.waClickVisitors[visitorId];
  if (typeof lastClickAt !== 'number' || (now - lastClickAt) >= WINDOW_30D_MS) {
    bucket.uniqueWaClickersTotal += 1;
    bucket.waClickVisitors[visitorId] = now;
  }

  // Per Button Location
  if (!bucket.byLocation[locationKey]) {
    bucket.byLocation[locationKey] = {
      location: locationKey,
      label: LOCATION_LABELS[locationKey] || locationKey,
      totalClicks: 0,
      uniqueClickers: 0,
      visitors: {},
      lastClickedAt: 0
    };
  }
  const locEntry = bucket.byLocation[locationKey];
  locEntry.totalClicks += 1;
  locEntry.lastClickedAt = now;
  locEntry.visitors = locEntry.visitors || {};
  const lastLocClick = locEntry.visitors[visitorId];
  if (typeof lastLocClick !== 'number' || (now - lastLocClick) >= WINDOW_30D_MS) {
    locEntry.uniqueClickers += 1;
    locEntry.visitors[visitorId] = now;
  }

  // Per Theme / Add-on / Consultation
  const tKey = themeName;
  if (!bucket.byTheme[tKey]) {
    bucket.byTheme[tKey] = {
      name: themeName,
      category: categoryName,
      totalClicks: 0,
      uniqueClickers: 0,
      fromCard: 0,
      fromPreview: 0,
      fromOther: 0,
      visitors: {},
      lastClickedAt: 0
    };
  }
  const themeEntry = bucket.byTheme[tKey];
  if (categoryName && (!themeEntry.category || themeEntry.category === 'Konsultasi')) {
    themeEntry.category = categoryName;
  }
  themeEntry.totalClicks += 1;
  themeEntry.lastClickedAt = now;
  if (locationKey === 'theme-card') {
    themeEntry.fromCard += 1;
  } else if (locationKey === 'preview') {
    themeEntry.fromPreview += 1;
  } else {
    themeEntry.fromOther += 1;
  }
  themeEntry.visitors = themeEntry.visitors || {};
  const lastThemeClick = themeEntry.visitors[visitorId];
  if (typeof lastThemeClick !== 'number' || (now - lastThemeClick) >= WINDOW_30D_MS) {
    themeEntry.uniqueClickers += 1;
    themeEntry.visitors[visitorId] = now;
  }
}

export function recordWaClick(state, { page, visitorId, location, theme, category, now = Date.now() }) {
  const pageKey = normalizePageKey(page);
  const dateKey = getJakartaDateKey(now);
  state.updatedAt = now;

  const rawLoc = String(location || 'other').trim().toLowerCase().slice(0, 40) || 'other';
  const locationKey = LOCATION_LABELS[rawLoc] ? rawLoc : (rawLoc.replace(/[^a-z0-9_-]/g, '') || 'other');

  const rawTheme = String(theme || '').trim().slice(0, 120);
  const themeName = rawTheme || 'Konsultasi Umum (Tanpa Tema Spesifik)';

  let categoryName = String(category || '').trim().slice(0, 60);
  if (!categoryName) {
    if (themeName.startsWith('Add-on')) categoryName = 'Add-on';
    else if (!rawTheme) categoryName = 'Konsultasi Umum';
    else categoryName = 'Tema Undangan';
  }

  recordWaClickInBucket(state.pages[pageKey], visitorId, {
    locationKey,
    themeName,
    categoryName,
    now,
    dateKey
  });

  recordWaClickInBucket(state.pages.all, visitorId, {
    locationKey,
    themeName,
    categoryName,
    now,
    dateKey
  });

  state.recentClicks.unshift({
    timestamp: now,
    page: pageKey,
    pageLabel: PAGE_LABELS[pageKey],
    location: locationKey,
    locationLabel: LOCATION_LABELS[locationKey] || locationKey,
    theme: themeName,
    category: categoryName
  });
  if (state.recentClicks.length > 120) {
    state.recentClicks.length = 120;
  }

  return { page: pageKey, location: locationKey, theme: themeName };
}

function summarizeBucket(bucket, pageKey, recentClicks, now = Date.now()) {
  const todayKey = getJakartaDateKey(now);
  const visitorEntries = Object.values(bucket.visitors || {});

  let activeUnique30d = 0;
  let activeUnique7d = 0;
  for (const v of visitorEntries) {
    const lastCounted = Number(v?.lastCountedAt) || 0;
    const lastSeen = Number(v?.lastSeenAt) || lastCounted;
    if (now - lastCounted < WINDOW_30D_MS) activeUnique30d += 1;
    if (now - lastSeen < WINDOW_7D_MS) activeUnique7d += 1;
  }

  const uniqueToday = Number(bucket.daily?.[todayKey]?.uniqueVisitors) || 0;
  const viewsToday = Number(bucket.daily?.[todayKey]?.views) || 0;
  const waClicksToday = Number(bucket.daily?.[todayKey]?.waClicks) || 0;

  // Unique monthly visitors (strictly deduplicated for 30 days per visitor)
  const uniqueMonthly = Math.max(bucket.uniqueMonthlyTotal || 0, activeUnique30d);

  // Conversion rate: % of unique monthly visitors who clicked WA
  const conversionRate = uniqueMonthly > 0
    ? Number(((bucket.uniqueWaClickersTotal / uniqueMonthly) * 100).toFixed(1))
    : 0;

  // Locations sorted by totalClicks desc
  const locations = Object.values(bucket.byLocation || {})
    .map(item => ({
      location: item.location,
      label: LOCATION_LABELS[item.location] || item.label || item.location,
      totalClicks: item.totalClicks || 0,
      uniqueClickers: item.uniqueClickers || 0,
      lastClickedAt: item.lastClickedAt || 0
    }))
    .sort((a, b) => b.totalClicks - a.totalClicks || b.uniqueClickers - a.uniqueClickers);

  // Themes / Add-ons sorted by totalClicks desc
  const themes = Object.values(bucket.byTheme || {})
    .map(item => ({
      name: item.name,
      category: item.category || 'Tema Undangan',
      totalClicks: item.totalClicks || 0,
      uniqueClickers: item.uniqueClickers || 0,
      fromCard: item.fromCard || 0,
      fromPreview: item.fromPreview || 0,
      fromOther: item.fromOther || 0,
      lastClickedAt: item.lastClickedAt || 0
    }))
    .sort((a, b) => b.totalClicks - a.totalClicks || b.uniqueClickers - a.uniqueClickers);

  // Last 7 days daily breakdown
  const dailyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const dKey = getJakartaDateKey(now - i * 86400 * 1000);
    const dObj = bucket.daily?.[dKey];
    dailyTrend.push({
      date: dKey,
      uniqueVisitors: Number(dObj?.uniqueVisitors) || 0,
      views: Number(dObj?.views) || 0,
      waClicks: Number(dObj?.waClicks) || 0
    });
  }

  const filteredRecent = pageKey === 'all'
    ? recentClicks.slice(0, 50)
    : recentClicks.filter(c => c.page === pageKey).slice(0, 50);

  return {
    page: pageKey,
    label: PAGE_LABELS[pageKey] || pageKey,
    uniqueMonthly,
    activeUnique30d,
    unique7d: activeUnique7d,
    uniqueToday,
    totalPageviews: bucket.totalPageviews || 0,
    viewsToday,
    totalWaClicks: bucket.totalWaClicks || 0,
    uniqueWaClickers: bucket.uniqueWaClickersTotal || 0,
    waClicksToday,
    conversionRate,
    locations,
    themes,
    dailyTrend,
    recentClicks: filteredRecent
  };
}

export function buildAnalyticsSummary(state, now = Date.now()) {
  const safe = ensureAnalyticsState(state);
  return {
    updatedAt: safe.updatedAt,
    windowDays: 30,
    pages: {
      all: summarizeBucket(safe.pages.all, 'all', safe.recentClicks, now),
      home: summarizeBucket(safe.pages.home, 'home', safe.recentClicks, now),
      web: summarizeBucket(safe.pages.web, 'web', safe.recentClicks, now),
      tema: summarizeBucket(safe.pages.tema, 'tema', safe.recentClicks, now)
    }
  };
}

export async function loadAnalyticsFile(filePath) {
  try {
    const raw = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return ensureAnalyticsState(raw);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    const initial = createEmptyAnalyticsState();
    await fs.writeFile(filePath, JSON.stringify(initial, null, 2)).catch(() => {});
    return initial;
  }
}
