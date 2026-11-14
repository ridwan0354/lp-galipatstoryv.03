const $=s=>document.querySelector(s);
let themes=[],categories=[],settings={previewMode:'new_tab'},analyticsData=null,activeAnalyticsPage='all',selectedMonthKey='',activeMainTab='catalog',activeSecFilter='all',limit=40;
const form=$('#theme-form'),dialog=$('#editor'),catDialog=$('#category-dialog'),catForm=$('#category-form');

async function api(url,method='GET',data){
  const res=await fetch(url,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  const json=await res.json();
  if(!res.ok)throw Object.assign(Error(json.error||'Permintaan gagal.'),{status:res.status});
  return json;
}
function setText(selectorOrEl,text){
  const el=typeof selectorOrEl==='string'?$(selectorOrEl):selectorOrEl;
  if(el)el.textContent=text===undefined||text===null?'':text;
}
function notice(s){setText('#notice',s);}
function fmtNum(n){return Number(n||0).toLocaleString('id-ID');}
function fmtTime(ts){
  if(!ts)return '—';
  try{return new Date(ts).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
  catch{return '—';}
}

function getCategoryNames(){
  const set=new Set();
  categories.forEach(c=>{if(c.name)set.add(c.name);});
  themes.forEach(t=>{if(t.category)set.add(t.category);});
  return Array.from(set);
}

function renderCategories(preferredSelected){
  const sel=$('#theme-category-select');
  if(sel){
    const currentVal=preferredSelected||sel.value||'Eksklusif';
    sel.replaceChildren();
    const names=getCategoryNames();
    for(const name of names){
      const opt=document.createElement('option');
      opt.value=name;
      opt.textContent=name;
      sel.append(opt);
    }
    sel.value=names.includes(currentVal)?currentVal:(names[0]||'');
  }
  const listEl=$('#existing-cat-list');
  if(listEl){
    listEl.replaceChildren();
    const names=getCategoryNames();
    names.forEach(name=>{
      const li=document.createElement('li');
      const info=document.createElement('div');
      const span=document.createElement('span');
      span.textContent=name;
      info.append(span);
      const catObj=categories.find(c=>c.name===name);
      if(catObj?.note){
        const note=document.createElement('small');
        note.textContent=catObj.note;
        info.append(note);
      }
      li.append(info);
      const right=document.createElement('div');
      right.style.display='flex';
      right.style.alignItems='center';
      right.style.gap='10px';
      const count=themes.filter(t=>t.category===name).length;
      const countBadge=document.createElement('small');
      countBadge.textContent=`${count} tema`;
      countBadge.style.color='#68736b';
      right.append(countBadge);
      if(catObj){
        const delBtn=document.createElement('button');
        delBtn.type='button';
        delBtn.className='del-cat-btn';
        delBtn.textContent='Hapus ×';
        delBtn.title=`Hapus kategori "${name}"`;
        delBtn.onclick=async()=>{
          if(!confirm(`Hapus kategori "${name}"?`))return;
          try{
            await api(`/api/admin/categories/${encodeURIComponent(catObj.id||catObj.name)}`,'DELETE');
            categories=categories.filter(c=>c.name!==name&&c.id!==catObj.id);
            renderCategories();
            notice(`Kategori "${name}" berhasil dihapus.`);
          }catch(e){notice(e.message);}
        };
        right.append(delBtn);
      }
      li.append(right);
      listEl.append(li);
    });
  }
}

async function fetchAnalyticsSummary(){
  try{return await api('/api/admin/ringkasan');}
  catch{return await api('/api/admin/analytics');}
}

function switchMainTab(tabName){
  activeMainTab=tabName;
  const catSec=$('#catalog-section');
  const setSec=$('#settings-section');
  const anaSec=$('#analytics-panel');
  const btnAna=$('#btn-analytics');

  document.querySelectorAll('.admin-nav-tab').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.mainTab===tabName);
  });

  if(tabName==='analytics'){
    if(anaSec)anaSec.hidden=false;
    if(catSec)catSec.hidden=true;
    if(setSec)setSec.hidden=true;
    if(btnAna){
      btnAna.classList.add('active');
      btnAna.textContent='🎨 Kembali ke Katalog';
    }
    refreshAnalyticsData();
  }else if(tabName==='settings'){
    if(anaSec)anaSec.hidden=true;
    if(catSec)catSec.hidden=true;
    if(setSec)setSec.hidden=false;
    if(btnAna){
      btnAna.classList.remove('active');
      btnAna.textContent='📊 Lihat Statistik & Analitik';
    }
  }else{
    if(anaSec)anaSec.hidden=true;
    if(catSec)catSec.hidden=false;
    if(setSec)setSec.hidden=true;
    if(btnAna){
      btnAna.classList.remove('active');
      btnAna.textContent='📊 Lihat Statistik & Analitik';
    }
  }
}

