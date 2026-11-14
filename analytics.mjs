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

export const HOUR_SLOTS = [
  { key: 'pagi', label: '🌅 Pagi Hari', hours: '06:00 – 10:59 WIB' },
  { key: 'siang', label: '☀️ Siang Hari', hours: '11:00 – 14:59 WIB' },
  { key: 'sore', label: '🌤️ Sore Hari', hours: '15:00 – 17:59 WIB' },
  { key: 'malam', label: '🌙 Malam (Prime Time)', hours: '18:00 – 21:59 WIB' },
  { key: 'larut', label: '🌌 Larut Malam / Dini Hari', hours: '22:00 – 05:59 WIB' }
];

export function jktDate(ts = Date.now()) {
  return new Date(ts + 7 * 3600000).toISOString().slice(0, 10);
}

export function jktMonth(ts = Date.now()) {
  return new Date(ts + 7 * 3600000).toISOString().slice(0, 7);
}

export function jktHourSlot(ts = Date.now()) {
  const h = new Date(ts + 7 * 3600000).getUTCHours();
  if (h >= 6 && h < 11) return 'pagi';
  if (h >= 11 && h < 15) return 'siang';
  if (h >= 15 && h < 18) return 'sore';
  if (h >= 18 && h < 22) return 'malam';
  return 'larut';
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

export function parseDeviceInfo(ua = '', hintModel = '', screen = '') {
  const u = String(ua || '');
  const modelHint = String(hintModel || '').trim().slice(0, 60);
  const scr = String(screen || '').trim();

  if (/iPad/i.test(u) || (/Macintosh/i.test(u) && /^(768|810|820|834|1024)x/.test(scr))) {
    const iosMatch = u.match(/OS (\d+[._]\d+)/i);
    const ver = iosMatch ? ` iOS ${iosMatch[1].replace('_', '.')}` : '';
    return { label: `📱 iPad (${ver.trim() || 'iPadOS'})`, osType: 'iOS' };
  }

  if (/iPhone|iPod/i.test(u)) {
    const iosMatch = u.match(/iPhone OS (\d+[._]\d+)/i);
    const ver = iosMatch ? `iOS ${iosMatch[1].replace('_', '.')}` : 'iOS';
    let series = 'iPhone';
    const [w, h] = scr.split('x').map(Number);
    const maxDim = Math.max(w || 0, h || 0);
    if (maxDim >= 926) series = 'iPhone Pro Max / Plus';
    else if (maxDim >= 844) series = 'iPhone / Pro (6.1")';
    else if (maxDim >= 812) series = 'iPhone X / 11 / Mini';
    else if (maxDim > 0 && maxDim <= 736) series = 'iPhone SE / Series Lama';
    return { label: `📱 ${series} (${ver})`, osType: 'iOS' };
  }

  if (/Android/i.test(u)) {
    let rawModel = modelHint;
    if (!rawModel) {
      const m = u.match(/Android\s+[\d.]+;\s*(?:[a-z]{2}-[a-z]{2};\s*)?([^;)]+?)(?:\s+Build\/|;\s*wv\)|\))/i);
      if (m && m[1]) {
        const cand = m[1].trim();
        if (cand && cand !== 'K' && !/^Linux|Android|Mobile|wv$/i.test(cand)) {
          rawModel = cand.slice(0, 50);
        }
      }
    }
    const cleanModel = rawModel.replace(/\s+/g, ' ').trim();
    const combined = `${u} ${cleanModel}`;

    if (/SM-|SAMSUNG|Galaxy/i.test(combined)) {
      let friendly = cleanModel || 'Galaxy';
      if (/^SM-S9/i.test(cleanModel)) friendly = `Galaxy S Series (${cleanModel})`;
      else if (/^SM-A/i.test(cleanModel)) friendly = `Galaxy A Series (${cleanModel})`;
      else if (/^SM-M/i.test(cleanModel)) friendly = `Galaxy M Series (${cleanModel})`;
      else if (/^SM-F/i.test(cleanModel)) friendly = `Galaxy Z Fold/Flip (${cleanModel})`;
      return { label: `📱 Samsung ${friendly}`, osType: 'Android' };
    }
    if (/Redmi|POCO|Xiaomi|\bMi\s|\b(21|22|23|24|25)\d{3}[A-Z0-9]+\b/i.test(combined)) {
      return { label: `📱 Xiaomi / Redmi${cleanModel ? ` (${cleanModel})` : ''}`, osType: 'Android' };
    }
    if (/OPPO|CPH\d{4}|PEXM|PGEM/i.test(combined)) {
      return { label: `📱 OPPO${cleanModel ? ` (${cleanModel})` : ''}`, osType: 'Android' };
    }
    if (/vivo|\bV2\d{3}[A-Z]*\b/i.test(combined)) {
      return { label: `📱 Vivo${cleanModel ? ` (${cleanModel})` : ''}`, osType: 'Android' };
    }
    if (/Realme|RMX\d{4}/i.test(combined)) {
      return { label: `📱 Realme${cleanModel ? ` (${cleanModel})` : ''}`, osType: 'Android' };
    }
    if (/Infinix/i.test(combined)) {
      return { label: `📱 Infinix${cleanModel ? ` (${cleanModel})` : ''}`, osType: 'Android' };
    }
    if (/TECNO/i.test(combined)) {
      return { label: `📱 Tecno${cleanModel ? ` (${cleanModel})` : ''}`, osType: 'Android' };
    }
    if (/Pixel/i.test(combined)) {
      return { label: `📱 Google Pixel${cleanModel ? ` (${cleanModel})` : ''}`, osType: 'Android' };
    }
    if (cleanModel) {
      return { label: `📱 Android (${cleanModel})`, osType: 'Android' };
    }
    const verMatch = u.match(/Android\s+(\d+)/i);
    return { label: `📱 HP Android${verMatch ? ` (v${verMatch[1]})` : ''}`, osType: 'Android' };
  }

  if (/Macintosh|Mac OS X/i.test(u)) {
    return { label: '💻 MacBook / Mac', osType: 'Desktop' };
  }
  if (/Windows NT/i.test(u)) {
    return { label: '💻 Laptop / PC Windows', osType: 'Desktop' };
  }
  if (/CrOS/i.test(u)) {
    return { label: '💻 Chromebook', osType: 'Desktop' };
  }
  if (/Linux/i.test(u)) {
    return { label: '💻 PC Linux', osType: 'Desktop' };
  }
  return { label: '📱 Perangkat Lainnya', osType: 'Lainnya' };
}

