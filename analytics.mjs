import { createHash } from 'node:crypto';

export const PAGE_KEYS = ['home', 'web', 'tema'];

export const PAGE_LABELS = {
  all: 'Semua Halaman (Gabungan)',
  home: 'Halaman Utama (/)',
  web: 'Web Invitation (/web-invitation)',
  tema: 'Katalog Tema (/tema)'
};

export const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

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

export function jktDate(ts = Date.now()) {
  return new Date(ts + 7 * 3600000).toISOString().slice(0, 10);
}

export function jktMonth(ts = Date.now()) {
  return new Date(ts + 7 * 3600000).toISOString().slice(0, 7);
}

export function getPrevMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function formatMonthLabel(monthKey, isCurrent = false) {
  const [y, m] = monthKey.split('-').map(Number);
  const mName = INDO_MONTHS[(m || 1) - 1] || monthKey;
  const prefix = isCurrent ? 'Bulan Ini' : 'Bulan Lalu';
  return `${prefix} (${mName} ${y})`;
}

export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function emptyBucket() {
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

export function createEmptyMonthState() {
  return {
    all: emptyBucket(),
    home: emptyBucket(),
    web: emptyBucket(),
    tema: emptyBucket()
  };
}

export function createEmptyAnalyticsState(now = Date.now()) {
  const curr = jktMonth(now);
  const prev = getPrevMonthKey(curr);
  return {
    version: 2,
    updatedAt: now,
    months: {
      [curr]: createEmptyMonthState(),
      [prev]: createEmptyMonthState()
    },
    recentClicks: []
  };
}

export function purgeOldMonths(state, now = Date.now()) {
  const curr = jktMonth(now);
  const prev = getPrevMonthKey(curr);
  if (state.months) {
    for (const k of Object.keys(state.months)) {
      if (k !== curr && k !== prev) {
        delete state.months[k];
      }
    }
  }
  if (Array.isArray(state.recentClicks)) {
    state.recentClicks = state.recentClicks.filter(c => {
      const m = c.month || (c.timestamp ? jktMonth(c.timestamp) : '');
      return m === curr || m === prev;
    }).slice(0, 100);
  }
}

export function ensureMonth(state, monthKey) {
  state.months = state.months && typeof state.months === 'object' ? state.months : {};
  if (!state.months[monthKey]) {
    state.months[monthKey] = createEmptyMonthState();
  }
  return state.months[monthKey];
}

export function ensureBucket(b) {
  if (!b || typeof b !== 'object') return emptyBucket();
  return {
    uniqueMonthlyTotal: Number(b.uniqueMonthlyTotal) || 0,
    totalPageviews: Number(b.totalPageviews) || 0,
    totalWaClicks: Number(b.totalWaClicks) || 0,
    uniqueWaClickersTotal: Number(b.uniqueWaClickersTotal) || 0,
    visitors: b.visitors && typeof b.visitors === 'object' ? b.visitors : {},
    waClickVisitors: b.waClickVisitors && typeof b.waClickVisitors === 'object' ? b.waClickVisitors : {},
    byLocation: b.byLocation && typeof b.byLocation === 'object' ? b.byLocation : {},
    byTheme: b.byTheme && typeof b.byTheme === 'object' ? b.byTheme : {},
    daily: b.daily && typeof b.daily === 'object' ? b.daily : {}
  };
}

export function ensureAnalytics(raw) {
  const now = Date.now();
  const base = createEmptyAnalyticsState(now);
  if (!raw || typeof raw !== 'object') return base;
  base.updatedAt = Number(raw.updatedAt) || now;
  base.months = base.months && typeof base.months === 'object' ? base.months : {};
  const curr = jktMonth(base.updatedAt);
  if (raw.pages && !raw.months) {
    base.months[curr] = {
      all: ensureBucket(raw.pages.all),
      home: ensureBucket(raw.pages.home),
      web: ensureBucket(raw.pages.web),
      tema: ensureBucket(raw.pages.tema)
    };
  } else if (raw.months && typeof raw.months === 'object') {
    for (const [mKey, mVal] of Object.entries(raw.months)) {
      if (mVal && typeof mVal === 'object') {
        base.months[mKey] = {
          all: ensureBucket(mVal.all),
          home: ensureBucket(mVal.home),
          web: ensureBucket(mVal.web),
          tema: ensureBucket(mVal.tema)
        };
      }
    }
  }
  base.recentClicks = Array.isArray(raw.recentClicks) ? raw.recentClicks.slice(0, 100) : [];
  purgeOldMonths(base, now);
  return base;
}

export function normPage(p) {
  const s = String(p || '').trim().toLowerCase();
  if (s === 'web' || s.includes('web-invitation')) return 'web';
  if (s === 'tema' || s === '/tema' || s === '/tema/') return 'tema';
  return 'home';
}

export function resolveVisitorId(vid, ip = '', ua = '', salt = 'gs') {
  const c = String(vid || '').trim();
  if (/^[a-zA-Z0-9_-]{8,64}$/.test(c)) return 'v_' + c;
  return 'fp_' + createHash('sha256').update(`${ip}|${ua}|${salt}`).digest('hex').slice(0, 24);
}

export function visitBucket(b, vid, now, dKey) {
  b.totalPageviews += 1;
  if (!b.daily[dKey]) b.daily[dKey] = { views: 0, uniqueVisitors: 0, waClicks: 0, visitors: {} };
  const d = b.daily[dKey];
  d.views = (Number(d.views) || 0) + 1;
  d.visitors = d.visitors || {};
  if (!d.visitors[vid]) {
    d.visitors[vid] = now;
    d.uniqueVisitors = (Number(d.uniqueVisitors) || 0) + 1;
  }
  const ex = b.visitors[vid];
  if (!ex) {
    b.uniqueMonthlyTotal += 1;
    b.visitors[vid] = { firstSeenAt: now, lastSeenAt: now, totalViews: 1 };
    return true;
  }
  ex.lastSeenAt = now;
  ex.totalViews = (ex.totalViews || 0) + 1;
  return false;
}

export function recordVisit(state, { page, visitorId, now = Date.now() }) {
  purgeOldMonths(state, now);
  const curr = jktMonth(now);
  const m = ensureMonth(state, curr);
  const pk = normPage(page), dk = jktDate(now);
  state.updatedAt = now;
  const isNewOnPage = visitBucket(m[pk], visitorId, now, dk);
  const isNewGlobal = visitBucket(m.all, visitorId, now, dk);
  state.pages = m;
  return { page: pk, isNewOnPage, isNewGlobal };
}

export function clickBucket(b, vid, { locKey, themeName, catName, now, dKey }) {
  b.totalWaClicks += 1;
  if (!b.daily[dKey]) b.daily[dKey] = { views: 0, uniqueVisitors: 0, waClicks: 0, visitors: {} };
  b.daily[dKey].waClicks = (Number(b.daily[dKey].waClicks) || 0) + 1;
  const lastW = b.waClickVisitors[vid];
  if (!lastW) {
    b.uniqueWaClickersTotal += 1;
    b.waClickVisitors[vid] = now;
  }
  if (!b.byLocation[locKey]) {
    b.byLocation[locKey] = {
      location: locKey,
      label: LOCATION_LABELS[locKey] || locKey,
      totalClicks: 0,
      uniqueClickers: 0,
      visitors: {},
      lastClickedAt: 0
    };
  }
  const lc = b.byLocation[locKey];
  lc.totalClicks += 1;
  lc.lastClickedAt = now;
  lc.visitors = lc.visitors || {};
  if (!lc.visitors[vid]) {
    lc.uniqueClickers += 1;
    lc.visitors[vid] = now;
  }
  if (!b.byTheme[themeName]) {
    b.byTheme[themeName] = {
      name: themeName,
      category: catName,
      totalClicks: 0,
      uniqueClickers: 0,
      fromCard: 0,
      fromPreview: 0,
      fromOther: 0,
      visitors: {},
      lastClickedAt: 0
    };
  }
  const tc = b.byTheme[themeName];
  if (catName && (!tc.category || tc.category === 'Konsultasi Umum')) tc.category = catName;
  tc.totalClicks += 1;
  tc.lastClickedAt = now;
  if (locKey === 'theme-card') tc.fromCard += 1;
  else if (locKey === 'preview') tc.fromPreview += 1;
  else tc.fromOther += 1;
  tc.visitors = tc.visitors || {};
  if (!tc.visitors[vid]) {
    tc.uniqueClickers += 1;
    tc.visitors[vid] = now;
  }
}

export function recordWaClick(state, { page, visitorId, location, theme, category, now = Date.now() }) {
  purgeOldMonths(state, now);
  const curr = jktMonth(now);
  const m = ensureMonth(state, curr);
  const pk = normPage(page), dk = jktDate(now);
  state.updatedAt = now;
  const rawLoc = String(location || 'other').trim().toLowerCase().slice(0, 40) || 'other';
  const locKey = LOCATION_LABELS[rawLoc] ? rawLoc : (rawLoc.replace(/[^a-z0-9_-]/g, '') || 'other');
  const rawTheme = String(theme || '').trim().slice(0, 120);
  const themeName = rawTheme || 'Konsultasi Umum (Tanpa Tema Spesifik)';
  let catName = String(category || '').trim().slice(0, 60);
  if (!catName) catName = themeName.startsWith('Add-on') ? 'Add-on' : (!rawTheme ? 'Konsultasi Umum' : 'Tema Undangan');
  clickBucket(m[pk], visitorId, { locKey, themeName, catName, now, dKey: dk });
  clickBucket(m.all, visitorId, { locKey, themeName, catName, now, dKey: dk });
  state.pages = m;

  state.recentClicks.unshift({
    timestamp: now,
    month: curr,
    page: pk,
    pageLabel: PAGE_LABELS[pk],
    location: locKey,
    locationLabel: LOCATION_LABELS[locKey] || locKey,
    theme: themeName,
    category: catName
  });
  if (state.recentClicks.length > 100) state.recentClicks.length = 100;
  return { page: pk, location: locKey, theme: themeName };
}

export function sumBucket(b, pk, recents, monthKey, isCurrent, now = Date.now()) {
  const [y, m] = monthKey.split('-').map(Number);
  const maxDays = getDaysInMonth(y, m);
  const tKey = jktDate(now);
  const uniqueMonthly = b.uniqueMonthlyTotal || Object.keys(b.visitors || {}).length || 0;
  const uniqueWaClickers = b.uniqueWaClickersTotal || Object.keys(b.waClickVisitors || {}).length || 0;
  const uniqueToday = isCurrent ? (Number(b.daily?.[tKey]?.uniqueVisitors) || 0) : 0;
  const viewsToday = isCurrent ? (Number(b.daily?.[tKey]?.views) || 0) : 0;
  const waClicksToday = isCurrent ? (Number(b.daily?.[tKey]?.waClicks) || 0) : 0;
  const conversionRate = uniqueMonthly > 0 ? Number(((uniqueWaClickers / uniqueMonthly) * 100).toFixed(1)) : 0;

  const locations = Object.values(b.byLocation || {}).map(x => ({
    location: x.location,
    label: LOCATION_LABELS[x.location] || x.label || x.location,
    totalClicks: x.totalClicks || 0,
    uniqueClickers: x.uniqueClickers || 0,
    lastClickedAt: x.lastClickedAt || 0
  })).sort((a, c) => c.totalClicks - a.totalClicks);

  const themesList = Object.values(b.byTheme || {}).map(x => ({
    name: x.name,
    category: x.category || 'Tema Undangan',
    totalClicks: x.totalClicks || 0,
    uniqueClickers: x.uniqueClickers || 0,
    fromCard: x.fromCard || 0,
    fromPreview: x.fromPreview || 0,
    fromOther: x.fromOther || 0,
    lastClickedAt: x.lastClickedAt || 0
  })).sort((a, c) => c.totalClicks - a.totalClicks);

  // Full Month Days (Reverse Chronological: from today/end of month down to day 1)
  const currentDayNum = isCurrent ? Math.min(maxDays, new Date(now + 7 * 3600000).getDate()) : maxDays;
  const dailyTrend = [];
  for (let day = currentDayNum; day >= 1; day--) {
    const dk = `${monthKey}-${String(day).padStart(2, '0')}`;
    const d = b.daily?.[dk];
    const uVis = Number(d?.uniqueVisitors) || 0;
    const clicks = Number(d?.waClicks) || 0;
    dailyTrend.push({
      date: dk,
      uniqueVisitors: uVis,
      views: Number(d?.views) || 0,
      waClicks: clicks,
      conversionRate: uVis > 0 ? Number(((clicks / uVis) * 100).toFixed(1)) : 0
    });
  }

  const avgDailyVisitors = currentDayNum > 0 ? Math.round(uniqueMonthly / currentDayNum) : 0;
  const monthRecents = recents.filter(c => (c.month || jktMonth(c.timestamp)) === monthKey);
  const filteredRecents = pk === 'all' ? monthRecents : monthRecents.filter(c => c.page === pk);

  return {
    page: pk,
    label: PAGE_LABELS[pk] || pk,
    monthKey,
    isCurrent,
    daysInPeriod: currentDayNum,
    avgDailyVisitors,
    uniqueMonthly,
    uniqueToday,
    totalPageviews: b.totalPageviews || 0,
    viewsToday,
    totalWaClicks: b.totalWaClicks || 0,
    uniqueWaClickers,
    waClicksToday,
    conversionRate,
    locations,
    themes: themesList,
    dailyTrend,
    recentClicks: filteredRecents.slice(0, 50)
  };
}

export function buildAnalyticsSummary(state, now = Date.now()) {
  purgeOldMonths(state, now);
  const currMonth = jktMonth(now);
  const prevMonth = getPrevMonthKey(currMonth);
  ensureMonth(state, currMonth);
  ensureMonth(state, prevMonth);

  const monthsSummary = {};
  for (const mKey of [currMonth, prevMonth]) {
    const mData = state.months[mKey];
    const isCurr = (mKey === currMonth);
    monthsSummary[mKey] = {
      monthKey: mKey,
      label: formatMonthLabel(mKey, isCurr),
      isCurrent: isCurr,
      pages: {
        all: sumBucket(mData.all, 'all', state.recentClicks, mKey, isCurr, now),
        home: sumBucket(mData.home, 'home', state.recentClicks, mKey, isCurr, now),
        web: sumBucket(mData.web, 'web', state.recentClicks, mKey, isCurr, now),
        tema: sumBucket(mData.tema, 'tema', state.recentClicks, mKey, isCurr, now)
      }
    };
  }

  return {
    updatedAt: state.updatedAt || now,
    currentMonth: currMonth,
    prevMonth: prevMonth,
    availableMonths: [
      { key: currMonth, label: formatMonthLabel(currMonth, true), isCurrent: true },
      { key: prevMonth, label: formatMonthLabel(prevMonth, false), isCurrent: false }
    ],
    months: monthsSummary,
    pages: monthsSummary[currMonth].pages
  };
}
