const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const ARROW_SVG='<svg class="arrow-icon" viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2.5 9.5L9.5 2.5M9.5 2.5H4.5M9.5 2.5V7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
document.querySelectorAll('a, button, span.social-arrow').forEach(el=>{
  if(el.childNodes.length===1&&el.childNodes[0].nodeType===3&&el.textContent.includes('↗')){
    el.innerHTML=el.textContent.replace(/↗/g,ARROW_SVG);
  }
});
const wa=(name='')=>{
  if(!name)return 'https://api.whatsapp.com/send?phone=6281803300354&text='+encodeURIComponent('Halo kak, saya lihat website Galipat Story. Mau tanya paket undangan digital dan minta rekomendasi tema, boleh?');
  const msg=name.startsWith('Add-on')
    ?`Halo kak, saya tertarik untuk ambil fitur ${name}. Boleh dibantu prosesnya kak?`
    :`Halo kak, saya ingin pesan tema ${name}. Boleh dibantu proses pemesannya kak?`;
  return 'https://api.whatsapp.com/send?phone=6281803300354&text='+encodeURIComponent(msg);
};
document.querySelectorAll('.wa').forEach(a=>{
  a.href=a.dataset.theme?wa(a.dataset.theme):wa();
  a.target='_blank';
  a.rel='noopener noreferrer';
});
document.addEventListener('click',e=>{const a=e.target.closest('a.wa');if(a&&typeof window.fbq==='function'){window.fbq('trackCustom','WhatsAppClick',{location:a.dataset.location||'catalog',theme_code:a.dataset.theme||''});window.fbq('track','Contact',{content_name:a.dataset.theme||'WhatsApp',content_category:a.dataset.location||'catalog'});}});
const notes={'Bestseller':'Koleksi tema terfavorit dan paling banyak dipilih calon pengantin.','Favorit':'Daftar tema yang kalian tandai bintang ★ untuk memudahkan perbandingan.','Eksklusif':'Tanpa foto Rp99.000 · Dengan foto Rp149.000. Desain tidak dapat digabung atau diganti warna.','Premium':'Tanpa foto Rp99.000 · Dengan foto Rp129.000. Penyesuaian warna tercatat untuk PR#20–PR#28.','Tema V.02':'Tanpa foto Rp79.000 · Dengan foto Rp109.000. Tema tidak dapat di mix atau ganti warna. Free barcode.'};
const isHidePrice=typeof document!=='undefined'&&(document.body.classList.contains('hide-pricing-page')||window.location.pathname.includes('web-invitation'));
const notesHidePrice={'Bestseller':'Koleksi tema terfavorit dan paling banyak dipilih calon pengantin.','Favorit':'Daftar tema yang kalian tandai bintang ★ untuk memudahkan perbandingan.','Eksklusif':'Desain eksklusif siap pakai. Desain tidak dapat digabung atau diganti warna.','Premium':'Desain bernuansa premium. Penyesuaian warna tercatat untuk PR#20–PR#28.','Tema V.02':'Pilihan tema serbaguna siap pakai. Free barcode.'};
let themes=[],category='Bestseller',limit=8;
const grid=document.getElementById('themes');
const revealObserver=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{for(const entry of entries){const el=entry.target;if(entry.isIntersecting){el.classList.add('revealed');}else{const rect=entry.boundingClientRect;el.classList.remove('revealed');if(rect.bottom<0){el.classList.add('from-top');}else if(rect.top>(window.innerHeight||document.documentElement.clientHeight)){el.classList.remove('from-top');}}}},{threshold:0.1,rootMargin:'0px 0px -30px 0px'}):null;

const v02Subcategories=[
  {key:'wedding',label:'Wedding'},
  {key:'birthday',label:'Kids & Birthday'},
  {key:'aqiqah',label:'Aqiqah & Tasmiyah'},
  {key:'khitan',label:'Tasyakuran Khitan'},
  {key:'umum',label:'Umum & Seminar'},
  {key:'christmas',label:'Christmas & New Year'},
  {key:'syukuran',label:'Syukuran & Islami'},
  {key:'party',label:'Party & Dinner'},
  {key:'school',label:'School & Graduation'}
];
const v02SubMap=Object.fromEntries(v02Subcategories.map(s=>[s.key,s.label]));
let subCategory='wedding';