export function parseTrafficSource(ua = '', referrer = '', query = '') {
  const u = String(ua || '');
  const ref = String(referrer || '').toLowerCase();
  const q = String(query || '').toLowerCase();

  if (q.includes('fbclid') || /utm_source=(ig|fb|meta|instagram|facebook)[_-]?ads/i.test(q)) {
    if (/Instagram/i.test(u) || ref.includes('instagram')) return '📢 Iklan Instagram (Meta Ads)';
    return '📢 Iklan Facebook / Meta Ads';
  }
  if (q.includes('ttclid') || /utm_source=tiktok[_-]?ads/i.test(q)) {
    return '📢 Iklan TikTok Ads';
  }
  if (q.includes('gclid') || /utm_source=google[_-]?ads/i.test(q)) {
    return '📢 Iklan Google Ads';
  }
  if (/Instagram/i.test(u) || ref.includes('instagram.com') || q.includes('utm_source=instagram') || q.includes('utm_source=ig')) {
    return '📸 Instagram (Bio / Story)';
  }
  if (/Bytedance|musical_ly|TikTok/i.test(u) || ref.includes('tiktok.com') || q.includes('utm_source=tiktok')) {
    return '🎵 TikTok (Bio / Video)';
  }
  if (/WhatsApp/i.test(u) || ref.includes('whatsapp.com') || ref.includes('wa.me') || q.includes('utm_source=wa') || q.includes('utm_source=whatsapp')) {
    return '💬 WhatsApp (Share Link)';
  }
  if (/FBAN|FBAV|FB_IAB/i.test(u) || ref.includes('facebook.com') || ref.includes('fb.com')) {
    return '📘 Facebook';
  }
  if (ref.includes('google.')) {
    return '🔍 Pencarian Google';
  }
  if (ref.includes('bing.') || ref.includes('yahoo.') || ref.includes('duckduckgo.')) {
    return '🔍 Mesin Pencari Lain';
  }
  if (/Chrome/i.test(u) && !/Edg/i.test(u)) {
    return '🌐 Browser Chrome (Langsung)';
  }
  if (/Safari/i.test(u) && !/Chrome/i.test(u)) {
    return '🌐 Browser Safari (Langsung)';
  }
  return '🌐 Browser Langsung';
}

