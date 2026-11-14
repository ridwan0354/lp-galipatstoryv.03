import {renderPreview,supportsPreview} from './preview.mjs';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const publicDir=path.join(root,'public');
const db=path.join(root,'data/themes.json');
await fs.mkdir(path.join(publicDir,'uploads'),{recursive:true});
const secretPath=path.join(root,'data/admin-secret.json');
let auth;
try{auth=JSON.parse(await fs.readFile(secretPath,'utf8'));if(!auth.version||auth.version<2){const password='IniBulanAgustus2026';const salt=randomBytes(16).toString('hex');auth={version:2,salt,hash:scryptSync(password,salt,64).toString('hex')};await fs.writeFile(secretPath,JSON.stringify(auth),{mode:0o600});}}catch(e){if(e.code!=='ENOENT')throw e;const password='IniBulanAgustus2026';const salt=randomBytes(16).toString('hex');auth={version:2,salt,hash:scryptSync(password,salt,64).toString('hex')};await fs.writeFile(secretPath,JSON.stringify(auth),{mode:0o600});await fs.writeFile(path.join(root,'AKSES-ADMIN.txt'),`Halaman admin: /kamu\nNama pengguna: admin\nKata sandi awal: ${password}\n\nSimpan informasi ini secara pribadi. Ganti password melalui halaman admin.\n`,{mode:0o600});}
let themes=JSON.parse(await fs.readFile(db,'utf8'));let queue=Promise.resolve();
function mutate(fn){const job=queue.then(async()=>{const next=fn(themes);await fs.writeFile(db+'.tmp',JSON.stringify(next,null,2));await fs.rename(db+'.tmp',db);themes=next;});queue=job.catch(()=>{});return job;}
const catDb=path.join(root,'data/categories.json');
const defaultCats=[
  {id:'eksklusif',name:'Eksklusif',note:'Tanpa foto Rp99.000 · Dengan foto Rp149.000. Desain tidak dapat digabung atau diganti warna.'},
  {id:'premium',name:'Premium',note:'Tanpa foto Rp99.000 · Dengan foto Rp129.000. Penyesuaian warna tercatat untuk PR#20–PR#28.'},
  {id:'adat',name:'Adat',note:''},
  {id:'animasi',name:'Animasi',note:''},
  {id:'movement',name:'Movement',note:''},
  {id:'klasik',name:'Klasik',note:''},
  {id:'floral',name:'Floral',note:''},
  {id:'syukuran',name:'Syukuran',note:''},
  {id:'tema-v02',name:'Tema V.02',note:'Tanpa foto Rp79.000 · Dengan foto Rp109.000. Tema tidak dapat di mix atau ganti warna. Free barcode.'}
];
let categories=[];
try{categories=JSON.parse(await fs.readFile(catDb,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;categories=[...defaultCats];await fs.writeFile(catDb,JSON.stringify(categories,null,2)).catch(()=>{});}
function mutateCategories(fn){const job=queue.then(async()=>{const next=fn(categories);await fs.writeFile(catDb+'.tmp',JSON.stringify(next,null,2));await fs.rename(catDb+'.tmp',catDb);categories=next;});queue=job.catch(()=>{});return job;}
const settingsDb=path.join(root,'data/settings.json');
let settings={previewMode:'new_tab'};
try{settings={...settings,...JSON.parse(await fs.readFile(settingsDb,'utf8'))};}catch(e){if(e.code!=='ENOENT')throw e;await fs.writeFile(settingsDb,JSON.stringify(settings,null,2)).catch(()=>{});}
function mutateSettings(fn){const job=queue.then(async()=>{const next=fn(settings);await fs.writeFile(settingsDb+'.tmp',JSON.stringify(next,null,2));await fs.rename(settingsDb+'.tmp',settingsDb);settings=next;});queue=job.catch(()=>{});return job;}
const analyticsDb=path.join(root,'data/analytics.json');
const INDO_MONTHS=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const PAGE_LABELS={all:'Semua Halaman (Gabungan)',home:'Halaman Utama (/)',web:'Web Invitation (/web-invitation)',tema:'Katalog Tema (/tema)'};
const LOCATION_LABELS={'theme-card':'Kartu Tema di Katalog ("Pilih tema ini")',preview:'Pop-up Preview Tema ("Pilih tema ini via WA")',nav:'Tombol Navigasi Atas ("Tanya admin")',hero:'Tombol Hero Atas ("Konsultasi dulu")','mobile-bar':'Bar Melayang Bawah HP ("Konsultasi WhatsApp")','catalog-help':'Banner Bantuan Katalog ("Bantu pilih tema")',faq:'Bagian Tanya Jawab / FAQ ("Tanyakan ke admin")',closing:'Bagian Penutup Bawah ("Cerita dulu ke admin")','addon-priority':'Add-on: Proses Prioritas (+50K)','addon-video':'Add-on: Web to Video (+30K)','addon-link':'Add-on: Link Custom URL (+50K)','addon-theme':'Add-on: Ganti Tema (+30K)','addon-lang':'Add-on: Ganti Bahasa (+20K)','addon-guestbook':'Add-on: Barcode Buku Tamu (499K)',other:'Tombol WhatsApp Lainnya'};
const HOUR_SLOTS=[{key:'pagi',label:'🌅 Pagi Hari',hours:'06:00 – 10:59 WIB'},{key:'siang',label:'☀️ Siang Hari',hours:'11:00 – 14:59 WIB'},{key:'sore',label:'🌤️ Sore Hari',hours:'15:00 – 17:59 WIB'},{key:'malam',label:'🌙 Malam (Prime Time)',hours:'18:00 – 21:59 WIB'},{key:'larut',label:'🌌 Larut Malam / Dini Hari',hours:'22:00 – 05:59 WIB'}];
function jktDate(ts=Date.now()){return new Date(ts+7*3600000).toISOString().slice(0,10);}
function jktMonth(ts=Date.now()){return new Date(ts+7*3600000).toISOString().slice(0,7);}
function jktHourSlot(ts=Date.now()){const h=new Date(ts+7*3600000).getUTCHours();if(h>=6&&h<11)return 'pagi';if(h>=11&&h<15)return 'siang';if(h>=15&&h<18)return 'sore';if(h>=18&&h<22)return 'malam';return 'larut';}
function getPrevMonthKey(mKey){const [y,m]=mKey.split('-').map(Number);if(m===1)return `${y-1}-12`;return `${y}-${String(m-1).padStart(2,'0')}`;}
function formatMonthLabel(mKey,isCurr=false){const [y,m]=mKey.split('-').map(Number);const mName=INDO_MONTHS[(m||1)-1]||mKey;return `${isCurr?'Bulan Ini':'Bulan Lalu'} (${mName} ${y})`;}
function getDaysInMonth(year,month){return new Date(year,month,0).getDate();}
function parseDeviceInfo(ua='',hintModel='',screen=''){
  const u=String(ua||''),modelHint=String(hintModel||'').trim().slice(0,60),scr=String(screen||'').trim();
  if(/iPad/i.test(u)||(/Macintosh/i.test(u)&&/^(768|810|820|834|1024)x/.test(scr))){const m=u.match(/OS (\d+[._]\d+)/i);return{label:`📱 iPad (${m?`iOS ${m[1].replace('_','.')}`:'iPadOS'})`,osType:'iOS'};}
  if(/iPhone|iPod/i.test(u)){const m=u.match(/iPhone OS (\d+[._]\d+)/i);const ver=m?`iOS ${m[1].replace('_','.')}`:'iOS';let series='iPhone';const [w,h]=scr.split('x').map(Number);const maxDim=Math.max(w||0,h||0);if(maxDim>=926)series='iPhone Pro Max / Plus';else if(maxDim>=844)series='iPhone / Pro (6.1")';else if(maxDim>=812)series='iPhone X / 11 / Mini';else if(maxDim>0&&maxDim<=736)series='iPhone SE / Series Lama';return{label:`📱 ${series} (${ver})`,osType:'iOS'};}
  if(/Android/i.test(u)){
    let rawModel=modelHint;
    if(!rawModel){const m=u.match(/Android\s+[\d.]+;\s*(?:[a-z]{2}-[a-z]{2};\s*)?([^;)]+?)(?:\s+Build\/|;\s*wv\)|\))/i);if(m&&m[1]){const c=m[1].trim();if(c&&c!=='K'&&!/^Linux|Android|Mobile|wv$/i.test(c))rawModel=c.slice(0,50);}}
    const cleanModel=rawModel.replace(/\s+/g,' ').trim(),comb=`${u} ${cleanModel}`;
    if(/SM-|SAMSUNG|Galaxy/i.test(comb)){let f=cleanModel||'Galaxy';if(/^SM-S9/i.test(cleanModel))f=`Galaxy S Series (${cleanModel})`;else if(/^SM-A/i.test(cleanModel))f=`Galaxy A Series (${cleanModel})`;else if(/^SM-M/i.test(cleanModel))f=`Galaxy M Series (${cleanModel})`;else if(/^SM-F/i.test(cleanModel))f=`Galaxy Z Fold/Flip (${cleanModel})`;return{label:`📱 Samsung ${f}`,osType:'Android'};}
    if(/Redmi|POCO|Xiaomi|\bMi\s|\b(21|22|23|24|25)\d{3}[A-Z0-9]+\b/i.test(comb))return{label:`📱 Xiaomi / Redmi${cleanModel?` (${cleanModel})`:''}`,osType:'Android'};
    if(/OPPO|CPH\d{4}|PEXM|PGEM/i.test(comb))return{label:`📱 OPPO${cleanModel?` (${cleanModel})`:''}`,osType:'Android'};
    if(/vivo|\bV2\d{3}[A-Z]*\b/i.test(comb))return{label:`📱 Vivo${cleanModel?` (${cleanModel})`:''}`,osType:'Android'};
    if(/Realme|RMX\d{4}/i.test(comb))return{label:`📱 Realme${cleanModel?` (${cleanModel})`:''}`,osType:'Android'};
    if(/Infinix/i.test(comb))return{label:`📱 Infinix${cleanModel?` (${cleanModel})`:''}`,osType:'Android'};
    if(/TECNO/i.test(comb))return{label:`📱 Tecno${cleanModel?` (${cleanModel})`:''}`,osType:'Android'};
    if(/Pixel/i.test(comb))return{label:`📱 Google Pixel${cleanModel?` (${cleanModel})`:''}`,osType:'Android'};
    if(cleanModel)return{label:`📱 Android (${cleanModel})`,osType:'Android'};
    const vm=u.match(/Android\s+(\d+)/i);return{label:`📱 HP Android${vm?` (v${vm[1]})`:''}`,osType:'Android'};
  }
  if(/Macintosh|Mac OS X/i.test(u))return{label:'💻 MacBook / Mac',osType:'Desktop'};
  if(/Windows NT/i.test(u))return{label:'💻 Laptop / PC Windows',osType:'Desktop'};
  if(/CrOS/i.test(u))return{label:'💻 Chromebook',osType:'Desktop'};
  if(/Linux/i.test(u))return{label:'💻 PC Linux',osType:'Desktop'};
  return{label:'📱 Perangkat Lainnya',osType:'Lainnya'};
}
function parseTrafficSource(ua='',referrer='',query=''){
  const u=String(ua||''),ref=String(referrer||'').toLowerCase(),q=String(query||'').toLowerCase();
  if(q.includes('fbclid')||/utm_source=(ig|fb|meta|instagram|facebook)[_-]?ads/i.test(q))return(/Instagram/i.test(u)||ref.includes('instagram'))?'📢 Iklan Instagram (Meta Ads)':'📢 Iklan Facebook / Meta Ads';
  if(q.includes('ttclid')||/utm_source=tiktok[_-]?ads/i.test(q))return '📢 Iklan TikTok Ads';
  if(q.includes('gclid')||/utm_source=google[_-]?ads/i.test(q))return '📢 Iklan Google Ads';
  if(/Instagram/i.test(u)||ref.includes('instagram.com')||q.includes('utm_source=instagram')||q.includes('utm_source=ig'))return '📸 Instagram (Bio / Story)';
  if(/Bytedance|musical_ly|TikTok/i.test(u)||ref.includes('tiktok.com')||q.includes('utm_source=tiktok'))return '🎵 TikTok (Bio / Video)';
  if(/WhatsApp/i.test(u)||ref.includes('whatsapp.com')||ref.includes('wa.me')||q.includes('utm_source=wa')||q.includes('utm_source=whatsapp'))return '💬 WhatsApp (Share Link)';
  if(/FBAN|FBAV|FB_IAB/i.test(u)||ref.includes('facebook.com')||ref.includes('fb.com'))return '📘 Facebook';
  if(ref.includes('google.'))return '🔍 Pencarian Google';
  if(ref.includes('bing.')||ref.includes('yahoo.')||ref.includes('duckduckgo.'))return '🔍 Mesin Pencari Lain';
  if(/Chrome/i.test(u)&&!/Edg/i.test(u))return '🌐 Browser Chrome (Langsung)';
  if(/Safari/i.test(u)&&!/Chrome/i.test(u))return '🌐 Browser Safari (Langsung)';
  return '🌐 Browser Langsung';
}
function resolveTimezoneZone(tz=''){
  const t=String(tz||'').toLowerCase();
  if(t.includes('makassar')||t.includes('pontianak')||t.includes('ujung_pandang')||t.includes('bali')||t.includes('singapore'))return{zone:'WITA',defaultRegion:'Wilayah WITA (Bali / Kalimantan / Sulawesi)'};
  if(t.includes('jayapura')||t.includes('dili'))return{zone:'WIT',defaultRegion:'Wilayah WIT (Maluku / Papua)'};
  if(t.includes('jakarta')||t.includes('bangkok'))return{zone:'WIB',defaultRegion:'Wilayah WIB (Jawa / Sumatera)'};
  return{zone:'WIB',defaultRegion:'Indonesia (WIB)'};
}
function formatRegionLabel({city='',region='',tz=''}={}){
  const tzInfo=resolveTimezoneZone(tz),c=String(city||'').trim(),r=String(region||'').trim();
  if(c&&r&&c.toLowerCase()!==r.toLowerCase())return `${c}, ${r} (${tzInfo.zone})`;
  if(c)return `${c} (${tzInfo.zone})`;
  if(r)return `${r} (${tzInfo.zone})`;
  return tzInfo.defaultRegion;
}
function isPublicIp(ip=''){
  const s=String(ip||'').replace(/^::ffff:/i,'').trim();
  if(!s||s==='127.0.0.1'||s==='::1'||s==='localhost')return false;
  if(/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^169\.254\.|^fc00:|^fe80:/i.test(s))return false;
  return true;
}
async function lookupPublicIpGeo(ip,cache={}){
  const clean=String(ip||'').replace(/^::ffff:/i,'').trim();
  if(!isPublicIp(clean))return null;
  if(cache[clean])return cache[clean];
  try{
    const r=await fetch(`http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,regionName,city`,{signal:AbortSignal.timeout(1200)});
    if(r.ok){
      const j=await r.json();
      if(j&&j.status==='success'&&(j.city||j.regionName)){
        const info={city:String(j.city||'').trim(),region:String(j.regionName||'').trim(),ts:Date.now()};
        cache[clean]=info;
        return info;
      }
    }
  }catch{}
  return null;
}
function emptyBucket(){return{uniqueMonthlyTotal:0,totalPageviews:0,totalWaClicks:0,uniqueWaClickersTotal:0,totalPreviews:0,uniquePreviewersTotal:0,visitors:{},waClickVisitors:{},previewVisitors:{},byLocation:{},byTheme:{},byRegion:{},byDevice:{},bySource:{},byCategoryInterest:{},byHourSlot:{},daily:{}};}
function createEmptyMonthState(){return{all:emptyBucket(),home:emptyBucket(),web:emptyBucket(),tema:emptyBucket()};}
function createEmptyAnalyticsState(now=Date.now()){const curr=jktMonth(now),prev=getPrevMonthKey(curr);return{version:3,updatedAt:now,months:{[curr]:createEmptyMonthState(),[prev]:createEmptyMonthState()},ipGeoCache:{},recentClicks:[]};}
function purgeOldMonths(state,now=Date.now()){const curr=jktMonth(now),prev=getPrevMonthKey(curr);if(state.months){for(const k of Object.keys(state.months)){if(k!==curr&&k!==prev)delete state.months[k];}}if(Array.isArray(state.recentClicks)){state.recentClicks=state.recentClicks.filter(c=>{const m=c.month||(c.timestamp?jktMonth(c.timestamp):'');return m===curr||m===prev;}).slice(0,100);}}
function ensureMonth(state,mKey){state.months=state.months&&typeof state.months==='object'?state.months:{};if(!state.months[mKey])state.months[mKey]=createEmptyMonthState();return state.months[mKey];}
function ensureBucket(b){if(!b||typeof b!=='object')return emptyBucket();return{uniqueMonthlyTotal:Number(b.uniqueMonthlyTotal)||0,totalPageviews:Number(b.totalPageviews)||0,totalWaClicks:Number(b.totalWaClicks)||0,uniqueWaClickersTotal:Number(b.uniqueWaClickersTotal)||0,totalPreviews:Number(b.totalPreviews)||0,uniquePreviewersTotal:Number(b.uniquePreviewersTotal)||0,visitors:b.visitors&&typeof b.visitors==='object'?b.visitors:{},waClickVisitors:b.waClickVisitors&&typeof b.waClickVisitors==='object'?b.waClickVisitors:{},previewVisitors:b.previewVisitors&&typeof b.previewVisitors==='object'?b.previewVisitors:{},byLocation:b.byLocation&&typeof b.byLocation==='object'?b.byLocation:{},byTheme:b.byTheme&&typeof b.byTheme==='object'?b.byTheme:{},byRegion:b.byRegion&&typeof b.byRegion==='object'?b.byRegion:{},byDevice:b.byDevice&&typeof b.byDevice==='object'?b.byDevice:{},bySource:b.bySource&&typeof b.bySource==='object'?b.bySource:{},byCategoryInterest:b.byCategoryInterest&&typeof b.byCategoryInterest==='object'?b.byCategoryInterest:{},byHourSlot:b.byHourSlot&&typeof b.byHourSlot==='object'?b.byHourSlot:{},daily:b.daily&&typeof b.daily==='object'?b.daily:{}};}
function ensureAnalytics(raw){const now=Date.now(),base=createEmptyAnalyticsState(now);if(!raw||typeof raw!=='object')return base;base.updatedAt=Number(raw.updatedAt)||now;base.ipGeoCache=raw.ipGeoCache&&typeof raw.ipGeoCache==='object'?raw.ipGeoCache:{};base.months=base.months&&typeof base.months==='object'?base.months:{};const curr=jktMonth(base.updatedAt);if(raw.pages&&!raw.months){base.months[curr]={all:ensureBucket(raw.pages.all),home:ensureBucket(raw.pages.home),web:ensureBucket(raw.pages.web),tema:ensureBucket(raw.pages.tema)};}else if(raw.months&&typeof raw.months==='object'){for(const [mKey,mVal] of Object.entries(raw.months)){if(mVal&&typeof mVal==='object'){base.months[mKey]={all:ensureBucket(mVal.all),home:ensureBucket(mVal.home),web:ensureBucket(mVal.web),tema:ensureBucket(mVal.tema)};}}}base.recentClicks=Array.isArray(raw.recentClicks)?raw.recentClicks.slice(0,100):[];purgeOldMonths(base,now);return base;}
function normPage(p){const s=String(p||'').trim().toLowerCase();if(s==='web'||s.includes('web-invitation'))return 'web';if(s==='tema'||s==='/tema'||s==='/tema/')return 'tema';return 'home';}
function resolveVisitorId(vid,ip='',ua='',salt='gs'){const c=String(vid||'').trim();if(/^[a-zA-Z0-9_-]{8,64}$/.test(c))return 'v_'+c;return 'fp_'+createHash('sha256').update(`${ip}|${ua}|${salt}`).digest('hex').slice(0,24);}
function recordMetaVisit(b,vid,now,{regionLabel,deviceInfo,sourceLabel,hourSlot}){
  if(regionLabel){b.byRegion=b.byRegion||{};if(!b.byRegion[regionLabel])b.byRegion[regionLabel]={region:regionLabel,uniqueVisitors:0,totalViews:0,uniqueWaClickers:0,totalWaClicks:0,visitors:{},waVisitors:{},lastSeenAt:0};const r=b.byRegion[regionLabel];r.totalViews+=1;r.lastSeenAt=now;r.visitors=r.visitors||{};if(!r.visitors[vid]){r.visitors[vid]=now;r.uniqueVisitors+=1;}}
  if(deviceInfo&&deviceInfo.label){b.byDevice=b.byDevice||{};const dk=deviceInfo.label;if(!b.byDevice[dk])b.byDevice[dk]={device:dk,osType:deviceInfo.osType||'Lainnya',uniqueVisitors:0,totalViews:0,uniqueWaClickers:0,totalWaClicks:0,visitors:{},waVisitors:{},lastSeenAt:0};const dv=b.byDevice[dk];dv.totalViews+=1;dv.lastSeenAt=now;dv.visitors=dv.visitors||{};if(!dv.visitors[vid]){dv.visitors[vid]=now;dv.uniqueVisitors+=1;}}
  if(sourceLabel){b.bySource=b.bySource||{};if(!b.bySource[sourceLabel])b.bySource[sourceLabel]={source:sourceLabel,uniqueVisitors:0,totalViews:0,uniqueWaClickers:0,totalWaClicks:0,visitors:{},waVisitors:{},lastSeenAt:0};const sc=b.bySource[sourceLabel];sc.totalViews+=1;sc.lastSeenAt=now;sc.visitors=sc.visitors||{};if(!sc.visitors[vid]){sc.visitors[vid]=now;sc.uniqueVisitors+=1;}}
  if(hourSlot){b.byHourSlot=b.byHourSlot||{};if(!b.byHourSlot[hourSlot])b.byHourSlot[hourSlot]={key:hourSlot,uniqueVisitors:0,views:0,waClicks:0,visitors:{}};const hs=b.byHourSlot[hourSlot];hs.views+=1;hs.visitors=hs.visitors||{};if(!hs.visitors[vid]){hs.visitors[vid]=now;hs.uniqueVisitors+=1;}}
}
function recordMetaWaClick(b,vid,now,{regionLabel,deviceInfo,sourceLabel,hourSlot}){
  if(regionLabel){b.byRegion=b.byRegion||{};if(!b.byRegion[regionLabel])b.byRegion[regionLabel]={region:regionLabel,uniqueVisitors:1,totalViews:1,uniqueWaClickers:0,totalWaClicks:0,visitors:{[vid]:now},waVisitors:{},lastSeenAt:now};const r=b.byRegion[regionLabel];r.totalWaClicks=(Number(r.totalWaClicks)||0)+1;r.lastSeenAt=now;r.waVisitors=r.waVisitors||{};if(!r.waVisitors[vid]){r.waVisitors[vid]=now;r.uniqueWaClickers=(Number(r.uniqueWaClickers)||0)+1;}}
  if(deviceInfo&&deviceInfo.label){b.byDevice=b.byDevice||{};const dk=deviceInfo.label;if(!b.byDevice[dk])b.byDevice[dk]={device:dk,osType:deviceInfo.osType||'Lainnya',uniqueVisitors:1,totalViews:1,uniqueWaClickers:0,totalWaClicks:0,visitors:{[vid]:now},waVisitors:{},lastSeenAt:now};const dv=b.byDevice[dk];dv.totalWaClicks=(Number(dv.totalWaClicks)||0)+1;dv.lastSeenAt=now;dv.waVisitors=dv.waVisitors||{};if(!dv.waVisitors[vid]){dv.waVisitors[vid]=now;dv.uniqueWaClickers=(Number(dv.uniqueWaClickers)||0)+1;}}
  if(sourceLabel){b.bySource=b.bySource||{};if(!b.bySource[sourceLabel])b.bySource[sourceLabel]={source:sourceLabel,uniqueVisitors:1,totalViews:1,uniqueWaClickers:0,totalWaClicks:0,visitors:{[vid]:now},waVisitors:{},lastSeenAt:now};const sc=b.bySource[sourceLabel];sc.totalWaClicks=(Number(sc.totalWaClicks)||0)+1;sc.lastSeenAt=now;sc.waVisitors=sc.waVisitors||{};if(!sc.waVisitors[vid]){sc.waVisitors[vid]=now;sc.uniqueWaClickers=(Number(sc.uniqueWaClickers)||0)+1;}}
  if(hourSlot){b.byHourSlot=b.byHourSlot||{};if(!b.byHourSlot[hourSlot])b.byHourSlot[hourSlot]={key:hourSlot,uniqueVisitors:1,views:1,waClicks:0,visitors:{[vid]:now}};b.byHourSlot[hourSlot].waClicks=(Number(b.byHourSlot[hourSlot].waClicks)||0)+1;}
}
function visitBucket(b,vid,now,dKey,meta={}){b.totalPageviews+=1;if(!b.daily[dKey])b.daily[dKey]={views:0,uniqueVisitors:0,waClicks:0,previews:0,visitors:{}};const d=b.daily[dKey];d.views=(Number(d.views)||0)+1;d.visitors=d.visitors||{};if(!d.visitors[vid]){d.visitors[vid]=now;d.uniqueVisitors=(Number(d.uniqueVisitors)||0)+1;}recordMetaVisit(b,vid,now,meta);const ex=b.visitors[vid];if(!ex){b.uniqueMonthlyTotal+=1;b.visitors[vid]={firstSeenAt:now,lastSeenAt:now,totalViews:1,region:meta.regionLabel||'',device:meta.deviceInfo?.label||'',source:meta.sourceLabel||''};return true;}ex.lastSeenAt=now;ex.totalViews=(ex.totalViews||0)+1;if(meta.regionLabel)ex.region=meta.regionLabel;if(meta.deviceInfo?.label)ex.device=meta.deviceInfo.label;if(meta.sourceLabel)ex.source=meta.sourceLabel;return false;}
function recordVisit(state,{page,visitorId,ua='',deviceModel='',screen='',ref='',qs='',tz='',city='',region='',now=Date.now()}){purgeOldMonths(state,now);const curr=jktMonth(now);const m=ensureMonth(state,curr);const pk=normPage(page),dk=jktDate(now);state.updatedAt=now;const regionLabel=formatRegionLabel({city,region,tz});const deviceInfo=parseDeviceInfo(ua,deviceModel,screen);const sourceLabel=parseTrafficSource(ua,ref,qs);const hourSlot=jktHourSlot(now);const meta={regionLabel,deviceInfo,sourceLabel,hourSlot};const isNewOnPage=visitBucket(m[pk],visitorId,now,dk,meta);const isNewGlobal=visitBucket(m.all,visitorId,now,dk,meta);state.pages=m;return{page:pk,isNewOnPage,isNewGlobal,region:regionLabel,device:deviceInfo.label,source:sourceLabel};}
function ensureThemeEntry(b,themeName,catName){b.byTheme=b.byTheme||{};if(!b.byTheme[themeName])b.byTheme[themeName]={name:themeName,category:catName||'Tema Undangan',totalClicks:0,uniqueClickers:0,fromCard:0,fromPreview:0,fromOther:0,previewCount:0,uniquePreviewers:0,previewWithPhoto:0,previewNoPhoto:0,visitors:{},previewVisitors:{},lastClickedAt:0,lastPreviewedAt:0};const tc=b.byTheme[themeName];if(catName&&(!tc.category||tc.category==='Konsultasi Umum'||tc.category==='Tema Undangan'))tc.category=catName;return tc;}
function clickBucket(b,vid,{locKey,themeName,catName,now,dKey,meta={}}){b.totalWaClicks+=1;if(!b.daily[dKey])b.daily[dKey]={views:0,uniqueVisitors:0,waClicks:0,previews:0,visitors:{}};b.daily[dKey].waClicks=(Number(b.daily[dKey].waClicks)||0)+1;const lastW=b.waClickVisitors[vid];if(!lastW){b.uniqueWaClickersTotal+=1;b.waClickVisitors[vid]=now;}recordMetaWaClick(b,vid,now,meta);if(!b.byLocation[locKey])b.byLocation[locKey]={location:locKey,label:LOCATION_LABELS[locKey]||locKey,totalClicks:0,uniqueClickers:0,visitors:{},lastClickedAt:0};const lc=b.byLocation[locKey];lc.totalClicks+=1;lc.lastClickedAt=now;lc.visitors=lc.visitors||{};if(!lc.visitors[vid]){lc.uniqueClickers+=1;lc.visitors[vid]=now;}const tc=ensureThemeEntry(b,themeName,catName);tc.totalClicks=(Number(tc.totalClicks)||0)+1;tc.lastClickedAt=now;if(locKey==='theme-card')tc.fromCard=(Number(tc.fromCard)||0)+1;else if(locKey==='preview')tc.fromPreview=(Number(tc.fromPreview)||0)+1;else tc.fromOther=(Number(tc.fromOther)||0)+1;tc.visitors=tc.visitors||{};if(!tc.visitors[vid]){tc.uniqueClickers=(Number(tc.uniqueClickers)||0)+1;tc.visitors[vid]=now;}}
function recordWaClick(state,{page,visitorId,location,theme,category,ua='',deviceModel='',screen='',ref='',qs='',tz='',city='',region='',now=Date.now()}){purgeOldMonths(state,now);const curr=jktMonth(now);const m=ensureMonth(state,curr);const pk=normPage(page),dk=jktDate(now);state.updatedAt=now;const rawLoc=String(location||'other').trim().toLowerCase().slice(0,40)||'other';const locKey=LOCATION_LABELS[rawLoc]?rawLoc:(rawLoc.replace(/[^a-z0-9_-]/g,'')||'other');const rawTheme=String(theme||'').trim().slice(0,120);const themeName=rawTheme||'Konsultasi Umum (Tanpa Tema Spesifik)';let catName=String(category||'').trim().slice(0,60);if(!catName)catName=themeName.startsWith('Add-on')?'Add-on':(!rawTheme?'Konsultasi Umum':'Tema Undangan');const exVis=m.all?.visitors?.[visitorId]||m[pk]?.visitors?.[visitorId]||{};const regionLabel=(city||region||tz)?formatRegionLabel({city,region,tz}):(exVis.region||formatRegionLabel({}));const deviceInfo=(ua||deviceModel)?parseDeviceInfo(ua,deviceModel,screen):{label:exVis.device||'📱 HP / Perangkat',osType:'Lainnya'};const sourceLabel=(ua||ref||qs)?parseTrafficSource(ua,ref,qs):(exVis.source||'🌐 Browser Langsung');const hourSlot=jktHourSlot(now);const meta={regionLabel,deviceInfo,sourceLabel,hourSlot};clickBucket(m[pk],visitorId,{locKey,themeName,catName,now,dKey:dk,meta});clickBucket(m.all,visitorId,{locKey,themeName,catName,now,dKey:dk,meta});state.pages=m;state.recentClicks.unshift({timestamp:now,month:curr,page:pk,pageLabel:PAGE_LABELS[pk],location:locKey,locationLabel:LOCATION_LABELS[locKey]||locKey,theme:themeName,category:catName,region:regionLabel,device:deviceInfo.label,source:sourceLabel});if(state.recentClicks.length>100)state.recentClicks.length=100;return{page:pk,location:locKey,theme:themeName,region:regionLabel,device:deviceInfo.label,source:sourceLabel};}
function previewInBucket(b,vid,{themeName,catName,variant,now,dKey}){b.totalPreviews=(Number(b.totalPreviews)||0)+1;b.previewVisitors=b.previewVisitors||{};if(!b.previewVisitors[vid]){b.previewVisitors[vid]=now;b.uniquePreviewersTotal=(Number(b.uniquePreviewersTotal)||0)+1;}if(!b.daily[dKey])b.daily[dKey]={views:0,uniqueVisitors:0,waClicks:0,previews:0,visitors:{}};b.daily[dKey].previews=(Number(b.daily[dKey].previews)||0)+1;const tc=ensureThemeEntry(b,themeName,catName);tc.previewCount=(Number(tc.previewCount)||0)+1;tc.lastPreviewedAt=now;if(variant==='photo')tc.previewWithPhoto=(Number(tc.previewWithPhoto)||0)+1;else tc.previewNoPhoto=(Number(tc.previewNoPhoto)||0)+1;tc.previewVisitors=tc.previewVisitors||{};if(!tc.previewVisitors[vid]){tc.previewVisitors[vid]=now;tc.uniquePreviewers=(Number(tc.uniquePreviewers)||0)+1;}}
function recordThemePreview(state,{page,visitorId,theme,category,variant='no_photo',now=Date.now()}){purgeOldMonths(state,now);const curr=jktMonth(now);const m=ensureMonth(state,curr);const pk=normPage(page),dk=jktDate(now);state.updatedAt=now;const themeName=String(theme||'').trim().slice(0,120);if(!themeName)return{ok:false};const catName=String(category||'Tema Undangan').trim().slice(0,60);const normVar=variant==='photo'||variant==='Dengan Foto'?'photo':'no_photo';previewInBucket(m[pk],visitorId,{themeName,catName,variant:normVar,now,dKey:dk});previewInBucket(m.all,visitorId,{themeName,catName,variant:normVar,now,dKey:dk});state.pages=m;return{page:pk,theme:themeName,variant:normVar};}
function categoryInBucket(b,vid,{categoryName,now}){b.byCategoryInterest=b.byCategoryInterest||{};if(!b.byCategoryInterest[categoryName])b.byCategoryInterest[categoryName]={category:categoryName,totalClicks:0,uniqueUsers:0,visitors:{},lastClickedAt:0};const ci=b.byCategoryInterest[categoryName];ci.totalClicks+=1;ci.lastClickedAt=now;ci.visitors=ci.visitors||{};if(!ci.visitors[vid]){ci.visitors[vid]=now;ci.uniqueUsers+=1;}}
function recordCategoryInterest(state,{page,visitorId,category,now=Date.now()}){purgeOldMonths(state,now);const curr=jktMonth(now);const m=ensureMonth(state,curr);const pk=normPage(page);state.updatedAt=now;const catName=String(category||'').trim().slice(0,80);if(!catName)return{ok:false};categoryInBucket(m[pk],visitorId,{categoryName:catName,now});categoryInBucket(m.all,visitorId,{categoryName:catName,now});state.pages=m;return{page:pk,category:catName};}
function sumBucket(b,pk,recents,monthKey,isCurrent,now=Date.now()){
  const [y,m]=monthKey.split('-').map(Number),maxDays=getDaysInMonth(y,m),tKey=jktDate(now);
  const uniqueMonthly=b.uniqueMonthlyTotal||Object.keys(b.visitors||{}).length||0;
  const uniqueWaClickers=b.uniqueWaClickersTotal||Object.keys(b.waClickVisitors||{}).length||0;
  const totalPreviews=Number(b.totalPreviews)||0;
  const uniquePreviewers=Number(b.uniquePreviewersTotal)||Object.keys(b.previewVisitors||{}).length||0;
  const uniqueToday=isCurrent?(Number(b.daily?.[tKey]?.uniqueVisitors)||0):0;
  const viewsToday=isCurrent?(Number(b.daily?.[tKey]?.views)||0):0;
  const waClicksToday=isCurrent?(Number(b.daily?.[tKey]?.waClicks)||0):0;
  const conversionRate=uniqueMonthly>0?Number(((uniqueWaClickers/uniqueMonthly)*100).toFixed(1)):0;
  const locations=Object.values(b.byLocation||{}).map(x=>({location:x.location,label:LOCATION_LABELS[x.location]||x.label||x.location,totalClicks:x.totalClicks||0,uniqueClickers:x.uniqueClickers||0,lastClickedAt:x.lastClickedAt||0})).sort((a,c)=>c.totalClicks-a.totalClicks);
  const themesList=Object.values(b.byTheme||{}).map(x=>{
    const tClicks=Number(x.totalClicks)||0,uClickers=Number(x.uniqueClickers)||0,pCount=Number(x.previewCount)||0,uPrev=Number(x.uniquePreviewers)||0,pPhoto=Number(x.previewWithPhoto)||0,pNoPhoto=Number(x.previewNoPhoto)||0;
    const previewToWaRate=uPrev>0?Math.min(100,Number(((uClickers/uPrev)*100).toFixed(1))):(uClickers>0?100:0);
    let insight='📊 Mulai Dilihat';
    if(x.category==='Konsultasi Umum'||x.category==='Add-on')insight=tClicks>=3?'💬 Banyak Ditanyakan':'✅ Aktif';
    else if(uClickers>=2&&(uPrev===0||(uClickers/Math.max(1,uPrev))>=0.3))insight='🔥 Konversi Tinggi (Potensi Bestseller)';
    else if(uClickers>=1)insight='✅ Diminati (Menghasilkan Chat)';
    else if(pCount>=3&&tClicks===0)insight='👀 Banyak Di-preview, Belum Chat WA';
    return{name:x.name,category:x.category||'Tema Undangan',totalClicks:tClicks,uniqueClickers:uClickers,fromCard:x.fromCard||0,fromPreview:x.fromPreview||0,fromOther:x.fromOther||0,previewCount:pCount,uniquePreviewers:uPrev,previewWithPhoto:pPhoto,previewNoPhoto:pNoPhoto,previewToWaRate,insight,lastClickedAt:x.lastClickedAt||x.lastPreviewedAt||0};
  }).sort((a,c)=>(c.totalClicks-a.totalClicks)||(c.previewCount-a.previewCount));
  const regions=Object.values(b.byRegion||{}).map(x=>{const uVis=Number(x.uniqueVisitors)||0,uWa=Number(x.uniqueWaClickers)||0;return{region:x.region,uniqueVisitors:uVis,totalViews:Number(x.totalViews)||0,uniqueWaClickers:uWa,totalWaClicks:Number(x.totalWaClicks)||0,conversionRate:uVis>0?Number(((uWa/uVis)*100).toFixed(1)):0,lastSeenAt:x.lastSeenAt||0};}).sort((a,c)=>(c.uniqueVisitors-a.uniqueVisitors)||(c.totalWaClicks-a.totalWaClicks));
  const devices=Object.values(b.byDevice||{}).map(x=>{const uVis=Number(x.uniqueVisitors)||0,uWa=Number(x.uniqueWaClickers)||0;return{device:x.device,osType:x.osType||'Lainnya',uniqueVisitors:uVis,totalViews:Number(x.totalViews)||0,uniqueWaClickers:uWa,totalWaClicks:Number(x.totalWaClicks)||0,conversionRate:uVis>0?Number(((uWa/uVis)*100).toFixed(1)):0,lastSeenAt:x.lastSeenAt||0};}).sort((a,c)=>(c.uniqueVisitors-a.uniqueVisitors)||(c.totalWaClicks-a.totalWaClicks));
  const sources=Object.values(b.bySource||{}).map(x=>{const uVis=Number(x.uniqueVisitors)||0,uWa=Number(x.uniqueWaClickers)||0;return{source:x.source,uniqueVisitors:uVis,totalViews:Number(x.totalViews)||0,uniqueWaClickers:uWa,totalWaClicks:Number(x.totalWaClicks)||0,conversionRate:uVis>0?Number(((uWa/uVis)*100).toFixed(1)):0,lastSeenAt:x.lastSeenAt||0};}).sort((a,c)=>(c.uniqueVisitors-a.uniqueVisitors)||(c.totalWaClicks-a.totalWaClicks));
  const categoryInterests=Object.values(b.byCategoryInterest||{}).map(x=>({category:x.category,uniqueUsers:Number(x.uniqueUsers)||0,totalClicks:Number(x.totalClicks)||0,lastClickedAt:x.lastClickedAt||0})).sort((a,c)=>c.totalClicks-a.totalClicks);
  const hourSlots=HOUR_SLOTS.map(slot=>{const hs=b.byHourSlot?.[slot.key]||{};return{key:slot.key,label:slot.label,hours:slot.hours,uniqueVisitors:Number(hs.uniqueVisitors)||0,views:Number(hs.views)||0,waClicks:Number(hs.waClicks)||0};});
  const currentDayNum=isCurrent?Math.min(maxDays,new Date(now+7*3600000).getDate()):maxDays;
  const dailyTrend=[];
  for(let day=currentDayNum;day>=1;day--){const dk=`${monthKey}-${String(day).padStart(2,'0')}`;const d=b.daily?.[dk];const uVis=Number(d?.uniqueVisitors)||0;const clicks=Number(d?.waClicks)||0;dailyTrend.push({date:dk,uniqueVisitors:uVis,views:Number(d?.views)||0,previews:Number(d?.previews)||0,waClicks:clicks,conversionRate:uVis>0?Number(((clicks/uVis)*100).toFixed(1)):0});}
  const avgDailyVisitors=currentDayNum>0?Math.round(uniqueMonthly/currentDayNum):0;
  const monthRecents=recents.filter(c=>(c.month||jktMonth(c.timestamp))===monthKey);
  const filteredRecents=pk==='all'?monthRecents:monthRecents.filter(c=>c.page===pk);
  return{page:pk,label:PAGE_LABELS[pk]||pk,monthKey,isCurrent,daysInPeriod:currentDayNum,avgDailyVisitors,uniqueMonthly,uniqueToday,totalPageviews:b.totalPageviews||0,viewsToday,totalPreviews,uniquePreviewers,totalWaClicks:b.totalWaClicks||0,uniqueWaClickers,waClicksToday,conversionRate,locations,themes:themesList,regions,devices,sources,categoryInterests,hourSlots,dailyTrend,recentClicks:filteredRecents.slice(0,50)};
}
function buildAnalyticsSummary(state,now=Date.now()){purgeOldMonths(state,now);const currMonth=jktMonth(now),prevMonth=getPrevMonthKey(currMonth);ensureMonth(state,currMonth);ensureMonth(state,prevMonth);const monthsSummary={};for(const mKey of [currMonth,prevMonth]){const mData=state.months[mKey];const isCurr=(mKey===currMonth);monthsSummary[mKey]={monthKey:mKey,label:formatMonthLabel(mKey,isCurr),isCurrent:isCurr,pages:{all:sumBucket(mData.all,'all',state.recentClicks,mKey,isCurr,now),home:sumBucket(mData.home,'home',state.recentClicks,mKey,isCurr,now),web:sumBucket(mData.web,'web',state.recentClicks,mKey,isCurr,now),tema:sumBucket(mData.tema,'tema',state.recentClicks,mKey,isCurr,now)}};}return{updatedAt:state.updatedAt||now,currentMonth:currMonth,prevMonth:prevMonth,availableMonths:[{key:currMonth,label:formatMonthLabel(currMonth,true),isCurrent:true},{key:prevMonth,label:formatMonthLabel(prevMonth,false),isCurrent:false}],months:monthsSummary,pages:monthsSummary[currMonth].pages};}
let analytics=createEmptyAnalyticsState();
try{analytics=ensureAnalytics(JSON.parse(await fs.readFile(analyticsDb,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;await fs.writeFile(analyticsDb,JSON.stringify(analytics)).catch(()=>{});}
function mutateAnalytics(fn){const job=queue.then(async()=>{const next=fn(analytics);await fs.writeFile(analyticsDb+'.tmp',JSON.stringify(next));await fs.rename(analyticsDb+'.tmp',analyticsDb);analytics=next;});queue=job.catch(()=>{});return job;}
const sessions=new Map(), attempts=new Map();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let data='';for await(const c of req){data+=c;if(Buffer.byteLength(data)>5e6){throw Error('Ukuran data maksimal 5 MB.');}}return JSON.parse(data||'{}');}
function validUrl(value,image=false){if(image&&/^\/(assets|uploads)\/[a-zA-Z0-9_./% ()-]+$/.test(value)&&!value.includes('..'))return true;try{return new URL(value).protocol==='https:'}catch{return false}}
function validated(t){if(!t.name?.trim()||!t.category?.trim()||!validUrl(t.image,true)||!validUrl(t.demo)||(t.demoPhoto&&!validUrl(t.demoPhoto))||!Number.isInteger(t.price)||t.price<0||!Number.isInteger(t.photoPrice)||t.photoPrice<0)throw Error('Lengkapi nama, kategori, harga bulat positif, gambar dan tautan contoh HTTPS.');return {id:t.id,name:t.name.trim().slice(0,120),category:t.category.trim().slice(0,60),price:t.price,photoPrice:t.photoPrice,image:t.image,demo:t.demo,demoPhoto:String(t.demoPhoto||''),active:!!t.active,featured:!!t.featured,bestseller:!!(t.bestseller!==undefined?t.bestseller:t.featured),note:String(t.note||'').slice(0,500)};}
http.createServer(async(req,res)=>{try{
const u=new URL(req.url,'http://localhost');const p=u.pathname;
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('gs_session='))?.slice(11);const logged=token&&sessions.get(token)>Date.now();
if(p==='/go/tiktok'||p==='/go/tiktok/'){res.writeHead(302,{'Location':'https://www.tiktok.com/@galipat_story','Cache-Control':'no-cache'});return res.end();}
if(p==='/go/instagram'||p==='/go/instagram/'){res.writeHead(302,{'Location':'https://www.instagram.com/galipat_story/','Cache-Control':'no-cache'});return res.end();}
if(p==='/invitation-preview'&&req.method==='GET'){
const theme=themes.find(t=>t.active&&t.id===u.searchParams.get('theme'));const photo=u.searchParams.get('version')==='photo';
if(!theme||!supportsPreview(photo?theme.demoPhoto:theme.demo))return send(res,404,{error:'Contoh tidak tersedia.'});
try{const html=await renderPreview(theme,photo);res.removeHeader('X-Frame-Options');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"sandbox allow-scripts allow-popups allow-same-origin allow-forms"});return res.end(html);}catch{return send(res,502,{error:'Contoh sedang tidak dapat dimuat. Silakan coba lagi.'});}
}
if(p.startsWith('/api/')){
if((p==='/api/catatan'||p==='/api/track')&&req.method==='POST'){
  const b=await body(req);
  const cookieVid=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('gs_vid='))?.slice(7);
  const ip=String(req.headers['cf-connecting-ip']||req.headers['x-forwarded-for']?.split(',')[0]?.trim()||req.socket.remoteAddress||'');
  const ua=String(req.headers['user-agent']||'');
  const rawClientVid=String(b.visitorId||cookieVid||'').trim();
  const visitorId=resolveVisitorId(rawClientVid,ip,ua,auth.salt);
  const cleanCookieVal=/^[a-zA-Z0-9_-]{8,64}$/.test(rawClientVid)?rawClientVid:visitorId;
  res.setHeader('Set-Cookie',`gs_vid=${cleanCookieVal}; SameSite=Lax; Path=/; Max-Age=2592000${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);
  analytics.ipGeoCache=analytics.ipGeoCache||{};
  let city=String(b.city||req.headers['cf-ipcity']||req.headers['x-vercel-ip-city']||req.headers['x-geo-city']||'').trim();
  let region=String(b.region||req.headers['cf-region']||req.headers['x-vercel-ip-country-region']||'').trim();
  if(!city&&isPublicIp(ip)){
    const geo=await lookupPublicIpGeo(ip,analytics.ipGeoCache);
    if(geo){city=geo.city||'';region=geo.region||'';}
  }
  const commonMeta={
    page:b.page,
    visitorId,
    ua,
    deviceModel:String(b.deviceModel||''),
    screen:String(b.screen||''),
    ref:String(b.ref||req.headers['referer']||''),
    qs:String(b.qs||''),
    tz:String(b.tz||''),
    city,
    region
  };
  let result={ok:true};
  await mutateAnalytics(state=>{
    if(b.type==='wa_click'){
      result={ok:true,...recordWaClick(state,{...commonMeta,location:b.location,theme:b.theme,category:b.category})};
    }else if(b.type==='theme_preview'){
      result={ok:true,...recordThemePreview(state,{page:b.page,visitorId,theme:b.theme,category:b.category,variant:b.variant})};
    }else if(b.type==='category_click'){
      result={ok:true,...recordCategoryInterest(state,{page:b.page,visitorId,category:b.category})};
    }else{
      result={ok:true,...recordVisit(state,commonMeta)};
    }
    return state;
  });
  return send(res,200,result);
}
if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return send(res,403,{error:'Asal permintaan tidak diizinkan.'});
if(p==='/api/themes'&&req.method==='GET')return send(res,200,themes.filter(t=>t.active));
if(p==='/api/settings'&&req.method==='GET')return send(res,200,settings);
if(p==='/api/categories'&&req.method==='GET'){const list=[...categories];const seen=new Set(list.map(c=>c.name));for(const t of themes.filter(x=>x.active)){if(!seen.has(t.category)){seen.add(t.category);list.push({id:t.category.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name:t.category,note:''});}}return send(res,200,list);}
if(p==='/api/login'&&req.method==='POST'){const ip=req.socket.remoteAddress;const a=attempts.get(ip)||{n:0,until:0};if(a.until>Date.now()&&a.n>=8)return send(res,429,{error:'Terlalu banyak percobaan. Coba lagi 15 menit.'});const b=await body(req);const check=scryptSync(String(b.password||''),auth.salt,64);if(b.username!=='admin'||!timingSafeEqual(check,Buffer.from(auth.hash,'hex'))){attempts.set(ip,{n:a.until>Date.now()?a.n+1:1,until:Date.now()+900000});return send(res,401,{error:'Nama pengguna atau kata sandi salah.'});}attempts.delete(ip);const id=randomBytes(32).toString('hex');sessions.set(id,Date.now()+8*3600000);res.setHeader('Set-Cookie',`gs_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);return send(res,200,{ok:true});}
if(!logged)return send(res,401,{error:'Silakan masuk kembali.'});
if((p==='/api/admin/ringkasan'||p==='/api/admin/analytics')&&req.method==='GET')return send(res,200,buildAnalyticsSummary(analytics));
if((p==='/api/admin/ringkasan/reset'||p==='/api/admin/analytics/reset')&&req.method==='POST'){await mutateAnalytics(()=>createEmptyAnalyticsState());return send(res,200,buildAnalyticsSummary(analytics));}
if(p==='/api/admin/settings'&&req.method==='GET')return send(res,200,settings);
if(p==='/api/admin/settings'&&['POST','PUT'].includes(req.method)){const b=await body(req);const mode=b.previewMode==='modal'?'modal':'new_tab';await mutateSettings(all=>({...all,previewMode:mode}));return send(res,200,settings);}
if(p==='/api/admin/categories'&&req.method==='GET'){const list=[...categories];const seen=new Set(list.map(c=>c.name));for(const t of themes){if(!seen.has(t.category)){seen.add(t.category);list.push({id:t.category.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name:t.category,note:''});}}return send(res,200,list);}
if(p==='/api/admin/categories'&&req.method==='POST'){const b=await body(req);const name=String(b.name||'').trim().slice(0,60);const note=String(b.note||'').trim().slice(0,300);if(!name)throw Error('Nama kategori wajib diisi.');if(categories.some(c=>c.name.toLowerCase()===name.toLowerCase()))throw Error('Kategori sudah ada.');const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||randomBytes(4).toString('hex');const item={id,name,note};await mutateCategories(all=>[...all,item]);return send(res,200,item);}
if(p.startsWith('/api/admin/categories/')&&req.method==='DELETE'){const target=decodeURIComponent(p.slice(23));await mutateCategories(all=>all.filter(c=>c.id!==target&&c.name!==target));return send(res,200,{ok:true});}
if(p==='/api/logout'&&req.method==='POST'){sessions.delete(token);res.setHeader('Set-Cookie','gs_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(res,200,{ok:true});}
if(p==='/api/password'&&req.method==='POST'){const b=await body(req);if(!timingSafeEqual(scryptSync(String(b.current||''),auth.salt,64),Buffer.from(auth.hash,'hex')))return send(res,400,{error:'Kata sandi saat ini salah.'});if(typeof b.password!=='string'||b.password.length<12)return send(res,400,{error:'Kata sandi baru minimal 12 karakter.'});const salt=randomBytes(16).toString('hex');auth={version:2,salt,hash:scryptSync(b.password,salt,64).toString('hex')};await fs.writeFile(secretPath,JSON.stringify(auth),{mode:0o600});await fs.unlink(path.join(root,'AKSES-ADMIN.txt')).catch(()=>{});sessions.clear();return send(res,200,{ok:true});}
if(p==='/api/admin/themes'&&req.method==='GET')return send(res,200,themes);
const mBs=p.match(/^\/api\/admin\/themes\/(.+)\/toggle-bestseller$/);
if(mBs&&['POST','PUT'].includes(req.method)){const id=decodeURIComponent(mBs[1]);let updated;await mutate(all=>all.map(x=>{if(x.id===id){updated={...x,bestseller:!x.bestseller};return updated;}return x;}));if(!updated)throw Error('Tema tidak ditemukan.');return send(res,200,updated);}
if(p==='/api/admin/themes'&&['POST','PUT'].includes(req.method)){const t=await body(req);t.id=req.method==='POST'?randomBytes(8).toString('hex'):t.id;const item=validated(t);await mutate(all=>{if(req.method==='PUT'&&!all.some(x=>x.id===item.id))throw Error('Tema tidak ditemukan.');return req.method==='POST'?[item,...all]:all.map(x=>x.id===item.id?item:x)});return send(res,200,item);}
if(p==='/api/upload'&&req.method==='POST'){const b=await body(req);const m=String(b.image).match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);if(!m)throw Error('Gunakan PNG, JPG, atau WebP.');const bytes=Buffer.from(m[2],'base64');if(bytes.length>3e6)throw Error('Gambar maksimal 3 MB.');const valid=m[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):m[1]==='jpeg'?bytes[0]===255&&bytes[1]===216:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';if(!valid)throw Error('Berkas gambar tidak valid.');const name=randomBytes(12).toString('hex')+'.'+m[1];await fs.writeFile(path.join(publicDir,'uploads',name),bytes);return send(res,200,{url:'/uploads/'+name});}
return send(res,404,{error:'Tidak ditemukan.'});}
if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'Metode tidak didukung.'});
if(p.startsWith('/vendor/fonts/'))res.setHeader('Access-Control-Allow-Origin','*');
let targetPath=p;
if(p==='/'||p==='')targetPath='/index.html';
else if(p==='/kamu'||p==='/kamu/')targetPath='/admin.html';
else if(p==='/tema'||p==='/tema/')targetPath='/tema.html';
else if(p==='/web-invitation'||p==='/web-invitation/')targetPath='/web-invitation.html';
if(p==='/admin'||p==='/admin/'||p==='/admin.html'){res.writeHead(302,{'Location':'/','Cache-Control':'no-cache'});return res.end();}
const file=path.resolve(publicDir,'.'+decodeURIComponent(targetPath));if(!file.startsWith(publicDir+path.sep))return send(res,403,{error:'Akses ditolak.'});try{const bytes=await fs.readFile(file);const ext=path.extname(file);let cacheHeader='no-cache';if(file.includes('admin')||p.includes('admin')||p.includes('kamu')){cacheHeader='no-cache, no-store, must-revalidate';}else if(p.startsWith('/assets/')||p.startsWith('/vendor/')||p.startsWith('/favicon')||['.webp','.png','.jpg','.jpeg','.svg','.ico','.woff2'].includes(ext)){cacheHeader='public, max-age=31536000, immutable';}else if(p.startsWith('/uploads/')){cacheHeader='public, max-age=2592000';}else if(ext==='.css'||ext==='.js'){cacheHeader='public, max-age=31536000, immutable';}res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':cacheHeader});res.end(req.method==='HEAD'?undefined:bytes);}catch{if(!path.extname(targetPath)||path.extname(targetPath)==='.html'){res.writeHead(302,{'Location':'/','Cache-Control':'no-cache'});return res.end();}return send(res,404,{error:'Halaman tidak ditemukan.'});}
}catch(e){send(res,400,{error:e.message||'Permintaan gagal.'});}}).listen(Number(process.env.PORT||4303),process.env.HOST||'127.0.0.1',()=>console.log('Galipat Story v.03: http://'+(process.env.HOST||'127.0.0.1')+':'+(process.env.PORT||4303)));