function getFavorites(){
  try{
    const raw=localStorage.getItem('gs_favorites');
    return new Set(raw?JSON.parse(raw):[]);
  }catch(_){return new Set();}
}
function saveFavorites(set){
  try{
    localStorage.setItem('gs_favorites',JSON.stringify([...set]));
  }catch(_){}
}
let favorites=getFavorites();

function toggleFavorite(id){
  if(favorites.has(id)){
    favorites.delete(id);
  }else{
    favorites.add(id);
  }
  saveFavorites(favorites);
  updateFavoriteUI();
  if(category==='Favorit')render();
}

function updateFavoriteUI(){
  document.querySelectorAll('.card-fav-btn').forEach(btn=>{
    const id=btn.dataset.id;
    const isFav=favorites.has(id);
    btn.classList.toggle('active',isFav);
    btn.setAttribute('aria-label',isFav?'Hapus dari favorit':'Tandai sebagai favorit');
  });
  const modalFav=document.getElementById('preview-fav');
  if(modalFav&&previewTheme){
    const isFav=favorites.has(previewTheme.id);
    modalFav.classList.toggle('active',isFav);
    modalFav.setAttribute('aria-label',isFav?'Hapus dari favorit':'Tandai sebagai favorit');
  }
  const favBtn=document.getElementById('cat-btn-favorit');
  if(favBtn){
    favBtn.textContent=favorites.size>0?`★ Favorit (${favorites.size})`:'★ Favorit';
  }
}

function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function render(){
  const q=document.getElementById('search').value.trim().toLowerCase();
  const subWrap=document.getElementById('subcategories');
  if(category==='Tema V.02'){
    if(subWrap){
      subWrap.hidden=false;
      subWrap.querySelectorAll('button').forEach(b=>{
        b.setAttribute('aria-pressed',String(b.dataset.key===subCategory));
      });
    }
  }else{
    if(subWrap)subWrap.hidden=true;
  }

  let items=themes.filter(t=>{
    let matchesCat=false;
    if(category==='Bestseller'){
      matchesCat=!!(t.bestseller||t.featured);
    }else if(category==='Favorit'){
      matchesCat=favorites.has(t.id);
    }else if(category==='Tema V.02'){
      matchesCat=(t.category==='Tema V.02')&&(!subCategory||t.subCategory===subCategory);
    }else{
      matchesCat=(t.category===category);
    }
    const subLabel=t.subCategory?(v02SubMap[t.subCategory]||''):'';
    return matchesCat&&(`${t.name} ${t.category} ${subLabel}`).toLowerCase().includes(q);
  });
  const sort=document.getElementById('sort').value;
  if(sort==='low')items.sort((a,b)=>a.price-b.price);
  if(sort==='featured')items.sort((a,b)=>Number(b.featured)-Number(a.featured));
  grid.replaceChildren();
  document.getElementById('result-count').textContent=`${items.length} tema tersedia`;
  document.getElementById('category-note').textContent=(isHidePrice?(notesHidePrice[category]||''):(notes[category]||'Pilihan tema terfavorit dan paling banyak dipesan calon pengantin.'));
  const list=items.slice(0,limit);
  for(let i=0;i<list.length;i++){
    const t=list[i];
    const card=el('article','theme-card reveal');
    card.style.transitionDelay=`${(i%8)*0.04}s`;
    const image=el('button','theme-image');
    image.type='button';
    image.onclick=()=>openPreview(t);
    image.setAttribute('aria-label',`Lihat contoh ${t.name}`);
    const img=el('img');
    Object.assign(img,{src:t.image,alt:`Preview undangan ${t.name}`,loading:'lazy',decoding:'async',width:480,height:600});
    const tagText=(t.category==='Tema V.02'&&t.subCategory)?(v02SubMap[t.subCategory]||'Tema V.02'):t.category;
    image.append(img,el('span','theme-tag',tagText));
    
    const favBtn=el('button','favorite-btn card-fav-btn'+(favorites.has(t.id)?' active':''));
    favBtn.type='button';
    favBtn.dataset.id=t.id;
    favBtn.setAttribute('aria-label',favorites.has(t.id)?'Hapus dari favorit':'Tandai sebagai favorit');
    favBtn.title='Tandai favorit';
    favBtn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
    favBtn.onclick=(e)=>{e.stopPropagation();toggleFavorite(t.id);};
    
    const info=el('div','theme-info');
    info.append(el('h3','',t.name));

    let middleEl;
    if(isHidePrice){
      middleEl=el('div','theme-showcase-badge');
      middleEl.innerHTML='<span class="showcase-dot"></span>Desain Tersedia · Siap Pakai';
    }else{
      middleEl=el('div','theme-pricing');
      const rowNoPhoto=el('div','pricing-row');
      rowNoPhoto.append(el('span','pricing-label','Tanpa Foto'),el('strong','pricing-val',money(t.price)));
      const rowPhoto=el('div','pricing-row');
      rowPhoto.append(el('span','pricing-label','Dengan Foto'),el('strong','pricing-val',money(t.photoPrice)));
      middleEl.append(rowNoPhoto,rowPhoto);
    }

    const actions=el('div','card-actions');
    const preview=el('button','button outline','Lihat contoh');
    preview.type='button';
    preview.onclick=()=>openPreview(t);
    const buy=el('a','button wa');
    buy.innerHTML='Pilih tema ini '+ARROW_SVG;
    Object.assign(buy,{href:wa(`${t.name} (${t.category})`),target:'_blank',rel:'noopener noreferrer'});
    buy.dataset.theme=t.name;
    buy.dataset.location='theme-card';
    buy.setAttribute('aria-label',`Pilih tema ${t.name} melalui WhatsApp`);
    actions.append(preview,buy);
    card.append(image,favBtn,info,middleEl,actions);
    if(t.note){
      const details=el('details','theme-terms');
      details.append(el('summary','','Ketentuan tema'),el('p','',t.note));
      card.append(details);
    }
    grid.append(card);
    if(revealObserver)revealObserver.observe(card);
    else card.classList.add('revealed');
  }
  if(!items.length){
    const emptyMsg=category==='Favorit'
      ?'Belum ada tema yang ditandai bintang. Klik tanda bintang ★ pada kartu tema yang kalian suka untuk menyimpannya di sini.'
      :`Belum ada tema pada kategori "${category}". Hubungi admin WhatsApp untuk rekomendasi tema khusus.`;
    grid.append(el('p','empty',emptyMsg));
  }
  document.getElementById('more').hidden=items.length<=limit;
  document.querySelectorAll('#categories button').forEach(b=>{
    const isTarget=b.id==='cat-btn-favorit'?(category==='Favorit'):(b.dataset.category===category||b.textContent===category);
    b.setAttribute('aria-pressed',String(isTarget));
  });
}