export function resolveTimezoneZone(tz = '') {
  const t = String(tz || '').toLowerCase();
  if (t.includes('makassar') || t.includes('pontianak') || t.includes('ujung_pandang') || t.includes('bali') || t.includes('singapore')) {
    return { zone: 'WITA', defaultRegion: 'Wilayah WITA (Bali / Kalimantan / Sulawesi)' };
  }
  if (t.includes('jayapura') || t.includes('amok') || t.includes('dili')) {
    return { zone: 'WIT', defaultRegion: 'Wilayah WIT (Maluku / Papua)' };
  }
  if (t.includes('jakarta') || t.includes('bangkok')) {
    return { zone: 'WIB', defaultRegion: 'Wilayah WIB (Jawa / Sumatera)' };
  }
  return { zone: 'WIB', defaultRegion: 'Indonesia (WIB)' };
}

export function formatRegionLabel({ city = '', region = '', tz = '' } = {}) {
  const tzInfo = resolveTimezoneZone(tz);
  const c = String(city || '').trim();
  const r = String(region || '').trim();
  if (c && r && c.toLowerCase() !== r.toLowerCase()) {
    return `${c}, ${r} (${tzInfo.zone})`;
  }
  if (c) {
    return `${c} (${tzInfo.zone})`;
  }
  if (r) {
    return `${r} (${tzInfo.zone})`;
  }
  return tzInfo.defaultRegion;
}

export function emptyBucket() {
  return {
    uniqueMonthlyTotal: 0,
    totalPageviews: 0,
    totalWaClicks: 0,
    uniqueWaClickersTotal: 0,
    totalPreviews: 0,
    uniquePreviewersTotal: 0,
    visitors: {},
    waClickVisitors: {},
    previewVisitors: {},
    byLocation: {},
    byTheme: {},
    byRegion: {},
    byDevice: {},
    bySource: {},
    byCategoryInterest: {},
    byHourSlot: {},
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
    version: 3,
    updatedAt: now,
    months: {
      [curr]: createEmptyMonthState(),
      [prev]: createEmptyMonthState()
    },
    ipGeoCache: {},
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
    totalPreviews: Number(b.totalPreviews) || 0,
    uniquePreviewersTotal: Number(b.uniquePreviewersTotal) || 0,
    visitors: b.visitors && typeof b.visitors === 'object' ? b.visitors : {},
    waClickVisitors: b.waClickVisitors && typeof b.waClickVisitors === 'object' ? b.waClickVisitors : {},
    previewVisitors: b.previewVisitors && typeof b.previewVisitors === 'object' ? b.previewVisitors : {},
    byLocation: b.byLocation && typeof b.byLocation === 'object' ? b.byLocation : {},
    byTheme: b.byTheme && typeof b.byTheme === 'object' ? b.byTheme : {},
    byRegion: b.byRegion && typeof b.byRegion === 'object' ? b.byRegion : {},
    byDevice: b.byDevice && typeof b.byDevice === 'object' ? b.byDevice : {},
    bySource: b.bySource && typeof b.bySource === 'object' ? b.bySource : {},
    byCategoryInterest: b.byCategoryInterest && typeof b.byCategoryInterest === 'object' ? b.byCategoryInterest : {},
    byHourSlot: b.byHourSlot && typeof b.byHourSlot === 'object' ? b.byHourSlot : {},
    daily: b.daily && typeof b.daily === 'object' ? b.daily : {}
  };
}

