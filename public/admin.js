const $=s=>document.querySelector(s);let themes=[],categories=[],settings={previewMode:'new_tab'},analyticsData=null,activeAnalyticsPage='all',selectedMonthKey='',limit=40;const form=$('#theme-form'),dialog=$('#editor'),catDialog=$('#category-dialog'),catForm=$('#category-form');
async function api(url,method='GET',data){const res=await fetch(url,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const json=await res.json();if(!res.ok)throw Object.assign(Error(json.error||'Permintaan gagal.'),{status:res.status});return json;}
function setText(selectorOrEl,text){const el=typeof selectorOrEl==='string'?$(selectorOrEl):selectorOrEl;if(el)el.textContent=text===undefined||text===null?'':text;}
function notice(s){setText('#notice',s);}
function fmtNum(n){return Number(n||0).toLocaleString('id-ID');}
function fmtTime(ts){if(!ts)return '—';try{return new Date(ts).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch{return '—';}}
function getCategoryNames(){const set=new Set();categories.forEach(c=>{if(c.name)set.add(c.name)});themes.forEach(t=>{if(t.category)set.add(t.category)});return Array.from(set)}
function renderCategories(preferredSelected){const sel=$('#theme-category-select');if(sel){const currentVal=preferredSelected||sel.value||'Eksklusif';sel.replaceChildren();const names=getCategoryNames();for(const name of names){const opt=document.createElement('option');opt.value=name;opt.textContent=name;sel.append(opt)}sel.value=names.includes(currentVal)?currentVal:(names[0]||'')}const listEl=$('#existing-cat-list');if(listEl){listEl.replaceChildren();const names=getCategoryNames();names.forEach(name=>{const li=document.createElement('li');const info=document.createElement('div');const span=document.createElement('span');span.textContent=name;info.append(span);const catObj=categories.find(c=>c.name===name);if(catObj?.note){const note=document.createElement('small');note.textContent=catObj.note;info.append(note)}li.append(info);const right=document.createElement('div');right.style.display='flex';right.style.alignItems='center';right.style.gap='10px';const count=themes.filter(t=>t.category===name).length;const countBadge=document.createElement('small');countBadge.textContent=`${count} tema`;countBadge.style.color='#68736b';right.append(countBadge);if(catObj){const delBtn=document.createElement('button');delBtn.type='button';delBtn.className='del-cat-btn';delBtn.textContent='Hapus ×';delBtn.title=`Hapus kategori "${name}"`;delBtn.onclick=async()=>{if(!confirm(`Hapus kategori "${name}"?`))return;try{await api(`/api/admin/categories/${encodeURIComponent(catObj.id||catObj.name)}`,'DELETE');categories=categories.filter(c=>c.name!==name&&c.id!==catObj.id);renderCategories();notice(`Kategori "${name}" berhasil dihapus.`);}catch(e){notice(e.message)}};right.append(delBtn)}li.append(right);listEl.append(li)})}}
async function fetchAnalyticsSummary(){try{return await api('/api/admin/ringkasan');}catch{return await api('/api/admin/analytics');}}
async function load(){try{[themes,categories,settings,analyticsData]=await Promise.all([api('/api/admin/themes'),api('/api/admin/categories').catch(()=>[]),api('/api/admin/settings').catch(()=>({previewMode:'new_tab'})),fetchAnalyticsSummary().catch(()=>null)]);const loginEl=$('#login'),dashEl=$('#dashboard');if(loginEl)loginEl.hidden=true;if(dashEl)dashEl.hidden=false;renderCategories();renderSettings();renderAnalytics();render();notice('');}catch(e){const loginEl=$('#login'),dashEl=$('#dashboard');if(loginEl)loginEl.hidden=false;if(dashEl)dashEl.hidden=true;if(e.status===401){notice('');}else{console.error(e);notice(e.message||'Gagal memuat admin.');}}}
function renderSettings(){const mode=settings?.previewMode||'new_tab';const radio=$(`#settings-form input[name="previewMode"][value="${mode}"]`);if(radio)radio.checked=true;}
function getActiveMonthData(){if(!analyticsData)return null;if(!selectedMonthKey&&analyticsData.currentMonth)selectedMonthKey=analyticsData.currentMonth;return analyticsData.months?.[selectedMonthKey]||{label:'Bulan Ini',isCurrent:true,pages:analyticsData.pages||{}};}
function render(){const searchInput=$('#admin-search');const q=searchInput?searchInput.value.toLowerCase():'';const bsOnly=$('#filter-bestseller-only')?.checked;const rows=themes.filter(t=>{const matchQ=(t.name+' '+t.category).toLowerCase().includes(q);const matchBs=!bsOnly||(t.bestseller||t.featured);return matchQ&&matchBs;});const bsCount=themes.filter(t=>t.bestseller||t.featured).length;const monthData=getActiveMonthData();const uniqM=monthData?.pages?.all?.uniqueMonthly||0;const waAll=monthData?.pages?.all?.totalWaClicks||0;setText('#stats',`${themes.length} tema · ${themes.filter(t=>t.active).length} ditampilkan · ${bsCount} bestseller · 👥 ${fmtNum(uniqM)} unik (${monthData?.label||'1 bln'}) · 💬 ${fmtNum(waAll)} klik WA`);const rowsEl=$('#rows');if(rowsEl){rowsEl.replaceChildren();for(const t of rows.slice(0,limit)){const tr=document.createElement('tr');const name=document.createElement('td');const img=document.createElement('img');img.src=t.image;img.alt='';img.loading='lazy';name.append(img,document.createTextNode(t.name));tr.append(name);for(const value of [t.category,'Rp'+t.price.toLocaleString('id-ID')]){const td=document.createElement('td');td.textContent=value;tr.append(td)}const tdBestseller=document.createElement('td');const bsBtn=document.createElement('button');const isBs=!!(t.bestseller||t.featured);bsBtn.className='badge-bs '+(isBs?'':'off');bsBtn.textContent=isBs?'⭐ Bestseller':'☆ Bukan';bsBtn.title='Klik untuk ubah status Bestseller';bsBtn.onclick=async()=>{try{const res=await api(`/api/admin/themes/${encodeURIComponent(t.id)}/toggle-bestseller`,'POST');t.bestseller=res.bestseller;render()}catch(e){notice(e.message)}};tdBestseller.append(bsBtn);tr.append(tdBestseller);const tdStatus=document.createElement('td');tdStatus.textContent=t.active?'Aktif':'Tersembunyi';tr.append(tdStatus);const td=document.createElement('td');const b=document.createElement('button');b.className='button outline small';b.textContent='Edit';b.setAttribute('aria-label','Edit '+t.name);b.onclick=()=>edit(t);td.append(b);tr.append(td);rowsEl.append(tr)}}const lm=$('#load-more');if(lm)lm.hidden=rows.length<=limit;}

function renderAnalytics(){
  if(!analyticsData){
    const compBody=$('#analytics-pages-rows');
    if(compBody){
      compBody.replaceChildren();
      const tr=document.createElement('tr');
      const td=document.createElement('td');
      td.colSpan=8;
      td.style.color='#b42318';
      td.style.fontWeight='600';
      td.textContent='⚠️ Mesin server Node.js di VPS belum di-restart sejak update terakhir. Silakan jalankan perintah restart di Termux agar pencatatan pengunjung aktif.';
      tr.append(td);
      compBody.append(tr);
    }
    return;
  }
  const monthData=getActiveMonthData();
  if(!monthData||!monthData.pages)return;
  const pages=monthData.pages;
  const current=pages[activeAnalyticsPage]||pages.all;
  const isCurrent=!!monthData.isCurrent;

  const monthPills=$('#analytics-month-pills');
  if(monthPills&&analyticsData.availableMonths){
    monthPills.replaceChildren();
    for(const m of analyticsData.availableMonths){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='month-pill-btn'+(m.key===selectedMonthKey?' active':'');
      const dot=document.createElement('span');
      dot.className='month-dot';
      const lbl=document.createElement('span');
      lbl.textContent=m.label;
      btn.append(dot,lbl);
      btn.onclick=()=>{
        selectedMonthKey=m.key;
        renderAnalytics();
        render();
      };
      monthPills.append(btn);
    }
  }

  setText('#analytics-month-title',monthData.label);
  setText('#analytics-active-month-label',monthData.label);
  setText('#analytics-comp-month-badge',monthData.label);
  setText('#analytics-active-page-label',current.label);
  setText('#analytics-updated-at','Diperbarui: '+fmtTime(analyticsData.updatedAt));
  setText('#analytics-daily-sub',`Rincian tanggal 1 s/d ${current.daysInPeriod||30} pada ${monthData.label}`);

  document.querySelectorAll('.analytics-tab').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.page===activeAnalyticsPage);
  });

  const compBody=$('#analytics-pages-rows');
  if(compBody){
    compBody.replaceChildren();
    const order=[
      {key:'home',icon:'🏠',title:'Halaman Utama (/)',sub:'Landing page utama'},
      {key:'web',icon:'💌',title:'Web Invitation (/web-invitation)',sub:'Landing page khusus tanpa harga'},
      {key:'tema',icon:'🎨',title:'Katalog Tema (/tema)',sub:'Halaman katalog pilihan produk'},
      {key:'all',icon:'🌐',title:'Semua Halaman (Gabungan)',sub:'Total seluruh website'}
    ];
    for(const item of order){
      const pData=pages[item.key];
      if(!pData)continue;
      const tr=document.createElement('tr');
      if(activeAnalyticsPage===item.key)tr.className='active-row';
      tr.onclick=()=>{activeAnalyticsPage=item.key;renderAnalytics();};

      const tdName=document.createElement('td');
      const strong=document.createElement('strong');
      strong.textContent=`${item.icon} ${item.title}`;
      const small=document.createElement('small');
      small.style.display='block';
      small.style.color='#68736b';
      small.textContent=item.sub;
      tdName.append(strong,small);

      const tdMonthly=document.createElement('td');
      const pillM=document.createElement('span');
      pillM.className='pill-num';
      pillM.textContent=`${fmtNum(pData.uniqueMonthly)} orang`;
      tdMonthly.append(pillM);

      const tdAvg=document.createElement('td');
      tdAvg.textContent=`${fmtNum(pData.avgDailyVisitors)} orang`;

      const tdToday=document.createElement('td');
      tdToday.textContent=isCurrent?`${fmtNum(pData.uniqueToday)} orang`:'—';

      const tdViews=document.createElement('td');
      tdViews.textContent=`${fmtNum(pData.totalPageviews)}x dibuka`;

      const tdWaUniq=document.createElement('td');
      tdWaUniq.textContent=`${fmtNum(pData.uniqueWaClickers)} orang`;

      const tdWaTotal=document.createElement('td');
      const pillWa=document.createElement('span');
      pillWa.className='pill-num wa';
      pillWa.textContent=`${fmtNum(pData.totalWaClicks)} klik`;
      tdWaTotal.append(pillWa);

      const tdConv=document.createElement('td');
      tdConv.textContent=`${pData.conversionRate}%`;

      tr.append(tdName,tdMonthly,tdAvg,tdToday,tdViews,tdWaUniq,tdWaTotal,tdConv);
      compBody.append(tr);
    }
  }

  setText('#kpi-unique-monthly',fmtNum(current.uniqueMonthly));
  setText('#kpi-unique-monthly-label',isCurrent?'Pengunjung Unik Bulan Ini':'Pengunjung Unik Bulan Lalu');
  setText('#kpi-unique-monthly-note',isCurrent?'Jika user refresh atau buka lagi di bulan ini, tetap dihitung 1 orang.':'Total pengunjung unik terdeduplikasi pada bulan lalu.');

  setText('#kpi-unique-today',isCurrent?fmtNum(current.uniqueToday):fmtNum(current.avgDailyVisitors));
  setText('#kpi-unique-today-label',isCurrent?'Pengunjung Unik Hari Ini':'Rata-rata Pengunjung / Hari');
  setText('#kpi-unique-avg',isCurrent?(`Rata-rata: ${fmtNum(current.avgDailyVisitors)} orang unik / hari`):(`Periode: ${current.daysInPeriod} hari penuh`));

  setText('#kpi-total-views',fmtNum(current.totalPageviews));
  setText('#kpi-views-today',isCurrent?(`Hari ini: ${fmtNum(current.viewsToday)}x dibuka (termasuk refresh)`):'Total buka & refresh selama sebulan');

  setText('#kpi-wa-clicks',fmtNum(current.totalWaClicks));
  setText('#kpi-wa-conversion',`${fmtNum(current.uniqueWaClickers)} orang unik klik WA · Konversi ${current.conversionRate}%`);

  const locBody=$('#analytics-location-rows');
  if(locBody){
    locBody.replaceChildren();
    const locs=current.locations||[];
    if(!locs.length){
      const tr=document.createElement('tr');
      const td=document.createElement('td');
      td.colSpan=4;
      td.style.color='#68736b';
      td.textContent='Belum ada klik tombol WhatsApp pada halaman & periode ini.';
      tr.append(td);
      locBody.append(tr);
    }else{
      const totalLocClicks=Math.max(1,current.totalWaClicks||1);
      for(const loc of locs){
        const pct=Math.round((loc.totalClicks/totalLocClicks)*100);
        const tr=document.createElement('tr');
        const tdLabel=document.createElement('td');
        const b=document.createElement('strong');
        b.textContent=loc.label;
        tdLabel.append(b);

        const tdUniq=document.createElement('td');
        tdUniq.textContent=`${fmtNum(loc.uniqueClickers)} orang`;

        const tdTotal=document.createElement('td');
        const badge=document.createElement('span');
        badge.className='pill-num wa';
        badge.textContent=`${fmtNum(loc.totalClicks)} klik`;
        tdTotal.append(badge);

        const tdPct=document.createElement('td');
        const wrap=document.createElement('div');
        wrap.className='bar-mini-wrap';
        const bar=document.createElement('div');
        bar.className='bar-mini';
        const fill=document.createElement('div');
        fill.className='bar-mini-fill';
        fill.style.width=`${Math.min(100,pct)}%`;
        bar.append(fill);
        const spanPct=document.createElement('span');
        spanPct.textContent=`${pct}%`;
        wrap.append(bar,spanPct);
        tdPct.append(wrap);

        tr.append(tdLabel,tdUniq,tdTotal,tdPct);
        locBody.append(tr);
      }
    }
  }

  const dailyBody=$('#analytics-daily-rows');
  if(dailyBody){
    dailyBody.replaceChildren();
    const days=current.dailyTrend||[];
    if(!days.length){
      const tr=document.createElement('tr');
      const td=document.createElement('td');
      td.colSpan=5;
      td.style.color='#68736b';
      td.textContent='Belum ada catatan harian untuk bulan ini.';
      tr.append(td);
      dailyBody.append(tr);
    }else{
      for(const d of days){
        const tr=document.createElement('tr');
        const tdDate=document.createElement('td');
        tdDate.textContent=d.date;
        const tdUniq=document.createElement('td');
        tdUniq.textContent=`${fmtNum(d.uniqueVisitors)} orang`;
        const tdViews=document.createElement('td');
        tdViews.textContent=`${fmtNum(d.views)}x`;
        const tdWa=document.createElement('td');
        tdWa.textContent=`${fmtNum(d.waClicks)} klik`;
        const tdConv=document.createElement('td');
        tdConv.textContent=`${d.conversionRate}%`;
        tr.append(tdDate,tdUniq,tdViews,tdWa,tdConv);
        dailyBody.append(tr);
      }
    }
  }

  renderAnalyticsThemes();

  const recentBody=$('#analytics-recent-rows');
  if(recentBody){
    recentBody.replaceChildren();
    const recents=current.recentClicks||[];
    if(!recents.length){
      const tr=document.createElement('tr');
      const td=document.createElement('td');
      td.colSpan=4;
      td.style.color='#68736b';
      td.textContent='Belum ada riwayat aktivitas klik WhatsApp pada periode ini.';
      tr.append(td);
      recentBody.append(tr);
    }else{
      for(const r of recents){
        const tr=document.createElement('tr');
        const tdTime=document.createElement('td');
        tdTime.textContent=fmtTime(r.timestamp);
        const tdPage=document.createElement('td');
        const pageBadge=document.createElement('span');
        pageBadge.className='pill-page';
        pageBadge.textContent=r.page==='home'?'Utama (/)':r.page==='web'?'Web Invitation':'Katalog (/tema)';
        tdPage.append(pageBadge);
        const tdLoc=document.createElement('td');
        tdLoc.textContent=r.locationLabel||r.location;
        const tdTheme=document.createElement('td');
        const st=document.createElement('strong');
        st.textContent=r.theme;
        tdTheme.append(st);
        tr.append(tdTime,tdPage,tdLoc,tdTheme);
        recentBody.append(tr);
      }
    }
  }
}