let siteSettings={previewMode:'new_tab'};
if(typeof window!=='undefined')window.siteSettings=siteSettings;
Promise.all([
  fetch('/api/themes').then(r=>{if(!r.ok)throw Error();return r.json()}),
  fetch('/api/categories').then(r=>r.ok?r.json():[]).catch(()=>[]),
  fetch('/api/settings').then(r=>r.ok?r.json():null).catch(()=>null)
]).then(([data,serverCategories,serverSettings])=>{
  themes=data;
  if(serverSettings?.previewMode)siteSettings.previewMode=serverSettings.previewMode;
  const catNamesSet=new Set();
  serverCategories.forEach(c=>{
    if(c.name){
      catNamesSet.add(c.name);
      if(c.note)notes[c.name]=c.note;
    }
  });
  themes.forEach(t=>{if(t.category)catNamesSet.add(t.category)});
  const categories=['Bestseller','Favorit',...catNamesSet];
  const catContainer=document.getElementById('categories');
  catContainer.replaceChildren();
  for(const c of categories){
    const b=el('button','',c==='Favorit'?(favorites.size>0?`★ Favorit (${favorites.size})`:'★ Favorit'):c);
    b.type='button';
    b.dataset.category=c;
    if(c==='Favorit')b.id='cat-btn-favorit';
    b.onclick=()=>{
      category=c;
      if(c==='Tema V.02')subCategory='wedding';
      limit=8;
      render();
    };
    catContainer.append(b);
  }

  const subContainer=document.getElementById('subcategories');
  if(subContainer){
    subContainer.replaceChildren();
    for(const sub of v02Subcategories){
      const b=el('button','',sub.label);
      b.type='button';
      b.dataset.key=sub.key;
      b.onclick=()=>{
        subCategory=sub.key;
        limit=8;
        render();
      };
      subContainer.append(b);
    }
  }

  render();
}).catch(()=>{document.getElementById('result-count').textContent='Katalog belum dapat dimuat. Silakan muat ulang atau hubungi admin.'});