function switchAnalyticsSectionFilter(secKey){
  activeSecFilter=secKey||'all';
  document.querySelectorAll('.subnav-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.secFilter===activeSecFilter);
  });
  document.querySelectorAll('.analytics-sec-group').forEach(group=>{
    group.hidden=(activeSecFilter!=='all'&&group.dataset.secGroup!==activeSecFilter);
  });
}

async function load(){
  try{
    [themes,categories,settings,analyticsData]=await Promise.all([
      api('/api/admin/themes'),
      api('/api/admin/categories').catch(()=>[]),
      api('/api/admin/settings').catch(()=>({previewMode:'new_tab'})),
      fetchAnalyticsSummary().catch(()=>null)
    ]);
    const loginEl=$('#login'),dashEl=$('#dashboard');
    if(loginEl)loginEl.hidden=true;
    if(dashEl)dashEl.hidden=false;
    renderCategories();
    renderSettings();
    renderAnalytics();
    render();
    switchMainTab(activeMainTab||'catalog');
    notice('');
  }catch(e){
    const loginEl=$('#login'),dashEl=$('#dashboard');
    if(loginEl)loginEl.hidden=false;
    if(dashEl)dashEl.hidden=true;
    if(e.status===401){notice('');}
    else{console.error(e);notice(e.message||'Gagal memuat admin.');}
  }
}

function renderSettings(){
  const mode=settings?.previewMode||'new_tab';
  const radio=$(`#settings-form input[name="previewMode"][value="${mode}"]`);
  if(radio)radio.checked=true;
}

function getActiveMonthData(){
  if(!analyticsData)return null;
  if(!selectedMonthKey&&analyticsData.currentMonth)selectedMonthKey=analyticsData.currentMonth;
  return analyticsData.months?.[selectedMonthKey]||{label:'Bulan Ini',isCurrent:true,pages:analyticsData.pages||{}};
}

function render(){
  const searchInput=$('#admin-search');
  const q=searchInput?searchInput.value.toLowerCase():'';
  const bsOnly=$('#filter-bestseller-only')?.checked;
  const rows=themes.filter(t=>{
    const matchQ=(t.name+' '+t.category).toLowerCase().includes(q);
    const matchBs=!bsOnly||(t.bestseller||t.featured);
    return matchQ&&matchBs;
  });
  const bsCount=themes.filter(t=>t.bestseller||t.featured).length;
  const monthData=getActiveMonthData();
  const uniqM=monthData?.pages?.all?.uniqueMonthly||0;
  const waAll=monthData?.pages?.all?.totalWaClicks||0;
  setText('#stats',`${themes.length} tema · ${themes.filter(t=>t.active).length} aktif · ${bsCount} bestseller · 👥 ${fmtNum(uniqM)} pengunjung unik (${monthData?.label||'Bulan Ini'}) · 💬 ${fmtNum(waAll)} klik WA`);

  const rowsEl=$('#rows');
  if(rowsEl){
    rowsEl.replaceChildren();
    for(const t of rows.slice(0,limit)){
      const tr=document.createElement('tr');
      const name=document.createElement('td');
      const img=document.createElement('img');
      img.src=t.image;
      img.alt='';
      img.loading='lazy';
      name.append(img,document.createTextNode(t.name));
      tr.append(name);
      for(const value of [t.category,'Rp'+t.price.toLocaleString('id-ID')]){
        const td=document.createElement('td');
        td.textContent=value;
        tr.append(td);
      }
      const tdBestseller=document.createElement('td');
      const bsBtn=document.createElement('button');
      const isBs=!!(t.bestseller||t.featured);
      bsBtn.className='badge-bs '+(isBs?'':'off');
      bsBtn.textContent=isBs?'⭐ Bestseller':'☆ Bukan';
      bsBtn.title='Klik untuk ubah status Bestseller';
      bsBtn.onclick=async()=>{
        try{
          const res=await api(`/api/admin/themes/${encodeURIComponent(t.id)}/toggle-bestseller`,'POST');
          t.bestseller=res.bestseller;
          render();
        }catch(e){notice(e.message);}
      };
      tdBestseller.append(bsBtn);
      tr.append(tdBestseller);
      const tdStatus=document.createElement('td');
      tdStatus.textContent=t.active?'Aktif':'Tersembunyi';
      tr.append(tdStatus);
      const td=document.createElement('td');
      const b=document.createElement('button');
      b.className='button outline small';
      b.textContent='Edit';
      b.setAttribute('aria-label','Edit '+t.name);
      b.onclick=()=>edit(t);
      td.append(b);
      tr.append(td);
      rowsEl.append(tr);
    }
  }
  const lm=$('#load-more');
  if(lm)lm.hidden=rows.length<=limit;
}