function renderAnalyticsThemes(){
  const themeBody=$('#analytics-theme-rows');
  if(!themeBody||!analyticsData)return;
  const monthData=getActiveMonthData();
  if(!monthData||!monthData.pages)return;
  const current=monthData.pages[activeAnalyticsPage]||monthData.pages.all;
  const q=($('#analytics-theme-search')?.value||'').trim().toLowerCase();
  const list=(current.themes||[]).filter(item=>!q||(item.name+' '+item.category).toLowerCase().includes(q));
  themeBody.replaceChildren();
  if(!list.length){
    const tr=document.createElement('tr');
    const td=document.createElement('td');
    td.colSpan=8;
    td.style.color='#68736b';
    td.textContent=q?'Tidak ada tema/add-on yang cocok dengan pencarian.':'Belum ada tema atau add-on yang diklik pada halaman & periode ini.';
    tr.append(td);
    themeBody.append(tr);
    return;
  }
  for(const item of list){
    const tr=document.createElement('tr');
    const tdName=document.createElement('td');
    const st=document.createElement('strong');
    st.textContent=item.name;
    tdName.append(st);

    const tdCat=document.createElement('td');
    tdCat.textContent=item.category;

    const tdCard=document.createElement('td');
    tdCard.textContent=`${fmtNum(item.fromCard)}x`;

    const tdPrev=document.createElement('td');
    tdPrev.textContent=`${fmtNum(item.fromPreview)}x`;

    const tdOther=document.createElement('td');
    tdOther.textContent=`${fmtNum(item.fromOther)}x`;

    const tdUniq=document.createElement('td');
    tdUniq.textContent=`${fmtNum(item.uniqueClickers)} orang`;

    const tdTotal=document.createElement('td');
    const badge=document.createElement('span');
    badge.className='pill-num wa';
    badge.textContent=`${fmtNum(item.totalClicks)} klik`;
    tdTotal.append(badge);

    const tdLast=document.createElement('td');
    tdLast.textContent=fmtTime(item.lastClickedAt);

    tr.append(tdName,tdCat,tdCard,tdPrev,tdOther,tdUniq,tdTotal,tdLast);
    themeBody.append(tr);
  }
}