window.selectCategory=function(catName,subKey){
  category=catName;
  if(subKey)subCategory=subKey;
  else if(catName==='Tema V.02')subCategory='wedding';
  limit=8;
  render();
  document.querySelectorAll('#categories button').forEach(b=>{
    b.classList.toggle('active',b.dataset.category===catName);
  });
};

function initPromoCountdown(){
  const hoursEl=document.getElementById('promo-hours');
  if(!hoursEl)return;
  const days=['MINGGU','SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'];
  function tick(){
    const now=new Date();
    const dayEl=document.getElementById('promo-day-text');
    if(dayEl)dayEl.textContent=days[now.getDay()];
    const mid=new Date();
    mid.setHours(23,59,59,999);
    const diff=Math.max(0,mid-now);
    const h=Math.floor(diff/(1000*60*60));
    const m=Math.floor((diff/(1000*60))%60);
    const s=Math.floor((diff/1000)%60);
    hoursEl.textContent=String(h).padStart(2,'0');
    const minEl=document.getElementById('promo-minutes');
    const secEl=document.getElementById('promo-seconds');
    if(minEl)minEl.textContent=String(m).padStart(2,'0');
    if(secEl)secEl.textContent=String(s).padStart(2,'0');
  }
  tick();
  setInterval(tick,1000);
}
initPromoCountdown();

document.getElementById('search').addEventListener('input',()=>{limit=8;render()});
document.getElementById('sort').addEventListener('change',()=>{limit=8;render()});
document.getElementById('more').onclick=()=>{limit+=12;render()};
fetch('/reviews.json').then(r=>r.json()).then(rows=>rows.forEach(r=>{
  const figure=el('figure');
  figure.append(el('blockquote','',`“${r.text}”`),el('figcaption','','@'+r.username));
  document.getElementById('reviews').append(figure);
})).catch(()=>{});

const previewDialog=document.getElementById('preview-dialog');
const frame=document.getElementById('preview-frame');
const previewOverlay=document.getElementById('preview-overlay');
const previewLoader=document.getElementById('preview-loader');
const toggleNoPhoto=document.getElementById('toggle-no-photo');
const togglePhoto=document.getElementById('toggle-photo');
const variantToggle=document.getElementById('preview-variant-toggle');
const previewVariant=document.getElementById('preview-variant');
const previewFav=document.getElementById('preview-fav');