export function ensureAnalytics(raw) {
  const now = Date.now();
  const base = createEmptyAnalyticsState(now);
  if (!raw || typeof raw !== 'object') return base;
  base.updatedAt = Number(raw.updatedAt) || now;
  base.ipGeoCache = raw.ipGeoCache && typeof raw.ipGeoCache === 'object' ? raw.ipGeoCache : {};
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

function recordMetaVisit(b, vid, now, { regionLabel, deviceInfo, sourceLabel, hourSlot }) {
  if (regionLabel) {
    b.byRegion = b.byRegion || {};
    if (!b.byRegion[regionLabel]) {
      b.byRegion[regionLabel] = {
        region: regionLabel,
        uniqueVisitors: 0,
        totalViews: 0,
        uniqueWaClickers: 0,
        totalWaClicks: 0,
        visitors: {},
        waVisitors: {},
        lastSeenAt: 0
      };
    }
    const r = b.byRegion[regionLabel];
    r.totalViews += 1;
    r.lastSeenAt = now;
    r.visitors = r.visitors || {};
    if (!r.visitors[vid]) {
      r.visitors[vid] = now;
      r.uniqueVisitors += 1;
    }
  }

  if (deviceInfo && deviceInfo.label) {
    b.byDevice = b.byDevice || {};
    const dKey = deviceInfo.label;
    if (!b.byDevice[dKey]) {
      b.byDevice[dKey] = {
        device: dKey,
        osType: deviceInfo.osType || 'Lainnya',
        uniqueVisitors: 0,
        totalViews: 0,
        uniqueWaClickers: 0,
        totalWaClicks: 0,
        visitors: {},
        waVisitors: {},
        lastSeenAt: 0
      };
    }
    const dv = b.byDevice[dKey];
    dv.totalViews += 1;
    dv.lastSeenAt = now;
    dv.visitors = dv.visitors || {};
    if (!dv.visitors[vid]) {
      dv.visitors[vid] = now;
      dv.uniqueVisitors += 1;
    }
  }

  if (sourceLabel) {
    b.bySource = b.bySource || {};
    if (!b.bySource[sourceLabel]) {
      b.bySource[sourceLabel] = {
        source: sourceLabel,
        uniqueVisitors: 0,
        totalViews: 0,
        uniqueWaClickers: 0,
        totalWaClicks: 0,
        visitors: {},
        waVisitors: {},
        lastSeenAt: 0
      };
    }
    const sc = b.bySource[sourceLabel];
    sc.totalViews += 1;
    sc.lastSeenAt = now;
    sc.visitors = sc.visitors || {};
    if (!sc.visitors[vid]) {
      sc.visitors[vid] = now;
      sc.uniqueVisitors += 1;
    }
  }

  if (hourSlot) {
    b.byHourSlot = b.byHourSlot || {};
    if (!b.byHourSlot[hourSlot]) {
      b.byHourSlot[hourSlot] = { key: hourSlot, uniqueVisitors: 0, views: 0, waClicks: 0, visitors: {} };
    }
    const hs = b.byHourSlot[hourSlot];
    hs.views += 1;
    hs.visitors = hs.visitors || {};
    if (!hs.visitors[vid]) {
      hs.visitors[vid] = now;
      hs.uniqueVisitors += 1;
    }
  }
}

function recordMetaWaClick(b, vid, now, { regionLabel, deviceInfo, sourceLabel, hourSlot }) {
  if (regionLabel) {
    b.byRegion = b.byRegion || {};
    if (!b.byRegion[regionLabel]) {
      b.byRegion[regionLabel] = {
        region: regionLabel,
        uniqueVisitors: 1,
        totalViews: 1,
        uniqueWaClickers: 0,
        totalWaClicks: 0,
        visitors: { [vid]: now },
        waVisitors: {},
        lastSeenAt: now
      };
    }
    const r = b.byRegion[regionLabel];
    r.totalWaClicks = (Number(r.totalWaClicks) || 0) + 1;
    r.lastSeenAt = now;
    r.waVisitors = r.waVisitors || {};
    if (!r.waVisitors[vid]) {
      r.waVisitors[vid] = now;
      r.uniqueWaClickers = (Number(r.uniqueWaClickers) || 0) + 1;
    }
  }

  if (deviceInfo && deviceInfo.label) {
    b.byDevice = b.byDevice || {};
    const dKey = deviceInfo.label;
    if (!b.byDevice[dKey]) {
      b.byDevice[dKey] = {
        device: dKey,
        osType: deviceInfo.osType || 'Lainnya',
        uniqueVisitors: 1,
        totalViews: 1,
        uniqueWaClickers: 0,
        totalWaClicks: 0,
        visitors: { [vid]: now },
        waVisitors: {},
        lastSeenAt: now
      };
    }
    const dv = b.byDevice[dKey];
    dv.totalWaClicks = (Number(dv.totalWaClicks) || 0) + 1;
    dv.lastSeenAt = now;
    dv.waVisitors = dv.waVisitors || {};
    if (!dv.waVisitors[vid]) {
      dv.waVisitors[vid] = now;
      dv.uniqueWaClickers = (Number(dv.uniqueWaClickers) || 0) + 1;
    }
  }

  if (sourceLabel) {
    b.bySource = b.bySource || {};
    if (!b.bySource[sourceLabel]) {
      b.bySource[sourceLabel] = {
        source: sourceLabel,
        uniqueVisitors: 1,
        totalViews: 1,
        uniqueWaClickers: 0,
        totalWaClicks: 0,
        visitors: { [vid]: now },
        waVisitors: {},
        lastSeenAt: now
      };
    }
    const sc = b.bySource[sourceLabel];
    sc.totalWaClicks = (Number(sc.totalWaClicks) || 0) + 1;
    sc.lastSeenAt = now;
    sc.waVisitors = sc.waVisitors || {};
    if (!sc.waVisitors[vid]) {
      sc.waVisitors[vid] = now;
      sc.uniqueWaClickers = (Number(sc.uniqueWaClickers) || 0) + 1;
    }
  }

  if (hourSlot) {
    b.byHourSlot = b.byHourSlot || {};
    if (!b.byHourSlot[hourSlot]) {
      b.byHourSlot[hourSlot] = { key: hourSlot, uniqueVisitors: 1, views: 1, waClicks: 0, visitors: { [vid]: now } };
    }
    b.byHourSlot[hourSlot].waClicks = (Number(b.byHourSlot[hourSlot].waClicks) || 0) + 1;
  }
}

export function visitBucket(b, vid, now, dKey, meta = {}) {
  b.totalPageviews += 1;
  if (!b.daily[dKey]) b.daily[dKey] = { views: 0, uniqueVisitors: 0, waClicks: 0, previews: 0, visitors: {} };
  const d = b.daily[dKey];
  d.views = (Number(d.views) || 0) + 1;
  d.visitors = d.visitors || {};
  if (!d.visitors[vid]) {
    d.visitors[vid] = now;
    d.uniqueVisitors = (Number(d.uniqueVisitors) || 0) + 1;
  }
  recordMetaVisit(b, vid, now, meta);
  const ex = b.visitors[vid];
  if (!ex) {
    b.uniqueMonthlyTotal += 1;
    b.visitors[vid] = {
      firstSeenAt: now,
      lastSeenAt: now,
      totalViews: 1,
      region: meta.regionLabel || '',
      device: meta.deviceInfo?.label || '',
      source: meta.sourceLabel || ''
    };
    return true;
  }
  ex.lastSeenAt = now;
  ex.totalViews = (ex.totalViews || 0) + 1;
  if (meta.regionLabel) ex.region = meta.regionLabel;
  if (meta.deviceInfo?.label) ex.device = meta.deviceInfo.label;
  if (meta.sourceLabel) ex.source = meta.sourceLabel;
  return false;
}

export function recordVisit(state, { page, visitorId, ua = '', deviceModel = '', screen = '', ref = '', qs = '', tz = '', city = '', region = '', now = Date.now() }) {
  purgeOldMonths(state, now);
  const curr = jktMonth(now);
  const m = ensureMonth(state, curr);
  const pk = normPage(page), dk = jktDate(now);
  state.updatedAt = now;
  const regionLabel = formatRegionLabel({ city, region, tz });
  const deviceInfo = parseDeviceInfo(ua, deviceModel, screen);
  const sourceLabel = parseTrafficSource(ua, ref, qs);
  const hourSlot = jktHourSlot(now);
  const meta = { regionLabel, deviceInfo, sourceLabel, hourSlot };
  const isNewOnPage = visitBucket(m[pk], visitorId, now, dk, meta);
  const isNewGlobal = visitBucket(m.all, visitorId, now, dk, meta);
  state.pages = m;
  return { page: pk, isNewOnPage, isNewGlobal, region: regionLabel, device: deviceInfo.label, source: sourceLabel };
}

export function ensureThemeEntry(b, themeName, catName) {
  b.byTheme = b.byTheme || {};
  if (!b.byTheme[themeName]) {
    b.byTheme[themeName] = {
      name: themeName,
      category: catName || 'Tema Undangan',
      totalClicks: 0,
      uniqueClickers: 0,
      fromCard: 0,
      fromPreview: 0,
      fromOther: 0,
      previewCount: 0,
      uniquePreviewers: 0,
      previewWithPhoto: 0,
      previewNoPhoto: 0,
      visitors: {},
      previewVisitors: {},
      lastClickedAt: 0,
      lastPreviewedAt: 0
    };
  }
  const tc = b.byTheme[themeName];
  if (catName && (!tc.category || tc.category === 'Konsultasi Umum' || tc.category === 'Tema Undangan')) {
    tc.category = catName;
  }
  return tc;
}

export function clickBucket(b, vid, { locKey, themeName, catName, now, dKey, meta = {} }) {
  b.totalWaClicks += 1;
  if (!b.daily[dKey]) b.daily[dKey] = { views: 0, uniqueVisitors: 0, waClicks: 0, previews: 0, visitors: {} };
  b.daily[dKey].waClicks = (Number(b.daily[dKey].waClicks) || 0) + 1;
  const lastW = b.waClickVisitors[vid];
  if (!lastW) {
    b.uniqueWaClickersTotal += 1;
    b.waClickVisitors[vid] = now;
  }
  recordMetaWaClick(b, vid, now, meta);

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

  const tc = ensureThemeEntry(b, themeName, catName);
  tc.totalClicks = (Number(tc.totalClicks) || 0) + 1;
  tc.lastClickedAt = now;
  if (locKey === 'theme-card') tc.fromCard = (Number(tc.fromCard) || 0) + 1;
  else if (locKey === 'preview') tc.fromPreview = (Number(tc.fromPreview) || 0) + 1;
  else tc.fromOther = (Number(tc.fromOther) || 0) + 1;
  tc.visitors = tc.visitors || {};
  if (!tc.visitors[vid]) {
    tc.uniqueClickers = (Number(tc.uniqueClickers) || 0) + 1;
    tc.visitors[vid] = now;
  }
}

export function recordWaClick(state, { page, visitorId, location, theme, category, ua = '', deviceModel = '', screen = '', ref = '', qs = '', tz = '', city = '', region = '', now = Date.now() }) {
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

  const existingVisitor = m.all?.visitors?.[visitorId] || m[pk]?.visitors?.[visitorId] || {};
  const regionLabel = (city || region || tz) ? formatRegionLabel({ city, region, tz }) : (existingVisitor.region || formatRegionLabel({}));
  const deviceInfo = (ua || deviceModel) ? parseDeviceInfo(ua, deviceModel, screen) : { label: existingVisitor.device || '📱 HP / Perangkat', osType: 'Lainnya' };
  const sourceLabel = (ua || ref || qs) ? parseTrafficSource(ua, ref, qs) : (existingVisitor.source || '🌐 Browser Langsung');
  const hourSlot = jktHourSlot(now);
  const meta = { regionLabel, deviceInfo, sourceLabel, hourSlot };

  clickBucket(m[pk], visitorId, { locKey, themeName, catName, now, dKey: dk, meta });
  clickBucket(m.all, visitorId, { locKey, themeName, catName, now, dKey: dk, meta });
  state.pages = m;

  state.recentClicks.unshift({
    timestamp: now,
    month: curr,
    page: pk,
    pageLabel: PAGE_LABELS[pk],
    location: locKey,
    locationLabel: LOCATION_LABELS[locKey] || locKey,
    theme: themeName,
    category: catName,
    region: regionLabel,
    device: deviceInfo.label,
    source: sourceLabel
  });
  if (state.recentClicks.length > 100) state.recentClicks.length = 100;
  return { page: pk, location: locKey, theme: themeName, region: regionLabel, device: deviceInfo.label, source: sourceLabel };
}

function previewInBucket(b, vid, { themeName, catName, variant, now, dKey }) {
  b.totalPreviews = (Number(b.totalPreviews) || 0) + 1;
  b.previewVisitors = b.previewVisitors || {};
  if (!b.previewVisitors[vid]) {
    b.previewVisitors[vid] = now;
    b.uniquePreviewersTotal = (Number(b.uniquePreviewersTotal) || 0) + 1;
  }
  if (!b.daily[dKey]) b.daily[dKey] = { views: 0, uniqueVisitors: 0, waClicks: 0, previews: 0, visitors: {} };
  b.daily[dKey].previews = (Number(b.daily[dKey].previews) || 0) + 1;

  const tc = ensureThemeEntry(b, themeName, catName);
  tc.previewCount = (Number(tc.previewCount) || 0) + 1;
  tc.lastPreviewedAt = now;
  if (variant === 'photo') tc.previewWithPhoto = (Number(tc.previewWithPhoto) || 0) + 1;
  else tc.previewNoPhoto = (Number(tc.previewNoPhoto) || 0) + 1;
  tc.previewVisitors = tc.previewVisitors || {};
  if (!tc.previewVisitors[vid]) {
    tc.previewVisitors[vid] = now;
    tc.uniquePreviewers = (Number(tc.uniquePreviewers) || 0) + 1;
  }
}

export function recordThemePreview(state, { page, visitorId, theme, category, variant = 'no_photo', now = Date.now() }) {
  purgeOldMonths(state, now);
  const curr = jktMonth(now);
  const m = ensureMonth(state, curr);
  const pk = normPage(page), dk = jktDate(now);
  state.updatedAt = now;
  const themeName = String(theme || '').trim().slice(0, 120);
  if (!themeName) return { ok: false };
  const catName = String(category || 'Tema Undangan').trim().slice(0, 60);
  const normVar = variant === 'photo' || variant === 'Dengan Foto' ? 'photo' : 'no_photo';
  previewInBucket(m[pk], visitorId, { themeName, catName, variant: normVar, now, dKey: dk });
  previewInBucket(m.all, visitorId, { themeName, catName, variant: normVar, now, dKey: dk });
  state.pages = m;
  return { page: pk, theme: themeName, variant: normVar };
}

function categoryInBucket(b, vid, { categoryName, now }) {
  b.byCategoryInterest = b.byCategoryInterest || {};
  if (!b.byCategoryInterest[categoryName]) {
    b.byCategoryInterest[categoryName] = {
      category: categoryName,
      totalClicks: 0,
      uniqueUsers: 0,
      visitors: {},
      lastClickedAt: 0
    };
  }
  const ci = b.byCategoryInterest[categoryName];
  ci.totalClicks += 1;
  ci.lastClickedAt = now;
  ci.visitors = ci.visitors || {};
  if (!ci.visitors[vid]) {
    ci.visitors[vid] = now;
    ci.uniqueUsers += 1;
  }
}

export function recordCategoryInterest(state, { page, visitorId, category, now = Date.now() }) {
  purgeOldMonths(state, now);
  const curr = jktMonth(now);
  const m = ensureMonth(state, curr);
  const pk = normPage(page);
  state.updatedAt = now;
  const catName = String(category || '').trim().slice(0, 80);
  if (!catName) return { ok: false };
  categoryInBucket(m[pk], visitorId, { categoryName: catName, now });
  categoryInBucket(m.all, visitorId, { categoryName: catName, now });
  state.pages = m;
  return { page: pk, category: catName };
}

export function sumBucket(b, pk, recents, monthKey, isCurrent, now = Date.now()) {
  const [y, m] = monthKey.split('-').map(Number);
  const maxDays = getDaysInMonth(y, m);
  const tKey = jktDate(now);
  const uniqueMonthly = b.uniqueMonthlyTotal || Object.keys(b.visitors || {}).length || 0;
  const uniqueWaClickers = b.uniqueWaClickersTotal || Object.keys(b.waClickVisitors || {}).length || 0;
  const totalPreviews = Number(b.totalPreviews) || 0;
  const uniquePreviewers = Number(b.uniquePreviewersTotal) || Object.keys(b.previewVisitors || {}).length || 0;
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

  const themesList = Object.values(b.byTheme || {}).map(x => {
    const tClicks = Number(x.totalClicks) || 0;
    const uClickers = Number(x.uniqueClickers) || 0;
    const pCount = Number(x.previewCount) || 0;
    const uPrev = Number(x.uniquePreviewers) || 0;
    const pPhoto = Number(x.previewWithPhoto) || 0;
    const pNoPhoto = Number(x.previewNoPhoto) || 0;
    const previewToWaRate = uPrev > 0 ? Math.min(100, Number(((uClickers / uPrev) * 100).toFixed(1))) : (uClickers > 0 ? 100 : 0);

    let insight = '📊 Mulai Dilihat';
    if (x.category === 'Konsultasi Umum' || x.category === 'Add-on') {
      insight = tClicks >= 3 ? '💬 Banyak Ditanyakan' : '✅ Aktif';
    } else if (uClickers >= 2 && (uPrev === 0 || (uClickers / Math.max(1, uPrev)) >= 0.3)) {
      insight = '🔥 Konversi Tinggi (Potensi Bestseller)';
    } else if (uClickers >= 1) {
      insight = '✅ Diminati (Menghasilkan Chat)';
    } else if (pCount >= 3 && tClicks === 0) {
      insight = '👀 Banyak Di-preview, Belum Chat WA';
    }

    return {
      name: x.name,
      category: x.category || 'Tema Undangan',
      totalClicks: tClicks,
      uniqueClickers: uClickers,
      fromCard: x.fromCard || 0,
      fromPreview: x.fromPreview || 0,
      fromOther: x.fromOther || 0,
      previewCount: pCount,
      uniquePreviewers: uPrev,
      previewWithPhoto: pPhoto,
      previewNoPhoto: pNoPhoto,
      previewToWaRate,
      insight,
      lastClickedAt: x.lastClickedAt || x.lastPreviewedAt || 0
    };
  }).sort((a, c) => (c.totalClicks - a.totalClicks) || (c.previewCount - a.previewCount));

  const regions = Object.values(b.byRegion || {}).map(x => {
    const uVis = Number(x.uniqueVisitors) || 0;
    const uWa = Number(x.uniqueWaClickers) || 0;
    return {
      region: x.region,
      uniqueVisitors: uVis,
      totalViews: Number(x.totalViews) || 0,
      uniqueWaClickers: uWa,
      totalWaClicks: Number(x.totalWaClicks) || 0,
      conversionRate: uVis > 0 ? Number(((uWa / uVis) * 100).toFixed(1)) : 0,
      lastSeenAt: x.lastSeenAt || 0
    };
  }).sort((a, c) => (c.uniqueVisitors - a.uniqueVisitors) || (c.totalWaClicks - a.totalWaClicks));

  const devices = Object.values(b.byDevice || {}).map(x => {
    const uVis = Number(x.uniqueVisitors) || 0;
    const uWa = Number(x.uniqueWaClickers) || 0;
    return {
      device: x.device,
      osType: x.osType || 'Lainnya',
      uniqueVisitors: uVis,
      totalViews: Number(x.totalViews) || 0,
      uniqueWaClickers: uWa,
      totalWaClicks: Number(x.totalWaClicks) || 0,
      conversionRate: uVis > 0 ? Number(((uWa / uVis) * 100).toFixed(1)) : 0,
      lastSeenAt: x.lastSeenAt || 0
    };
  }).sort((a, c) => (c.uniqueVisitors - a.uniqueVisitors) || (c.totalWaClicks - a.totalWaClicks));

  const sources = Object.values(b.bySource || {}).map(x => {
    const uVis = Number(x.uniqueVisitors) || 0;
    const uWa = Number(x.uniqueWaClickers) || 0;
    return {
      source: x.source,
      uniqueVisitors: uVis,
      totalViews: Number(x.totalViews) || 0,
      uniqueWaClickers: uWa,
      totalWaClicks: Number(x.totalWaClicks) || 0,
      conversionRate: uVis > 0 ? Number(((uWa / uVis) * 100).toFixed(1)) : 0,
      lastSeenAt: x.lastSeenAt || 0
    };
  }).sort((a, c) => (c.uniqueVisitors - a.uniqueVisitors) || (c.totalWaClicks - a.totalWaClicks));

  const categoryInterests = Object.values(b.byCategoryInterest || {}).map(x => ({
    category: x.category,
    uniqueUsers: Number(x.uniqueUsers) || 0,
    totalClicks: Number(x.totalClicks) || 0,
    lastClickedAt: x.lastClickedAt || 0
  })).sort((a, c) => c.totalClicks - a.totalClicks);

  const hourSlots = HOUR_SLOTS.map(slot => {
    const hs = b.byHourSlot?.[slot.key] || {};
    const uVis = Number(hs.uniqueVisitors) || 0;
    const wa = Number(hs.waClicks) || 0;
    return {
      key: slot.key,
      label: slot.label,
      hours: slot.hours,
      uniqueVisitors: uVis,
      views: Number(hs.views) || 0,
      waClicks: wa
    };
  });

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
      previews: Number(d?.previews) || 0,
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
    totalPreviews,
    uniquePreviewers,
    totalWaClicks: b.totalWaClicks || 0,
    uniqueWaClickers,
    waClicksToday,
    conversionRate,
    locations,
    themes: themesList,
    regions,
    devices,
    sources,
    categoryInterests,
    hourSlots,
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