async function refreshAnalyticsData(){
  try{
    analyticsData=await fetchAnalyticsSummary();
    renderAnalytics();
    render();
  }catch(e){
    renderAnalytics();
    notice('Gagal memuat statistik (pastikan server Node.js di VPS sudah di-restart): '+e.message);
  }
}

function edit(t){form.reset();form.elements.id.value=t?.id||'';renderCategories(t?.category||'Eksklusif');for(const key of ['name','category','price','photoPrice','demo','demoPhoto','image','note'])form.elements[key].value=t?.[key]??(key==='category'?'Eksklusif':'');form.elements.active.checked=t?t.active:true;form.elements.bestseller.checked=!!(t?.bestseller??t?.featured);form.elements.featured.checked=!!t?.featured;setText('#editor-title',t?'Edit '+t.name:'Tambah tema');setText('#editor-message','');preview();dialog.showModal()}
function preview(){const src=form.elements.image.value;const prevEl=$('#image-preview');if(prevEl){prevEl.hidden=!src;if(src)prevEl.src=src;}}
function openCategoryModal(){catForm.reset();setText('#cat-message','');renderCategories();catDialog.showModal()}
const loginFormEl=$('#login-form');
if(loginFormEl){
  loginFormEl.onsubmit=async e=>{
    e.preventDefault();
    const b=e.submitter||e.target.querySelector('button');
    if(b)b.disabled=true;
    notice('');
    try{
      await api('/api/login','POST',Object.fromEntries(new FormData(e.target)));
      e.target.reset();
      notice('');
      await load();
    }catch(err){
      notice(err.message||'Gagal masuk.');
    }finally{
      if(b)b.disabled=false;
    }
  };
}
$('#logout').onclick=async()=>{try{await api('/api/logout','POST',{});await load()}catch(e){notice(e.message)}};
$('#new').onclick=()=>edit();$('#close').onclick=()=>dialog.close();$('#new-cat-btn').onclick=openCategoryModal;$('#btn-quick-cat').onclick=openCategoryModal;$('#cat-close').onclick=()=>catDialog.close();