function emptyRow(tbody,colSpan,message){
  if(!tbody)return;
  tbody.replaceChildren();
  const tr=document.createElement('tr');
  const td=document.createElement('td');
  td.colSpan=colSpan;
  td.style.color='#68736b';
  td.textContent=message;
  tr.append(td);
  tbody.append(tr);
}

function renderMiniBar(pct){
  const wrap=document.createElement('div');
  wrap.className='bar-mini-wrap';
  const bar=document.createElement('div');
  bar.className='bar-mini';
  const fill=document.createElement('div');
  fill.className='bar-mini-fill';
  fill.style.width=`${Math.min(100,Math.max(0,pct))}%`;
  bar.append(fill);
  const spanPct=document.createElement('span');
  spanPct.textContent=`${pct}%`;
  wrap.append(bar,spanPct);
  return wrap;
}

function renderAnalytics(){
  if(!analyticsData){
    const compBody=$('#analytics-pages-rows');
    if(compBody){
      compBody.replaceChildren();
      const tr=document.createElement('tr');
      const td=document.createElement('td');
      td.colSpan=9;
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

  // Month Pills
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

  // 1. 3-Page Comparison Table
  const compBody=$('#analytics-pages-rows');
  if(compBody){
    compBody.replaceChildren();
    const order=[
      {key:'home',icon:'🏠',title:'Halaman Utama (/)',sub:'Landing page utama dengan harga'},
      {key:'web',icon:'💌',title:'Web Invitation (/web-invitation)',sub:'Landing page khusus tanpa harga'},
      {key:'tema',icon:'🎨',title:'Katalog Tema (/tema)',sub:'Halaman katalog pilihan produk'},
      {key:'all',icon:'🌐',title:'Semua Halaman (Gabungan)',sub:'Total gabungan seluruh website'}
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
      tdAvg.textContent=`${fmtNum(pData.avgDailyVisitors)} / hari`;

      const tdToday=document.createElement('td');
      tdToday.textContent=isCurrent?`${fmtNum(pData.uniqueToday)} orang`:'—';

      const tdViews=document.createElement('td');
      tdViews.textContent=`${fmtNum(pData.totalPageviews)}x`;

      const tdPrev=document.createElement('td');
      const pillPrev=document.createElement('span');
      pillPrev.className='pill-num prev';
      pillPrev.textContent=`${fmtNum(pData.totalPreviews||0)}x (${fmtNum(pData.uniquePreviewers||0)} org)`;
      tdPrev.append(pillPrev);

      const tdWaUniq=document.createElement('td');
      tdWaUniq.textContent=`${fmtNum(pData.uniqueWaClickers)} orang`;

      const tdWaTotal=document.createElement('td');
      const pillWa=document.createElement('span');
      pillWa.className='pill-num wa';
      pillWa.textContent=`${fmtNum(pData.totalWaClicks)} klik`;
      tdWaTotal.append(pillWa);

      const tdConv=document.createElement('td');
      tdConv.textContent=`${pData.conversionRate}%`;

      tr.append(tdName,tdMonthly,tdAvg,tdToday,tdViews,tdPrev,tdWaUniq,tdWaTotal,tdConv);
      compBody.append(tr);
    }
  }

  // 2. KPI Cards
  setText('#kpi-unique-monthly',fmtNum(current.uniqueMonthly));
  setText('#kpi-unique-monthly-label',isCurrent?'Pengunjung Unik Bulan Ini':'Pengunjung Unik Bulan Lalu');
  setText('#kpi-unique-monthly-note',isCurrent?'Jika user refresh atau buka lagi di bulan ini, tetap dihitung 1 orang.':'Total pengunjung unik terdeduplikasi pada bulan lalu.');

  setText('#kpi-unique-today',isCurrent?fmtNum(current.uniqueToday):fmtNum(current.avgDailyVisitors));
  setText('#kpi-unique-today-label',isCurrent?'Pengunjung Unik Hari Ini':'Rata-rata Pengunjung / Hari');
  setText('#kpi-unique-avg',isCurrent?(`Rata-rata: ${fmtNum(current.avgDailyVisitors)} orang unik / hari`):(`Periode: ${current.daysInPeriod} hari penuh`));

  setText('#kpi-total-views',fmtNum(current.totalPageviews));
  setText('#kpi-views-today',`🔍 ${fmtNum(current.totalPreviews||0)}x lihat contoh (${fmtNum(current.uniquePreviewers||0)} org) · Hari ini: ${fmtNum(current.viewsToday)}x buka`);

  setText('#kpi-wa-clicks',fmtNum(current.totalWaClicks));
  setText('#kpi-wa-conversion',`${fmtNum(current.uniqueWaClickers)} orang unik klik WA · Konversi ${current.conversionRate}%`);

  // 3. Regions / Wilayah Table
  const regBody=$('#analytics-region-rows');
  if(regBody){
    const regs=current.regions||[];
    if(!regs.length){
      emptyRow(regBody,5,'Belum ada data wilayah pengunjung pada periode ini.');
    }else{
      regBody.replaceChildren();
      for(const r of regs){
        const tr=document.createElement('tr');
        const tdReg=document.createElement('td');
        const st=document.createElement('strong');
        st.textContent=`📍 ${r.region}`;
        tdReg.append(st);

        const tdUniq=document.createElement('td');
        const pU=document.createElement('span');
        pU.className='pill-num';
        pU.textContent=`${fmtNum(r.uniqueVisitors)} orang`;
        tdUniq.append(pU);

        const tdViews=document.createElement('td');
        tdViews.textContent=`${fmtNum(r.totalViews)}x`;

        const tdWa=document.createElement('td');
        const pW=document.createElement('span');
        pW.className='pill-num wa';
        pW.textContent=`${fmtNum(r.totalWaClicks)} klik (${fmtNum(r.uniqueWaClickers)} org)`;
        tdWa.append(pW);

        const tdConv=document.createElement('td');
        tdConv.textContent=`${r.conversionRate}%`;

        tr.append(tdReg,tdUniq,tdViews,tdWa,tdConv);
        regBody.append(tr);
      }
    }
  }

  // 4. Devices / HP Table
  const devBody=$('#analytics-device-rows');
  if(devBody){
    const devs=current.devices||[];
    if(!devs.length){
      emptyRow(devBody,5,'Belum ada data perangkat / HP pengunjung pada periode ini.');
    }else{
      devBody.replaceChildren();
      for(const d of devs){
        const tr=document.createElement('tr');
        const tdDev=document.createElement('td');
        const st=document.createElement('strong');
        st.textContent=d.device;
        tdDev.append(st);

        const tdOs=document.createElement('td');
        const osBadge=document.createElement('span');
        const osLower=(d.osType||'').toLowerCase();
        osBadge.className='pill-os '+(osLower==='ios'?'ios':osLower==='android'?'android':'');
        osBadge.textContent=d.osType||'Perangkat';
        tdOs.append(osBadge);

        const tdUniq=document.createElement('td');
        tdUniq.textContent=`${fmtNum(d.uniqueVisitors)} orang`;

        const tdWa=document.createElement('td');
        const pW=document.createElement('span');
        pW.className='pill-num wa';
        pW.textContent=`${fmtNum(d.totalWaClicks)} klik`;
        tdWa.append(pW);

        const tdConv=document.createElement('td');
        tdConv.textContent=`${d.conversionRate}%`;

        tr.append(tdDev,tdOs,tdUniq,tdWa,tdConv);
        devBody.append(tr);
      }
    }
  }

  // 5. Traffic Sources / Sosmed & Ads Table
  const srcBody=$('#analytics-source-rows');
  if(srcBody){
    const srcs=current.sources||[];
    if(!srcs.length){
      emptyRow(srcBody,6,'Belum ada data sumber kedatangan pengunjung pada periode ini.');
    }else{
      srcBody.replaceChildren();
      for(const s of srcs){
        const tr=document.createElement('tr');
        const tdSrc=document.createElement('td');
        const st=document.createElement('strong');
        st.textContent=s.source;
        tdSrc.append(st);

        const tdUniq=document.createElement('td');
        const pU=document.createElement('span');
        pU.className='pill-num';
        pU.textContent=`${fmtNum(s.uniqueVisitors)} orang`;
        tdUniq.append(pU);

        const tdViews=document.createElement('td');
        tdViews.textContent=`${fmtNum(s.totalViews)}x dibuka`;

        const tdWaUniq=document.createElement('td');
        tdWaUniq.textContent=`${fmtNum(s.uniqueWaClickers)} orang`;

        const tdWaTotal=document.createElement('td');
        const pW=document.createElement('span');
        pW.className='pill-num wa';
        pW.textContent=`${fmtNum(s.totalWaClicks)} klik`;
        tdWaTotal.append(pW);

        const tdConv=document.createElement('td');
        tdConv.textContent=`${s.conversionRate}%`;

        tr.append(tdSrc,tdUniq,tdViews,tdWaUniq,tdWaTotal,tdConv);
        srcBody.append(tr);
      }
    }
  }

  // 6. Category Interest Table
  const catIntBody=$('#analytics-category-rows');
  if(catIntBody){
    const cats=current.categoryInterests||[];
    if(!cats.length){
      emptyRow(catIntBody,4,'Belum ada klik filter kategori pada halaman & periode ini.');
    }else{
      catIntBody.replaceChildren();
      const totalCatClicks=Math.max(1,cats.reduce((acc,x)=>acc+(x.totalClicks||0),0));
      for(const c of cats){
        const pct=Math.round(((c.totalClicks||0)/totalCatClicks)*100);
        const tr=document.createElement('tr');
        const tdName=document.createElement('td');
        const st=document.createElement('strong');
        st.textContent=c.category;
        tdName.append(st);

        const tdUniq=document.createElement('td');
        tdUniq.textContent=`${fmtNum(c.uniqueUsers)} orang`;

        const tdTotal=document.createElement('td');
        const pill=document.createElement('span');
        pill.className='pill-num';
        pill.textContent=`${fmtNum(c.totalClicks)}x difilter`;
        tdTotal.append(pill);

        const tdPct=document.createElement('td');
        tdPct.append(renderMiniBar(pct));

        tr.append(tdName,tdUniq,tdTotal,tdPct);
        catIntBody.append(tr);
      }
    }
  }

  // 7. WA Clicks by Button Location
  const locBody=$('#analytics-location-rows');
  if(locBody){
    const locs=current.locations||[];
    if(!locs.length){
      emptyRow(locBody,4,'Belum ada klik tombol WhatsApp pada halaman & periode ini.');
    }else{
      locBody.replaceChildren();
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
        tdPct.append(renderMiniBar(pct));

        tr.append(tdLabel,tdUniq,tdTotal,tdPct);
        locBody.append(tr);
      }
    }
  }

  // 8. Peak Hours Slot Table
  const hoursBody=$('#analytics-hours-rows');
  if(hoursBody){
    const slots=current.hourSlots||[];
    hoursBody.replaceChildren();
    for(const s of slots){
      const tr=document.createElement('tr');
      const tdLbl=document.createElement('td');
      const st=document.createElement('strong');
      st.textContent=s.label;
      tdLbl.append(st);

      const tdHrs=document.createElement('td');
      tdHrs.textContent=s.hours;

      const tdUniq=document.createElement('td');
      tdUniq.textContent=`${fmtNum(s.uniqueVisitors)} orang`;

      const tdViews=document.createElement('td');
      tdViews.textContent=`${fmtNum(s.views)}x`;

      const tdWa=document.createElement('td');
      const badge=document.createElement('span');
      badge.className='pill-num wa';
      badge.textContent=`${fmtNum(s.waClicks)} klik`;
      tdWa.append(badge);

      tr.append(tdLbl,tdHrs,tdUniq,tdViews,tdWa);
      hoursBody.append(tr);
    }
  }

  // 9. Daily Trend Table
  const dailyBody=$('#analytics-daily-rows');
  if(dailyBody){
    const days=current.dailyTrend||[];
    if(!days.length){
      emptyRow(dailyBody,6,'Belum ada catatan harian untuk bulan ini.');
    }else{
      dailyBody.replaceChildren();
      for(const d of days){
        const tr=document.createElement('tr');
        const tdDate=document.createElement('td');
        tdDate.textContent=d.date;
        const tdUniq=document.createElement('td');
        tdUniq.textContent=`${fmtNum(d.uniqueVisitors)} orang`;
        const tdViews=document.createElement('td');
        tdViews.textContent=`${fmtNum(d.views)}x`;
        const tdPrev=document.createElement('td');
        tdPrev.textContent=`${fmtNum(d.previews||0)}x`;
        const tdWa=document.createElement('td');
        tdWa.textContent=`${fmtNum(d.waClicks)} klik`;
        const tdConv=document.createElement('td');
        tdConv.textContent=`${d.conversionRate}%`;
        tr.append(tdDate,tdUniq,tdViews,tdPrev,tdWa,tdConv);
        dailyBody.append(tr);
      }
    }
  }

  // 10. Themes Funnel Table
  renderAnalyticsThemes();

  // 11. Recent Activity Log
  const recentBody=$('#analytics-recent-rows');
  if(recentBody){
    const recents=current.recentClicks||[];
    if(!recents.length){
      emptyRow(recentBody,6,'Belum ada riwayat aktivitas klik WhatsApp pada periode ini.');
    }else{
      recentBody.replaceChildren();
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

        const tdReg=document.createElement('td');
        tdReg.textContent=r.region?`📍 ${r.region}`:'📍 Indonesia (WIB)';

        const tdDev=document.createElement('td');
        const devSpan=document.createElement('span');
        devSpan.textContent=r.device||'📱 HP / Perangkat';
        const srcSmall=document.createElement('small');
        srcSmall.style.display='block';
        srcSmall.style.color='#68736b';
        srcSmall.textContent=r.source||'🌐 Browser';
        tdDev.append(devSpan,srcSmall);

        tr.append(tdTime,tdPage,tdLoc,tdTheme,tdReg,tdDev);
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
  const list=(current.themes||[]).filter(item=>!q||(item.name+' '+item.category+' '+(item.insight||'')).toLowerCase().includes(q));
  if(!list.length){
    emptyRow(themeBody,9,q?'Tidak ada tema/add-on yang cocok dengan pencarian.':'Belum ada tema atau add-on yang dilihat/diklik pada halaman & periode ini.');
    return;
  }
  themeBody.replaceChildren();
  for(const item of list){
    const tr=document.createElement('tr');
    const tdName=document.createElement('td');
    const st=document.createElement('strong');
    st.textContent=item.name;
    tdName.append(st);

    const tdCat=document.createElement('td');
    tdCat.textContent=item.category;

    const tdPrev=document.createElement('td');
    if(item.previewCount>0){
      const pBadge=document.createElement('span');
      pBadge.className='pill-num prev';
      pBadge.textContent=`${fmtNum(item.previewCount)}x (${fmtNum(item.uniquePreviewers)} org)`;
      tdPrev.append(pBadge);
    }else{
      tdPrev.textContent='—';
    }

    const tdVar=document.createElement('td');
    if((item.previewWithPhoto||0)>0||(item.previewNoPhoto||0)>0){
      tdVar.textContent=`📸 Foto: ${fmtNum(item.previewWithPhoto||0)} · 📄 Tanpa: ${fmtNum(item.previewNoPhoto||0)}`;
    }else{
      tdVar.textContent='—';
    }

    const tdCard=document.createElement('td');
    tdCard.textContent=`${fmtNum(item.fromCard)}x`;

    const tdPrevWa=document.createElement('td');
    tdPrevWa.textContent=`${fmtNum(item.fromPreview)}x`;

    const tdTotal=document.createElement('td');
    const badge=document.createElement('span');
    badge.className='pill-num wa';
    badge.textContent=`${fmtNum(item.totalClicks)} klik (${fmtNum(item.uniqueClickers)} org)`;
    tdTotal.append(badge);

    const tdInsight=document.createElement('td');
    const ins=document.createElement('span');
    const txt=item.insight||'📊 Mulai Dilihat';
    ins.className='pill-insight '+(txt.includes('🔥')?'hot':txt.includes('✅')?'good':txt.includes('👀')?'warn':'');
    ins.textContent=txt;
    tdInsight.append(ins);

    const tdLast=document.createElement('td');
    tdLast.textContent=fmtTime(item.lastClickedAt);

    tr.append(tdName,tdCat,tdPrev,tdVar,tdCard,tdPrevWa,tdTotal,tdInsight,tdLast);
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

function edit(t){
  form.reset();
  form.elements.id.value=t?.id||'';
  renderCategories(t?.category||'Eksklusif');
  for(const key of ['name','category','price','photoPrice','demo','demoPhoto','image','note']){
    form.elements[key].value=t?.[key]??(key==='category'?'Eksklusif':'');
  }
  form.elements.active.checked=t?t.active:true;
  form.elements.bestseller.checked=!!(t?.bestseller??t?.featured);
  form.elements.featured.checked=!!t?.featured;
  setText('#editor-title',t?'Edit '+t.name:'Tambah tema');
  setText('#editor-message','');
  preview();
  dialog.showModal();
}

function preview(){
  const src=form.elements.image.value;
  const prevEl=$('#image-preview');
  if(prevEl){
    prevEl.hidden=!src;
    if(src)prevEl.src=src;
  }
}

function openCategoryModal(){
  catForm.reset();
  setText('#cat-message','');
  renderCategories();
  catDialog.showModal();
}

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

$('#logout').onclick=async()=>{try{await api('/api/logout','POST',{});await load();}catch(e){notice(e.message);}};
$('#new').onclick=()=>edit();
$('#close').onclick=()=>dialog.close();
$('#new-cat-btn').onclick=openCategoryModal;
$('#btn-quick-cat').onclick=openCategoryModal;
$('#cat-close').onclick=()=>catDialog.close();

// Main Workspace Tabs
document.querySelectorAll('.admin-nav-tab').forEach(btn=>{
  btn.onclick=()=>switchMainTab(btn.dataset.mainTab||'catalog');
});

// Top Header Analytics Button
const btnAnalytics=$('#btn-analytics');
if(btnAnalytics){
  btnAnalytics.onclick=()=>{
    if(activeMainTab==='analytics')switchMainTab('catalog');
    else switchMainTab('analytics');
  };
}
const closeAnalyticsBtn=$('#close-analytics');
if(closeAnalyticsBtn){
  closeAnalyticsBtn.onclick=()=>switchMainTab('catalog');
}

// Section Sub-Navigation inside Analytics
document.querySelectorAll('.subnav-btn').forEach(btn=>{
  btn.onclick=()=>switchAnalyticsSectionFilter(btn.dataset.secFilter||'all');
});

const refreshAnalyticsBtn=$('#refresh-analytics');
if(refreshAnalyticsBtn){
  refreshAnalyticsBtn.onclick=async()=>{
    refreshAnalyticsBtn.disabled=true;
    await refreshAnalyticsData();
    refreshAnalyticsBtn.disabled=false;
  };
}

const resetAnalyticsBtn=$('#reset-analytics');
if(resetAnalyticsBtn){
  resetAnalyticsBtn.onclick=async()=>{
    if(!confirm('Reset seluruh data statistik pengunjung & klik WA menjadi 0? Tindakan ini tidak dapat dibatalkan.'))return;
    resetAnalyticsBtn.disabled=true;
    try{
      analyticsData=await api('/api/admin/ringkasan/reset','POST',{});
      renderAnalytics();
      render();
      notice('Data statistik berhasil di-reset.');
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

const analyticsSearch=$('#analytics-theme-search');
if(analyticsSearch){
  analyticsSearch.oninput=()=>renderAnalyticsThemes();
}

const adminSearch=$('#admin-search');
if(adminSearch)adminSearch.oninput=()=>{limit=40;render();};
const bsFilter=$('#filter-bestseller-only');
if(bsFilter)bsFilter.onchange=()=>{limit=40;render();};
const loadMoreBtn=$('#load-more');
if(loadMoreBtn)loadMoreBtn.onclick=()=>{limit+=40;render();};

catForm.onsubmit=async e=>{
  e.preventDefault();
  const btn=$('#save-cat');
  btn.disabled=true;
  setText('#cat-message','');
  try{
    const data=Object.fromEntries(new FormData(catForm));
    const created=await api('/api/admin/categories','POST',data);
    categories.push(created);
    catForm.reset();
    renderCategories(created.name);
    notice(`Kategori "${created.name}" berhasil ditambahkan.`);
  }catch(e){
    setText('#cat-message',e.message);
  }finally{
    btn.disabled=false;
  }
};

form.elements.image.oninput=preview;
$('#upload').onchange=async e=>{
  const file=e.target.files[0];
  if(!file)return;
  if(file.size>3e6){setText('#editor-message','Ukuran gambar maksimal 3 MB.');return;}
  setText('#editor-message','Mengunggah gambar…');
  const dataUrl=await new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=reject;
    r.readAsDataURL(file);
  });
  try{
    const {url}=await api('/api/upload','POST',{image:dataUrl});
    form.elements.image.value=url;
    preview();
    setText('#editor-message','Gambar siap dipakai.');
  }catch(err){
    setText('#editor-message',err.message);
  }
};

form.onsubmit=async e=>{
  e.preventDefault();
  const b=$('#save');
  b.disabled=true;
  setText('#editor-message','');
  try{
    const d=Object.fromEntries(new FormData(form));
    const payload={
      ...d,
      price:Number(d.price),
      photoPrice:Number(d.photoPrice),
      active:form.elements.active.checked,
      bestseller:form.elements.bestseller.checked,
      featured:form.elements.featured.checked
    };
    await api('/api/admin/themes',d.id?'PUT':'POST',payload);
    dialog.close();
    await load();
    notice('Perubahan katalog tersimpan.');
  }catch(err){
    setText('#editor-message',err.message);
  }finally{
    b.disabled=false;
  }
};

$('#password-form').onsubmit=async e=>{
  e.preventDefault();
  try{
    await api('/api/password','POST',Object.fromEntries(new FormData(e.target)));
    e.target.reset();
    await load();
    notice('Kata sandi diperbarui. Silakan masuk kembali.');
  }catch(err){
    notice(err.message);
  }
};

const settingsForm=$('#settings-form');
if(settingsForm){
  settingsForm.onsubmit=async e=>{
    e.preventDefault();
    const btn=$('#save-settings-btn');
    const msg=$('#settings-save-notice');
    btn.disabled=true;
    if(msg)msg.textContent='Menyimpan…';
    try{
      const fd=new FormData(settingsForm);
      const previewMode=fd.get('previewMode')||'new_tab';
      settings=await api('/api/admin/settings','POST',{previewMode});
      renderSettings();
      if(msg){
        msg.textContent='✓ Pengaturan berhasil disimpan';
        setTimeout(()=>{msg.textContent='';},3500);
      }
    }catch(err){
      if(msg)msg.textContent='';
      notice(err.message);
    }finally{
      btn.disabled=false;
    }
  };
}

load();