let previousPreviewFocus;
let previewTheme=null,previewVersion='',previewTimer;
function showChoices(){
  clearTimeout(previewTimer);
  if(previewLoader)previewLoader.hidden=true;
  frame.removeAttribute('src');
  document.getElementById('preview-choice').hidden=false;
  document.getElementById('preview-viewer').hidden=true;
}
function openDemoUrl(url){
  if(!url)return;
  const a=document.createElement('a');
  a.href=url;
  a.target='_blank';
  a.rel='noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function openPreview(theme){
  previewTheme=theme;
  if(siteSettings.previewMode==='new_tab'&&!theme.demoPhoto){
    if(theme.demo){
      openDemoUrl(theme.demo);
      return;
    }
  }
  document.getElementById('preview-title').textContent=theme.name;
  updateFavoriteUI();
  const noPhotoEl=document.getElementById('no-photo-price');
  const photoEl=document.getElementById('photo-price');
  if(noPhotoEl)noPhotoEl.textContent=isHidePrice?'':money(theme.price);
  if(photoEl)photoEl.textContent=isHidePrice?'':money(theme.photoPrice);
  document.getElementById('choose-photo').hidden=!theme.demoPhoto;
  document.getElementById('choose-no-photo').querySelector('strong').textContent=theme.demoPhoto?'Tanpa Foto':'Lihat contoh tema';
  document.getElementById('choose-no-photo').querySelector('small').textContent=theme.demoPhoto?'Desain undangan tanpa foto mempelai →':'Lihat tampilan undangan ini →';
  const initialUrl=theme.demo||theme.demoPhoto;
  const initialHelp=document.getElementById('preview-help-open-tab');
  if(initialHelp&&initialUrl)initialHelp.href=initialUrl;
  const initialTab=document.getElementById('preview-open-tab');
  if(initialTab&&initialUrl)initialTab.href=initialUrl;

  previousPreviewFocus=document.activeElement;
  previewOverlay.hidden=false;
  previewOverlay.scrollTop=0;
  document.body.classList.add('preview-open');

  if(!theme.demoPhoto){
    loadPreview(false);
    return;
  }

  showChoices();
  document.getElementById('choose-no-photo').focus({preventScroll:true});
}
function loadPreview(photo){
  clearTimeout(previewTimer);
  const url=photo?previewTheme?.demoPhoto:previewTheme?.demo;
  if(!url)return;
  if(siteSettings.previewMode==='new_tab'){
    closePreviewModal();
    openDemoUrl(url);
    return;
  }
  previewVersion=photo?'Dengan Foto':previewTheme.demoPhoto?'Tanpa Foto':'Contoh Tema';
  document.getElementById('preview-choice').hidden=true;
  document.getElementById('preview-viewer').hidden=false;
  if(previewLoader)previewLoader.hidden=false;

  if(previewTheme.demoPhoto){
    variantToggle.hidden=false;
    toggleNoPhoto.classList.toggle('active',!photo);
    togglePhoto.classList.toggle('active',Boolean(photo));
    previewVariant.textContent=isHidePrice?previewVersion:money(photo?previewTheme.photoPrice:previewTheme.price);
  }else{
    variantToggle.hidden=true;
    previewVariant.textContent=isHidePrice?'Contoh Desain':('Contoh Tema · '+money(previewTheme.price));
  }

  document.getElementById('preview-status').textContent='Memuat contoh undangan…';
  frame.title='Contoh '+previewTheme.name+' — '+previewVersion+' (tampilan HP)';
  const allowedPreviewHosts=['by.galipatstory.id','by.galipat-story.com','inv.galipat-story.com'];
  frame.src=allowedPreviewHosts.includes(new URL(url).hostname)?'/invitation-preview?theme='+encodeURIComponent(previewTheme.id)+'&version='+(photo?'photo':'plain'):url;
  const buy=document.getElementById('preview-buy');
  buy.href=wa(`${previewTheme.name} (${previewTheme.category}) — ${previewVersion}`);
  buy.dataset.theme=previewTheme.name;
  const openTab=document.getElementById('preview-open-tab');
  if(openTab)openTab.href=url;
  const helpOpenTab=document.getElementById('preview-help-open-tab');
  if(helpOpenTab)helpOpenTab.href=url;
  previewTimer=setTimeout(()=>{document.getElementById('preview-status').textContent='Contoh disediakan oleh server undangan. Jika belum tampil, coba muat ulang.';},15000);
}
frame.addEventListener('load',()=>{
  if(!frame.getAttribute('src'))return;
  clearTimeout(previewTimer);
  if(previewLoader)previewLoader.hidden=true;
  document.getElementById('preview-status').textContent='Tampilan HP · Gulir di dalam undangan untuk menjelajah.';
});
document.getElementById('choose-no-photo').onclick=()=>loadPreview(false);
document.getElementById('choose-photo').onclick=()=>loadPreview(true);
if(toggleNoPhoto)toggleNoPhoto.onclick=()=>{if(previewVersion!=='Tanpa Foto')loadPreview(false);};
if(togglePhoto)togglePhoto.onclick=()=>{if(previewVersion!=='Dengan Foto')loadPreview(true);};
if(previewFav)previewFav.onclick=()=>{if(previewTheme)toggleFavorite(previewTheme.id);};
document.getElementById('preview-switch').onclick=showChoices;
document.getElementById('preview-retry').onclick=()=>loadPreview(previewVersion==='Dengan Foto');
const helpOpenTab=document.getElementById('preview-help-open-tab');
if(helpOpenTab){
  helpOpenTab.onclick=(e)=>{
    e.preventDefault();
    const targetUrl=(previewVersion==='Dengan Foto'&&previewTheme?.demoPhoto)?previewTheme.demoPhoto:(previewTheme?.demo||helpOpenTab.getAttribute('href'));
    if(targetUrl&&targetUrl!=='#')openDemoUrl(targetUrl);
  };
}
const openTab=document.getElementById('preview-open-tab');
if(openTab){
  openTab.onclick=(e)=>{
    e.preventDefault();
    const targetUrl=(previewVersion==='Dengan Foto'&&previewTheme?.demoPhoto)?previewTheme.demoPhoto:(previewTheme?.demo||openTab.getAttribute('href'));
    if(targetUrl&&targetUrl!=='#')openDemoUrl(targetUrl);
  };
}
function closePreviewModal(){
  clearTimeout(previewTimer);
  if(previewLoader)previewLoader.hidden=true;
  frame.removeAttribute('src');
  previewOverlay.hidden=true;
  document.body.classList.remove('preview-open');
  previousPreviewFocus?.focus({preventScroll:true});
}
document.getElementById('preview-close').onclick=closePreviewModal;
previewOverlay.addEventListener('click',event=>{if(event.target===previewOverlay)closePreviewModal();});
document.addEventListener('keydown',event=>{
  if(previewOverlay.hidden)return;
  if(event.key==='Escape'){event.preventDefault();closePreviewModal();}
  if(event.key==='Tab'){
    const focusable=[...previewDialog.querySelectorAll('button,a[href],iframe')].filter(el=>el.getClientRects().length&&!el.disabled);
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});
window.addEventListener('message',event=>{if(event.source===frame.contentWindow&&event.data?.type==='gs-preview-close')closePreviewModal();});

function fitPhone(){
  const shell=document.querySelector('.phone-shell');
  if(!shell||document.getElementById('preview-viewer').hidden)return;
  const baseWidth=440;
  const parentWidth=shell.parentElement?shell.parentElement.clientWidth:390;
  const maxAvailableWidth=Math.min(380,parentWidth-8);
  const maxAvailableHeight=Math.min(620,window.innerHeight-240);
  const scale=maxAvailableWidth/baseWidth;
  const finalWidth=Math.round(baseWidth*scale);
  const finalHeight=Math.max(480,Math.min(maxAvailableHeight,Math.round(900*scale)));
  const internalHeight=Math.round(finalHeight/scale);
  shell.style.width=finalWidth+'px';
  shell.style.height=finalHeight+'px';
  shell.style.position='relative';
  shell.style.overflow='hidden';
  frame.style.width=baseWidth+'px';
  frame.style.height=internalHeight+'px';
  frame.style.transform=`scale(${scale})`;
  frame.style.transformOrigin='top left';
  const rect=shell.getBoundingClientRect();
  const x=rect.left-(parseFloat(shell.style.left)||0);
  const y=rect.top-(parseFloat(shell.style.top)||0);
  shell.style.left=(Math.round(x)-x)+'px';
  shell.style.top=(Math.round(y)-y)+'px';
}
new ResizeObserver(fitPhone).observe(previewDialog);
window.addEventListener('resize',fitPhone);
document.getElementById('choose-photo').addEventListener('click',fitPhone);
document.getElementById('choose-no-photo').addEventListener('click',fitPhone);
if(toggleNoPhoto)toggleNoPhoto.addEventListener('click',fitPhone);
if(togglePhoto)togglePhoto.addEventListener('click',fitPhone);

document.querySelectorAll('.reveal, .reveal-scale').forEach(el=>{
  if(revealObserver)revealObserver.observe(el);
  else el.classList.add('revealed');
});

const heroCard=document.getElementById('hero-visual-card');
const heroMockup=document.querySelector('.hero-mockup-img');
if(heroCard&&heroMockup&&window.matchMedia('(hover: hover)').matches){
  heroCard.addEventListener('mousemove',e=>{
    const rect=heroCard.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width-0.5;
    const y=(e.clientY-rect.top)/rect.height-0.5;
    heroMockup.style.animation='none';
    heroMockup.style.transform=`perspective(800px) rotateY(${x*12}deg) rotateX(${-y*12}deg) translateY(-4px)`;
  });
  heroCard.addEventListener('mouseleave',()=>{
    heroMockup.style.transform='';
    heroMockup.style.animation='';
  });
}

// ==========================================
// Recent Sales Social Proof Toast (250 Pool, 7-Day Partition)
// ==========================================
(function initSalesToast(){
  const toastEl = document.getElementById('sales-toast');
  if(!toastEl) return;

  const closeBtn = document.getElementById('sales-toast-close');
  const imgEl = document.getElementById('sales-toast-img');
  const nameEl = document.getElementById('sales-toast-name');
  const cityEl = document.getElementById('sales-toast-city');
  const themeEl = document.getElementById('sales-toast-theme');
  const timeEl = document.getElementById('sales-toast-time');

  let salesList = [];
  let currentSale = null;
  let toastTimer = null;
  let nextCycleTimer = null;

  const STORAGE_KEY = 'gs_seen_sales_v1';
  const DISMISSED_KEY = 'gs_sales_dismissed';

  function getSeenList(){
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(_) { return []; }
  }

  function recordSeen(id){
    try {
      const seen = getSeenList();
      if(!seen.includes(id)){
        seen.push(id);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
      }
    } catch(_) {}
  }

  function isDismissed(){
    try {
      const until = sessionStorage.getItem(DISMISSED_KEY);
      return until && Number(until) > Date.now();
    } catch(_) { return false; }
  }

  function dismissToast(){
    hideToast();
    try {
      // Pause for 10 minutes if user closes it manually
      sessionStorage.setItem(DISMISSED_KEY, String(Date.now() + 10 * 60 * 1000));
    } catch(_) {}
    if(nextCycleTimer) clearTimeout(nextCycleTimer);
  }

  function hideToast(){
    if(!toastEl) return;
    toastEl.classList.remove('show');
    if(toastTimer){
      clearTimeout(toastTimer);
      toastTimer = null;
    }
  }

  function showNextSale(){
    if(isDismissed() || !salesList.length) return;
    // Don't show toast if user currently has the preview modal open
    if(document.body.classList.contains('preview-open')){
      scheduleNext(10000);
      return;
    }

    // Filter today's day (0 = Sunday .. 6 = Saturday)
    const todayDay = new Date().getDay();
    const todaysPool = salesList.filter(s => s.day === todayDay);
    const pool = todaysPool.length ? todaysPool : salesList;

    const seen = getSeenList();
    let candidates = pool.filter(s => !seen.includes(s.id));

    // If all shown in this session, reset session seen tracker so rotation seamlessly continues
    if(candidates.length === 0){
      try { sessionStorage.removeItem(STORAGE_KEY); } catch(_) {}
      candidates = [...pool];
    }

    // Pick random candidate from unseen pool
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    if(!selected) return;

    currentSale = selected;
    recordSeen(selected.id);

    // Populate data
    imgEl.src = selected.themeImage;
    imgEl.alt = selected.themeName;
    nameEl.textContent = selected.name;
    cityEl.textContent = selected.city ? ` · ${selected.city}` : '';
    themeEl.textContent = selected.themeName;
    timeEl.textContent = selected.timeAgo || 'Baru saja';

    toastEl.hidden = false;
    requestAnimationFrame(()=>{
      toastEl.classList.add('show');
    });

    // Keep visible for 5.5 seconds
    toastTimer = setTimeout(()=>{
      hideToast();
      // Schedule next between 15s and 25s
      const delayNext = Math.floor(Math.random() * 10000) + 15000;
      scheduleNext(delayNext);
    }, 5500);
  }

  function scheduleNext(delayMs){
    if(nextCycleTimer) clearTimeout(nextCycleTimer);
    nextCycleTimer = setTimeout(showNextSale, delayMs);
  }

  // Toast card click - open theme preview or scroll to theme
  toastEl.addEventListener('click', (e)=>{
    if(e.target.closest('#sales-toast-close')) return;
    if(!currentSale) return;

    const matchingTheme = themes.find(t => t.id === currentSale.themeId || t.name.toLowerCase() === currentSale.themeName.toLowerCase());
    if(matchingTheme && typeof openPreview === 'function'){
      openPreview(matchingTheme);
    } else {
      const temaSection = document.getElementById('tema');
      if(temaSection) temaSection.scrollIntoView({ behavior: 'smooth' });
    }
  });

  if(closeBtn){
    closeBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      dismissToast();
    });
  }

  // Fetch sales dataset and start with realistic human delay (7.5s)
  fetch('/sales-data.json')
    .then(res => res.json())
    .then(data => {
      if(Array.isArray(data) && data.length){
        salesList = data;
        // Natural human delay: 7.5 seconds after initial entry
        scheduleNext(7500);
      }
    })
    .catch(() => {});
})();