const btnAnalytics=$('#btn-analytics');
const analyticsPanel=$('#analytics-panel');
if(btnAnalytics&&analyticsPanel){
  btnAnalytics.onclick=async()=>{
    const willOpen=analyticsPanel.hidden;
    analyticsPanel.hidden=!willOpen;
    btnAnalytics.classList.toggle('active',willOpen);
    btnAnalytics.textContent=willOpen?'📊 Sembunyikan Statistik':'📊 Lihat Statistik & Analitik';
    if(willOpen){
      await refreshAnalyticsData();
      analyticsPanel.scrollIntoView({behavior:'smooth',block:'start'});
    }
  };
}
const closeAnalyticsBtn=$('#close-analytics');
if(closeAnalyticsBtn&&analyticsPanel&&btnAnalytics){
  closeAnalyticsBtn.onclick=()=>{
    analyticsPanel.hidden=true;
    btnAnalytics.classList.remove('active');
    btnAnalytics.textContent='📊 Lihat Statistik & Analitik';
  };
}
const refreshAnalyticsBtn=$('#refresh-analytics');
if(refreshAnalyticsBtn){
  refreshAnalyticsBtn.onclick=async()=>{
    refreshAnalyticsBtn.disabled=true;
    await refreshAnalyticsData();
    refreshAnalyticsBtn.disabled=false;
    notice('Data statistik & analitik berhasil dimuat ulang.');
  };
}
const resetAnalyticsBtn=$('#reset-analytics');
if(resetAnalyticsBtn){
  resetAnalyticsBtn.onclick=async()=>{
    if(!confirm('Yakin ingin mereset seluruh statistik pengunjung dan klik WhatsApp kembali ke 0?'))return;
    resetAnalyticsBtn.disabled=true;
    try{
      analyticsData=await api('/api/admin/ringkasan/reset','POST',{});
      renderAnalytics();
      render();
      notice('Statistik pengunjung dan klik WhatsApp berhasil direset.');
    }catch(e){
      notice(e.message);
    }finally{
      resetAnalyticsBtn.disabled=false;
    }
  };
}
document.querySelectorAll('.analytics-tab').forEach(btn=>{
  btn.onclick=()=>{
    activeAnalyticsPage=btn.dataset.page||'all';
    renderAnalytics();
  };
});
const analyticsThemeSearch=$('#analytics-theme-search');
if(analyticsThemeSearch){
  analyticsThemeSearch.oninput=()=>renderAnalyticsThemes();
}

catForm.onsubmit=async e=>{e.preventDefault();const saveBtn=$('#save-cat');saveBtn.disabled=true;$('#cat-message').textContent='';const data=Object.fromEntries(new FormData(catForm));try{const created=await api('/api/admin/categories','POST',data);categories.push(created);renderCategories(created.name);catDialog.close();notice(`Kategori "${created.name}" berhasil ditambahkan dan otomatis tampil di halaman utama!`);if(dialog.open){$('#theme-category-select').value=created.name}}catch(err){$('#cat-message').textContent=err.message}finally{saveBtn.disabled=false}};
$('#admin-search').oninput=()=>{limit=40;render()};
const bsFilter=$('#filter-bestseller-only');if(bsFilter)bsFilter.onchange=()=>{limit=40;render()};
$('#load-more').onclick=()=>{limit+=40;render()};form.elements.image.oninput=preview;
$('#upload').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>3e6){$('#editor-message').textContent='Gambar maksimal 3 MB.';return}$('#save').disabled=true;try{const image=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});const result=await api('/api/upload','POST',{image});form.elements.image.value=result.url;preview();$('#editor-message').textContent='Gambar terunggah. Simpan tema untuk menayangkannya.'}catch(err){$('#editor-message').textContent=err.message}finally{$('#save').disabled=false}};
form.onsubmit=async e=>{e.preventDefault();$('#save').disabled=true;const t=Object.fromEntries(new FormData(form));t.price=Number(t.price);t.photoPrice=Number(t.photoPrice);t.active=form.elements.active.checked;t.featured=form.elements.featured.checked;t.bestseller=form.elements.bestseller.checked;try{await api('/api/admin/themes',t.id?'PUT':'POST',t);dialog.close();notice('Tema tersimpan. Perubahan sudah tersedia di website.');await load()}catch(err){$('#editor-message').textContent=err.message}finally{$('#save').disabled=false}};
$('#password-form').onsubmit=async e=>{e.preventDefault();try{await api('/api/password','POST',Object.fromEntries(new FormData(e.target)));e.target.reset();notice('Kata sandi diperbarui. Masuk kembali menggunakan kata sandi baru.');await load()}catch(err){notice(err.message)}};const settingsForm=$('#settings-form');
if(settingsForm){
  settingsForm.onsubmit=async e=>{
    e.preventDefault();
    const btn=$('#save-settings-btn');
    const noticeEl=$('#settings-save-notice');
    btn.disabled=true;
    if(noticeEl)noticeEl.textContent='Menyimpan…';
    try{
      const formData=new FormData(settingsForm);
      const previewMode=formData.get('previewMode')||'new_tab';
      const updated=await api('/api/admin/settings','POST',{previewMode});
      settings=updated;
      renderSettings();
      if(noticeEl){
        noticeEl.textContent='✓ Pengaturan berhasil disimpan!';
        setTimeout(()=>{if(noticeEl)noticeEl.textContent='';},4000);
      }
      notice('Pengaturan pratinjau disimpan. Sekarang contoh tema akan '+(previewMode==='new_tab'?'langsung dibuka di tab baru.':'dibuka di pop-up HP.'));
    }catch(err){
      if(noticeEl)noticeEl.textContent='Gagal: '+err.message;
    }finally{
      btn.disabled=false;
    }
  };
}
load();
