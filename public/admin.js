const $=s=>document.querySelector(s);
let themes=[],categories=[],settings={previewMode:'new_tab'},analyticsData=null,activeAnalyticsPage='all',selectedMonthKey='',activeMainTab='catalog',activeSecFilter='all',limit=40;
let selectedPeriod='this_month',customStartDate='',customEndDate='',selectedProvDate='all',provViewMode='prov';
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
function escapeHtml(str){
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getCategoryNames(){
  const set=new Set();
  categories.forEach(c=>{if(c.name)set.add(c.name);});
  themes.forEach(t=>{if(t.category)set.add(t.category);});
  return Array.from(set);
}

async function moveCategory(index,delta){
  const names=getCategoryNames();
  const target=index+delta;
  if(target<0||target>=names.length)return;
  const next=[...names];
  [next[index],next[target]]=[next[target],next[index]];
  setText('#cat-order-status','Menyimpan urutan…');
  try{
    categories=await api('/api/admin/categories/reorder','PUT',{order:next});
    renderCategories();
    setText('#cat-order-status','✓ Urutan kategori berhasil diperbarui di website');
    setTimeout(()=>setText('#cat-order-status',''),2500);
  }catch(e){
    setText('#cat-order-status','');
    setText('#cat-message',e.message);
  }
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
    names.forEach((name,idx)=>{
      const li=document.createElement('li');
      const info=document.createElement('div');
      const num=document.createElement('span');
      num.className='cat-num';
      num.textContent=`${idx+1}.`;
      const span=document.createElement('span');
      span.textContent=name;
      info.append(num,span);
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
      right.style.gap='8px';
      const count=themes.filter(t=>t.category===name).length;
      const countBadge=document.createElement('small');
      countBadge.textContent=`${count} tema`;
      countBadge.style.color='#68736b';
      right.append(countBadge);

      const orderBtns=document.createElement('div');
      orderBtns.className='cat-order-btns';
      const upBtn=document.createElement('button');
      upBtn.type='button';
      upBtn.className='cat-move-btn';
      upBtn.textContent='↑';
      upBtn.title='Geser ke atas (tampil lebih dulu)';
      upBtn.disabled=idx===0;
      upBtn.onclick=()=>moveCategory(idx,-1);

      const downBtn=document.createElement('button');
      downBtn.type='button';
      downBtn.className='cat-move-btn';
      downBtn.textContent='↓';
      downBtn.title='Geser ke bawah';
      downBtn.disabled=idx===names.length-1;
      downBtn.onclick=()=>moveCategory(idx,1);

      orderBtns.append(upBtn,downBtn);
      right.append(orderBtns);

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
  renderPageThumbnailSettings();
  renderBannerSettings();
}

const PAGE_THUMBNAIL_DEFS = [
  {
    key: 'home',
    path: '/',
    label: 'Halaman Beranda',
    badge: 'BERANDA ( / )',
    defaultImage: '/assets/images/hero_mockup_v3.webp',
    defaultTitle: 'Galipat Story — Satu undangan, awal cerita kalian.',
    defaultDesc: 'Undangan digital dibuatkan tim. Bebas revisi sampai hari H, aktif 1 tahun pasca acara.'
  },
  {
    key: 'tema',
    path: '/tema',
    label: 'Katalog Tema',
    badge: 'KATALOG TEMA ( /TEMA )',
    defaultImage: '/assets/images/shopee-1.webp',
    defaultTitle: 'Tema Undangan Web — Galipat Story',
    defaultDesc: 'Koleksi lengkap 830+ tema undangan digital web. Dibuatkan tim, bebas revisi sampai hari H, dan aktif 1 tahun pasca acara.'
  },
  {
    key: 'webInvitation',
    path: '/web-invitation',
    label: 'Web Invitation',
    badge: 'WEB INVITATION ( /WEB-INVITATION )',
    defaultImage: '/assets/images/hero_mockup_v3.webp',
    defaultTitle: 'Undangan Digital Web Pernikahan Online — Galipat Story',
    defaultDesc: 'Jasa pembuatan undangan digital web pernikahan online terima beres. Dibuatkan tim dalam 8-24 jam, bebas revisi sampai hari H, aktif 1 tahun pasca acara.'
  },
  {
    key: 'tutorial',
    path: '/tutorial',
    label: 'Tutorial',
    badge: 'TUTORIAL ( /TUTORIAL )',
    defaultImage: '/assets/images/hero_mockup_v3.webp',
    defaultTitle: 'Tutorial Undangan Website — Galipat Story',
    defaultDesc: 'Panduan dan video tutorial resmi Galipat Story: scan QR barcode buku tamu, ganti nama tamu undangan, edit data mandiri, dan ganti template pesan WhatsApp.'
  }
];

function renderPageThumbnailSettings(){
  const container=$('#page-thumbnails-container');
  if(!container)return;
  const currentThumbs=settings?.pageThumbnails||{};

  container.innerHTML=PAGE_THUMBNAIL_DEFS.map(pDef=>{
    const pageData=currentThumbs[pDef.key]||{};
    const image=pageData.image||pDef.defaultImage;
    const title=pageData.title||pDef.defaultTitle;
    const desc=pageData.description||pDef.defaultDesc;

    return `
      <div class="page-thumb-card" data-page="${pDef.key}">
        <div class="page-thumb-header">
          <h3 class="page-thumb-title">${escapeHtml(pDef.label)}</h3>
          <span class="banner-badge">${escapeHtml(pDef.badge)}</span>
        </div>

        <div>
          <label class="banner-field-label">Pratinjau Tampilan Link (WhatsApp / Sosmed):</label>
          <div class="wa-preview-card">
            <div class="wa-preview-header">
              <span>💬 Pratinjau Link WhatsApp &amp; Sosmed</span>
            </div>
            <div class="wa-preview-img-wrap">
              <img src="${escapeHtml(image)}" class="wa-preview-img" id="wa-img-${pDef.key}" alt="Preview ${escapeHtml(pDef.label)}">
            </div>
            <div class="wa-preview-body">
              <div class="wa-preview-domain">LP.GALIPATSTORY.COM ${pDef.path}</div>
              <div class="wa-preview-title" id="wa-title-${pDef.key}">${escapeHtml(title)}</div>
              <div class="wa-preview-desc" id="wa-desc-${pDef.key}">${escapeHtml(desc)}</div>
            </div>
          </div>
        </div>

        <div>
          <label class="banner-field-label">Gambar Thumbnail Halaman:</label>
          <div class="banner-img-preview-box">
            <img src="${escapeHtml(image)}" class="banner-preview-thumb" id="page-thumb-preview-${pDef.key}" alt="Thumb ${escapeHtml(pDef.label)}">
            <div class="banner-img-controls">
              <input type="text" class="banner-input-sm page-thumb-img-input" id="page-thumb-img-${pDef.key}" data-page="${pDef.key}" value="${escapeHtml(image)}" placeholder="/assets/images/..." oninput="updateLiveWaThumb('${pDef.key}')">
              <button type="button" class="button outline small" style="align-self:flex-start;font-size:12px;padding:5px 10px;" onclick="triggerPageThumbUpload('${pDef.key}')">📷 Ganti Thumbnail</button>
              <input type="file" id="page-thumb-file-${pDef.key}" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="handlePageThumbFileUpload('${pDef.key}', this)">
              <small id="page-thumb-status-${pDef.key}" style="color:var(--green);font-size:11px;"></small>
            </div>
          </div>
        </div>

        <div>
          <label class="banner-field-label">Judul Share (WhatsApp / Sosmed):</label>
          <input type="text" class="banner-input-sm page-thumb-title-input" id="page-thumb-title-${pDef.key}" data-page="${pDef.key}" value="${escapeHtml(title)}" placeholder="Judul pratinjau..." oninput="updateLiveWaTitle('${pDef.key}')">
        </div>

        <div>
          <label class="banner-field-label">Deskripsi Singkat Share:</label>
          <textarea class="banner-input-sm page-thumb-desc-input" id="page-thumb-desc-${pDef.key}" data-page="${pDef.key}" rows="2" placeholder="Deskripsi pratinjau..." style="resize:vertical;" oninput="updateLiveWaDesc('${pDef.key}')">${escapeHtml(desc)}</textarea>
        </div>
      </div>
    `;
  }).join('');
}

window.updateLiveWaThumb=function(pageKey){
  const val=document.getElementById(`page-thumb-img-${pageKey}`)?.value||'';
  const img=document.getElementById(`page-thumb-preview-${pageKey}`);
  const waImg=document.getElementById(`wa-img-${pageKey}`);
  if(img)img.src=val;
  if(waImg)waImg.src=val;
};

window.updateLiveWaTitle=function(pageKey){
  const val=document.getElementById(`page-thumb-title-${pageKey}`)?.value||'';
  const titleEl=document.getElementById(`wa-title-${pageKey}`);
  if(titleEl)titleEl.textContent=val;
};

window.updateLiveWaDesc=function(pageKey){
  const val=document.getElementById(`page-thumb-desc-${pageKey}`)?.value||'';
  const descEl=document.getElementById(`wa-desc-${pageKey}`);
  if(descEl)descEl.textContent=val;
};

window.triggerPageThumbUpload=function(pageKey){
  const fileInput=document.getElementById(`page-thumb-file-${pageKey}`);
  if(fileInput)fileInput.click();
};

window.handlePageThumbFileUpload=async function(pageKey,fileInput){
  const file=fileInput.files?.[0];
  if(!file)return;
  const statusEl=document.getElementById(`page-thumb-status-${pageKey}`);
  if(statusEl)statusEl.textContent='Mengunggah…';
  try{
    const dataUrl=await new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve(r.result);
      r.onerror=reject;
      r.readAsDataURL(file);
    });
    const {url}=await api('/api/upload','POST',{image:dataUrl});
    const imgInput=document.getElementById(`page-thumb-img-${pageKey}`);
    const previewImg=document.getElementById(`page-thumb-preview-${pageKey}`);
    const waImg=document.getElementById(`wa-img-${pageKey}`);
    if(imgInput)imgInput.value=url;
    if(previewImg)previewImg.src=url;
    if(waImg)waImg.src=url;
    if(statusEl)statusEl.textContent='✓ Berhasil diunggah';
    setTimeout(()=>{if(statusEl)statusEl.textContent='';},3000);
  }catch(err){
    if(statusEl)statusEl.textContent='Gagal: '+err.message;
  }
};

window.triggerBannerUpload=function(bannerKey){
  const fileInput=document.getElementById(`banner-file-${bannerKey}`);
  if(fileInput)fileInput.click();
};

window.handleBannerFileUpload=async function(bannerKey,fileInput){
  const file=fileInput.files?.[0];
  if(!file)return;
  const statusEl=document.getElementById(`banner-upload-status-${bannerKey}`);
  if(statusEl)statusEl.textContent='Mengunggah…';
  try{
    const dataUrl=await new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve(r.result);
      r.onerror=reject;
      r.readAsDataURL(file);
    });
    const {url}=await api('/api/upload','POST',{image:dataUrl});
    const imgInput=document.getElementById(`banner-img-${bannerKey}`);
    const previewImg=document.getElementById(`banner-thumb-img-${bannerKey}`);
    if(imgInput)imgInput.value=url;
    if(previewImg)previewImg.src=url;
    if(statusEl)statusEl.textContent='✓ Berhasil diunggah';
    setTimeout(()=>{if(statusEl)statusEl.textContent='';},3000);
  }catch(err){
    if(statusEl)statusEl.textContent='Gagal: '+err.message;
  }
};

const BANNER_CONFIG_DEFS = [
  { key: 'all', badge: 'GAMBAR 1 (MULAI 29K)', label: 'Gambar 1: Mulai 29K', defaultImage: '/assets/images/shopee-1.webp', defaultTitle: 'Pilih Tema Sesuai Karaktermu', defaultSub: 'TEKAN "TOMBOL DI BAWAH" UNTUK MELIHAT KATALOG UNDANGAN KAMI.' },
  { key: 'v02', badge: 'GAMBAR 2 (MULAI 50K)', label: 'Gambar 2: Mulai 50K', defaultImage: '/assets/images/shopee-2.webp', defaultTitle: 'Pilih Kategori Tema', defaultSub: 'PILIH KATEGORI TEMA DI BAWAH UNTUK MELIHAT DAFTAR DESAIN:' },
  { key: 'eksklusif', badge: 'GAMBAR 3 (EKSKLUSIF)', label: 'Gambar 3: Tema Eksklusif', defaultImage: '/assets/images/shopee-3.webp', defaultTitle: 'Tema Eksklusif', defaultSub: '' }
];

const V02_SUB_LIST = [
  { key: 'wedding', label: 'Wedding' },
  { key: 'birthday', label: 'Kids & Birthday' },
  { key: 'aqiqah', label: 'Aqiqah & Tasmiyah' },
  { key: 'khitan', label: 'Tasyakuran Khitan' },
  { key: 'umum', label: 'Umum & Seminar' },
  { key: 'christmas', label: 'Christmas & New Year' },
  { key: 'syukuran', label: 'Syukuran & Islami' },
  { key: 'party', label: 'Party & Dinner' },
  { key: 'school', label: 'School & Graduation' }
];

function renderBannerSettings(){
  const container=$('#banner-settings-container');
  if(!container)return;
  const currentGroups=settings?.temaBannerGroups||{};

  container.innerHTML=BANNER_CONFIG_DEFS.map(bDef=>{
    const group=currentGroups[bDef.key]||{};
    const image=group.image||bDef.defaultImage;
    const title=group.title!==undefined?group.title:bDef.defaultTitle;
    const sub=group.sub!==undefined?group.sub:bDef.defaultSub;
    const selectedCats=Array.isArray(group.categories)?group.categories:[];
    const selectedSubs=Array.isArray(group.subcategories)?group.subcategories:[];
    const allCatNames=categories.map(c=>c.name);

    return `
      <div class="banner-group-card" data-banner="${bDef.key}">
        <div class="banner-group-header">
          <h3 class="banner-group-title">${escapeHtml(bDef.label)}</h3>
          <span class="banner-badge">${escapeHtml(bDef.badge)}</span>
        </div>

        <div>
          <label class="banner-field-label">Gambar Banner (${escapeHtml(bDef.label)}):</label>
          <div class="banner-img-preview-box">
            <img src="${escapeHtml(image)}" class="banner-preview-thumb" id="banner-thumb-img-${bDef.key}" alt="Preview ${escapeHtml(bDef.label)}">
            <div class="banner-img-controls">
              <input type="text" class="banner-input-sm banner-img-input" id="banner-img-${bDef.key}" data-banner="${bDef.key}" value="${escapeHtml(image)}" placeholder="/assets/images/..." oninput="document.getElementById('banner-thumb-img-${bDef.key}').src=this.value">
              <button type="button" class="button outline small" style="align-self:flex-start;font-size:12px;padding:5px 10px;" onclick="triggerBannerUpload('${bDef.key}')">📷 Ganti Gambar Banner</button>
              <input type="file" id="banner-file-${bDef.key}" accept="image/png,image/jpeg,image/webp" style="display:none;" onchange="handleBannerFileUpload('${bDef.key}', this)">
              <small id="banner-upload-status-${bDef.key}" style="color:var(--green);font-size:11px;"></small>
            </div>
          </div>
        </div>

        <div>
          <label class="banner-field-label">Judul Tampilan:</label>
          <input type="text" class="banner-input-sm banner-title-input" data-banner="${bDef.key}" value="${escapeHtml(title)}" placeholder="Contoh: Pilih Tema Sesuai Karaktermu">
        </div>

        <div>
          <label class="banner-field-label">Teks Petunjuk / Sub-judul:</label>
          <input type="text" class="banner-input-sm banner-sub-input" data-banner="${bDef.key}" value="${escapeHtml(sub)}" placeholder="Contoh: TEKAN TOMBOL DI BAWAH...">
        </div>

        <div>
          <div class="banner-subhead-row">
            <label class="banner-field-label">Pilih Kategori Tema:</label>
            <div>
              <button type="button" class="banner-quick-link" onclick="quickSelectCats('${bDef.key}',true)">Pilih Semua</button>
              <span style="color:#aaa;font-size:11px;"> · </span>
              <button type="button" class="banner-quick-link" onclick="quickSelectCats('${bDef.key}',false)">Kosongkan</button>
            </div>
          </div>
          <div class="banner-checkbox-list" id="banner-cat-list-${bDef.key}">
            ${allCatNames.map(catName=>`
              <label class="banner-check-item">
                <input type="checkbox" class="banner-cat-cb" data-banner="${bDef.key}" value="${escapeHtml(catName)}" ${selectedCats.includes(catName)?'checked':''} onchange="updateDefaultCatOptions('${bDef.key}')">
                <span>${escapeHtml(catName)}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div>
          <label class="banner-field-label">Kategori Default yang Langsung Terbuka:</label>
          <select class="banner-select-sm banner-defcat-select" id="banner-defcat-${bDef.key}" data-banner="${bDef.key}">
          </select>
        </div>

        <div>
          <div class="banner-subhead-row">
            <label class="banner-field-label">Sub-Tema (Khusus Tema V.02 &amp; Umum):</label>
            <div>
              <button type="button" class="banner-quick-link" onclick="quickSelectSubs('${bDef.key}',true)">Pilih Semua</button>
              <span style="color:#aaa;font-size:11px;"> · </span>
              <button type="button" class="banner-quick-link" onclick="quickSelectSubs('${bDef.key}',false)">Kosongkan</button>
            </div>
          </div>
          <div class="banner-checkbox-list">
            ${V02_SUB_LIST.map(sub=>`
              <label class="banner-check-item">
                <input type="checkbox" class="banner-subcat-cb" data-banner="${bDef.key}" value="${escapeHtml(sub.key)}" ${selectedSubs.includes(sub.key)?'checked':''}>
                <span>${escapeHtml(sub.label)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  BANNER_CONFIG_DEFS.forEach(bDef=>{
    const group=currentGroups[bDef.key]||{};
    updateDefaultCatOptions(bDef.key,group.defaultCat);
  });
}

window.quickSelectCats=function(bannerKey,selectAll){
  const cbs=document.querySelectorAll(`.banner-cat-cb[data-banner="${bannerKey}"]`);
  cbs.forEach(cb=>{cb.checked=!!selectAll;});
  updateDefaultCatOptions(bannerKey);
};

window.quickSelectSubs=function(bannerKey,selectAll){
  const cbs=document.querySelectorAll(`.banner-subcat-cb[data-banner="${bannerKey}"]`);
  cbs.forEach(cb=>{cb.checked=!!selectAll;});
};

window.updateDefaultCatOptions=function(bannerKey,preferredVal){
  const select=$(`#banner-defcat-${bannerKey}`);
  if(!select)return;
  const currentVal=preferredVal!==undefined?preferredVal:select.value;
  const checkedBoxes=Array.from(document.querySelectorAll(`.banner-cat-cb[data-banner="${bannerKey}"]:checked`));

  select.replaceChildren();

  if(checkedBoxes.length===0){
    const opt=document.createElement('option');
    opt.value='';
    opt.textContent='(Tidak ada kategori yang dipilih)';
    select.appendChild(opt);
    return;
  }

  checkedBoxes.forEach(cb=>{
    const opt=document.createElement('option');
    opt.value=cb.value;
    opt.textContent=cb.value;
    if(cb.value===currentVal){
      opt.selected=true;
    }
    select.appendChild(opt);
  });

  if(!select.value&&checkedBoxes[0]){
    select.value=checkedBoxes[0].value;
  }
};

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

function extractProvince(raw=''){
  const s=String(raw||'').toLowerCase().trim();
  if(!s)return 'Tidak Diketahui';
  if(s.startsWith('wilayah wita')||s.includes('wilayah wita'))return 'Wilayah WITA (Bali, NTB, NTT, Kalimantan, Sulawesi)';
  if(s.startsWith('wilayah wit')||s.includes('wilayah wit'))return 'Wilayah WIT (Maluku, Papua)';
  if(s.startsWith('wilayah wib')||s.includes('wilayah wib'))return 'Wilayah WIB (Jawa, Sumatera, Kalbar)';
  if(s.includes('jakarta'))return 'DKI Jakarta';
  if(s.includes('west java')||s.includes('jawa barat')||s.includes('bandung')||s.includes('bekasi')||s.includes('depok')||s.includes('bogor')||s.includes('cimahi')||s.includes('cirebon')||s.includes('karawang')||s.includes('tasikmalaya')||s.includes('sukabumi'))return 'Jawa Barat';
  if(s.includes('east java')||s.includes('jawa timur')||s.includes('surabaya')||s.includes('malang')||s.includes('sidoarjo')||s.includes('jember')||s.includes('kediri')||s.includes('banyuwangi')||s.includes('pasuruan')||s.includes('probolinggo')||s.includes('gresik'))return 'Jawa Timur';
  if(s.includes('central java')||s.includes('jawa tengah')||s.includes('semarang')||s.includes('surakarta')||s.includes('solo')||s.includes('magelang')||s.includes('pekalongan')||s.includes('tegal')||s.includes('kudus')||s.includes('cilacap')||s.includes('banyumas')||s.includes('purwokerto')||s.includes('salatiga'))return 'Jawa Tengah';
  if(s.includes('banten')||s.includes('tangerang')||s.includes('serang')||s.includes('cilegon'))return 'Banten';
  if(s.includes('yogyakarta')||s.includes('jogja')||s.includes('sleman')||s.includes('bantul'))return 'DI Yogyakarta';
  if(s.includes('north sumatra')||s.includes('sumatera utara')||s.includes('medan')||s.includes('deli serdang')||s.includes('binjai')||s.includes('pematangsiantar'))return 'Sumatera Utara';
  if(s.includes('west sumatra')||s.includes('sumatera barat')||s.includes('padang')||s.includes('bukittinggi'))return 'Sumatera Barat';
  if(s.includes('south sumatra')||s.includes('sumatera selatan')||s.includes('palembang')||s.includes('prabumulih'))return 'Sumatera Selatan';
  if(s.includes('riau islands')||s.includes('kepulauan riau')||s.includes('batam')||s.includes('tanjungpinang'))return 'Kepulauan Riau';
  if(s.includes('riau')||s.includes('pekanbaru')||s.includes('dumai'))return 'Riau';
  if(s.includes('lampung')||s.includes('bandar lampung'))return 'Lampung';
  if(s.includes('aceh')||s.includes('banda aceh'))return 'Aceh';
  if(s.includes('jambi'))return 'Jambi';
  if(s.includes('bengkulu'))return 'Bengkulu';
  if(s.includes('bangka')||s.includes('belitung'))return 'Bangka Belitung';
  if(s.includes('bali')||s.includes('denpasar')||s.includes('badung'))return 'Bali';
  if(s.includes('west nusa tenggara')||s.includes('nusa tenggara barat')||s.includes('ntb')||s.includes('mataram')||s.includes('lombok'))return 'Nusa Tenggara Barat';
  if(s.includes('east nusa tenggara')||s.includes('nusa tenggara timur')||s.includes('ntt')||s.includes('kupang'))return 'Nusa Tenggara Timur';
  if(s.includes('south sulawesi')||s.includes('sulawesi selatan')||s.includes('makassar')||s.includes('gowa'))return 'Sulawesi Selatan';
  if(s.includes('north sulawesi')||s.includes('sulawesi utara')||s.includes('manado'))return 'Sulawesi Utara';
  if(s.includes('central sulawesi')||s.includes('sulawesi tengah')||s.includes('palu'))return 'Sulawesi Tengah';
  if(s.includes('southeast sulawesi')||s.includes('sulawesi tenggara')||s.includes('kendari'))return 'Sulawesi Tenggara';
  if(s.includes('west sulawesi')||s.includes('sulawesi barat')||s.includes('mamuju'))return 'Sulawesi Barat';
  if(s.includes('gorontalo'))return 'Gorontalo';
  if(s.includes('west kalimantan')||s.includes('kalimantan barat')||s.includes('pontianak'))return 'Kalimantan Barat';
  if(s.includes('south kalimantan')||s.includes('kalimantan selatan')||s.includes('banjarmasin'))return 'Kalimantan Selatan';
  if(s.includes('east kalimantan')||s.includes('kalimantan timur')||s.includes('samarinda')||s.includes('balikpapan'))return 'Kalimantan Timur';
  if(s.includes('central kalimantan')||s.includes('kalimantan tengah')||s.includes('palangka raya'))return 'Kalimantan Tengah';
  if(s.includes('north kalimantan')||s.includes('kalimantan utara')||s.includes('tarakan'))return 'Kalimantan Utara';
  if(s.includes('maluku utara')||s.includes('north maluku')||s.includes('ternate'))return 'Maluku Utara';
  if(s.includes('maluku')||s.includes('ambon'))return 'Maluku';
  if(s.includes('papua barat')||s.includes('west papua')||s.includes('sorong'))return 'Papua Barat';
  if(s.includes('papua')||s.includes('jayapura'))return 'Papua';
  return raw||'Wilayah Lainnya';
}

function fmtDateIndo(dStr){
  if(!dStr)return '';
  const parts=String(dStr).split('-');
  if(parts.length!==3)return dStr;
  const [y,m,d]=parts;
  const months=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${Number(d)} ${months[Number(m)-1]||m} ${y}`;
}

function getActiveDateRange(){
  const now=new Date(Date.now()+7*3600000);
  const todayStr=now.toISOString().slice(0,10);
  const yesterdayDate=new Date(now.getTime()-86400000);
  const yesterdayStr=yesterdayDate.toISOString().slice(0,10);

  if(selectedPeriod==='today'){
    return {type:'today',label:`Hari Ini (${fmtDateIndo(todayStr)})`,dates:[todayStr],isSingleDay:true,isFullMonth:false};
  }
  if(selectedPeriod==='yesterday'){
    return {type:'yesterday',label:`Kemarin (${fmtDateIndo(yesterdayStr)})`,dates:[yesterdayStr],isSingleDay:true,isFullMonth:false};
  }
  if(selectedPeriod==='last_7_days'){
    const dates=[];
    for(let i=0;i<7;i++){
      const dt=new Date(now.getTime()-i*86400000);
      dates.push(dt.toISOString().slice(0,10));
    }
    const startStr=dates[dates.length-1];
    return {type:'last_7_days',label:`7 Hari Terakhir (${fmtDateIndo(startStr)} – ${fmtDateIndo(todayStr)})`,dates,isSingleDay:false,isFullMonth:false};
  }
  if(selectedPeriod==='last_30_days'){
    const dates=[];
    for(let i=0;i<30;i++){
      const dt=new Date(now.getTime()-i*86400000);
      dates.push(dt.toISOString().slice(0,10));
    }
    const startStr=dates[dates.length-1];
    return {type:'last_30_days',label:`30 Hari Terakhir (${fmtDateIndo(startStr)} – ${fmtDateIndo(todayStr)})`,dates,isSingleDay:false,isFullMonth:false};
  }
  if(selectedPeriod==='custom'){
    let s=customStartDate||todayStr;
    let e=customEndDate||todayStr;
    if(s>e)[s,e]=[e,s];
    const dates=[];
    let cur=new Date(s+'T00:00:00Z');
    const endDt=new Date(e+'T00:00:00Z');
    while(cur<=endDt){
      dates.push(cur.toISOString().slice(0,10));
      cur=new Date(cur.getTime()+86400000);
      if(dates.length>120)break;
    }
    dates.reverse();
    return {type:'custom',label:`Rentang: ${fmtDateIndo(s)} – ${fmtDateIndo(e)}`,dates,isSingleDay:s===e,isFullMonth:false};
  }
  if(selectedPeriod==='last_month'){
    return {type:'last_month',label:analyticsData?.availableMonths?.[1]?.label||'Bulan Lalu',dates:null,isSingleDay:false,isFullMonth:true,monthKey:analyticsData?.prevMonth};
  }
  return {type:'this_month',label:analyticsData?.availableMonths?.[0]?.label||'Bulan Ini',dates:null,isSingleDay:false,isFullMonth:true,monthKey:analyticsData?.currentMonth};
}

function computePeriodSlice(pData,dateRange){
  if(!pData)return null;
  if(dateRange.isFullMonth)return pData;

  const dates=dateRange.dates||[];
  const targetDates=new Set(dates);
  const dailyMap=pData.daily||{};
  const visitorsMap=pData.visitors||{};

  let totalViews=0,totalWaClicks=0,totalPreviews=0;
  const uniqueVisitorSet=new Set();
  const provMap=new Map();
  const cityMap=new Map();
  const devMap=new Map();
  const srcMap=new Map();

  for(const date of dates){
    const d=dailyMap[date];
    if(!d)continue;
    totalViews+=Number(d.views)||0;
    totalWaClicks+=Number(d.waClicks)||0;
    totalPreviews+=Number(d.previews)||0;
    const vids=Object.keys(d.visitors||{});
    for(const vid of vids){
      uniqueVisitorSet.add(vid);
      const vInfo=visitorsMap[vid]||{};
      const reg=vInfo.region||'Wilayah Lainnya';
      const prov=extractProvince(reg);
      const dev=vInfo.device||'📱 HP / Perangkat';
      const src=vInfo.source||'🌐 Browser Langsung';

      if(!provMap.has(prov)){
        provMap.set(prov,{province:prov,uniqueVisitors:0,totalViews:0,uniqueWaClickers:0,totalWaClicks:0,cities:new Map()});
      }
      const p=provMap.get(prov);
      p.uniqueVisitors+=1;
      p.totalViews+=1;
      if(!p.cities.has(reg)){
        p.cities.set(reg,{name:reg,uniqueVisitors:0,totalViews:0,waClicks:0});
      }
      const c=p.cities.get(reg);
      c.uniqueVisitors+=1;
      c.totalViews+=1;

      if(!cityMap.has(reg)){
        cityMap.set(reg,{region:reg,uniqueVisitors:0,totalViews:0,uniqueWaClickers:0,totalWaClicks:0});
      }
      const cm=cityMap.get(reg);
      cm.uniqueVisitors+=1;
      cm.totalViews+=1;

      if(!devMap.has(dev)){
        devMap.set(dev,{device:dev,osType:dev.includes('iPhone')||dev.includes('iPad')?'iOS':(dev.includes('Android')||dev.includes('Samsung')||dev.includes('Xiaomi')||dev.includes('OPPO')||dev.includes('Vivo')?'Android':'Lainnya'),uniqueVisitors:0,totalViews:0,uniqueWaClickers:0,totalWaClicks:0});
      }
      devMap.get(dev).uniqueVisitors+=1;
      devMap.get(dev).totalViews+=1;

      if(!srcMap.has(src)){
        srcMap.set(src,{source:src,uniqueVisitors:0,totalViews:0,uniqueWaClickers:0,totalWaClicks:0});
      }
      srcMap.get(src).uniqueVisitors+=1;
      srcMap.get(src).totalViews+=1;
    }
  }

  const filteredRecents=(pData.recentClicks||[]).filter(c=>{
    const cDate=c.date||(c.timestamp?new Date(c.timestamp+7*3600000).toISOString().slice(0,10):'');
    return targetDates.has(cDate);
  });

  for(const c of filteredRecents){
    if(c.region){
      const prov=extractProvince(c.region);
      if(provMap.has(prov)){
        provMap.get(prov).totalWaClicks+=1;
        provMap.get(prov).uniqueWaClickers+=1;
      }
      if(cityMap.has(c.region)){
        cityMap.get(c.region).totalWaClicks+=1;
        cityMap.get(c.region).uniqueWaClickers+=1;
      }
    }
    if(c.device&&devMap.has(c.device)){
      devMap.get(c.device).totalWaClicks+=1;
      devMap.get(c.device).uniqueWaClickers+=1;
    }
    if(c.source&&srcMap.has(c.source)){
      srcMap.get(c.source).totalWaClicks+=1;
      srcMap.get(c.source).uniqueWaClickers+=1;
    }
  }

  const uniqueVisitors=uniqueVisitorSet.size;
  const uniqueWaClickers=filteredRecents.length>0?new Set(filteredRecents.map(c=>c.timestamp)).size:0;
  const numDays=Math.max(1,dates.length);
  const avgDaily=Math.round(uniqueVisitors/numDays);
  const convRate=uniqueVisitors>0?Number(((totalWaClicks/uniqueVisitors)*100).toFixed(1)):0;

  const provinces=[...provMap.values()].map(p=>({
    province:p.province,
    uniqueVisitors:p.uniqueVisitors,
    totalViews:p.totalViews,
    uniqueWaClickers:p.uniqueWaClickers,
    totalWaClicks:p.totalWaClicks,
    conversionRate:p.uniqueVisitors>0?Number(((p.totalWaClicks/p.uniqueVisitors)*100).toFixed(1)):0,
    cities:[...p.cities.values()]
  })).sort((a,b)=>(b.uniqueVisitors-a.uniqueVisitors)||(b.totalWaClicks-a.totalWaClicks));

  const regions=[...cityMap.values()].map(c=>({
    region:c.region,
    uniqueVisitors:c.uniqueVisitors,
    totalViews:c.totalViews,
    uniqueWaClickers:c.uniqueWaClickers,
    totalWaClicks:c.totalWaClicks,
    conversionRate:c.uniqueVisitors>0?Number(((c.totalWaClicks/c.uniqueVisitors)*100).toFixed(1)):0
  })).sort((a,b)=>(b.uniqueVisitors-a.uniqueVisitors)||(b.totalWaClicks-a.totalWaClicks));

  const devices=[...devMap.values()].map(d=>({
    device:d.device,
    osType:d.osType,
    uniqueVisitors:d.uniqueVisitors,
    totalViews:d.totalViews,
    uniqueWaClickers:d.uniqueWaClickers,
    totalWaClicks:d.totalWaClicks,
    conversionRate:d.uniqueVisitors>0?Number(((d.totalWaClicks/d.uniqueVisitors)*100).toFixed(1)):0
  })).sort((a,b)=>(b.uniqueVisitors-a.uniqueVisitors)||(b.totalWaClicks-a.totalWaClicks));

  const sources=[...srcMap.values()].map(s=>({
    source:s.source,
    uniqueVisitors:s.uniqueVisitors,
    totalViews:s.totalViews,
    uniqueWaClickers:s.uniqueWaClickers,
    totalWaClicks:s.totalWaClicks,
    conversionRate:s.uniqueVisitors>0?Number(((s.totalWaClicks/s.uniqueVisitors)*100).toFixed(1)):0
  })).sort((a,b)=>(b.uniqueVisitors-a.uniqueVisitors)||(b.totalWaClicks-a.totalWaClicks));

  return {
    ...pData,
    daysInPeriod:numDays,
    avgDailyVisitors:avgDaily,
    uniqueMonthly:uniqueVisitors,
    uniqueToday:dateRange.isSingleDay?uniqueVisitors:pData.uniqueToday,
    totalPageviews:totalViews,
    viewsToday:dateRange.isSingleDay?totalViews:pData.viewsToday,
    totalPreviews,
    totalWaClicks,
    uniqueWaClickers,
    conversionRate:convRate,
    provinces,
    regions,
    devices,
    sources,
    recentClicks:filteredRecents
  };
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

  const dateRange=getActiveDateRange();
  const monthData=getActiveMonthData();
  if(!monthData||!monthData.pages)return;
  const rawPages=monthData.pages;
  const rawCurrent=rawPages[activeAnalyticsPage]||rawPages.all;
  const current=computePeriodSlice(rawCurrent,dateRange)||rawCurrent;
  const isCurrent=!!monthData.isCurrent;

  // Period / Date Range Pills (Gambar 1)
  const monthPills=$('#analytics-month-pills');
  if(monthPills){
    monthPills.replaceChildren();
    const PERIOD_DEFS=[
      {key:'this_month',label:'Bulan Ini'},
      {key:'last_month',label:'Bulan Lalu'},
      {key:'today',label:'Hari Ini'},
      {key:'yesterday',label:'Kemarin'},
      {key:'last_7_days',label:'7 Hari Terakhir'},
      {key:'last_30_days',label:'30 Hari Terakhir'},
      {key:'custom',label:'📅 Pilih Tanggal (Rentang)'}
    ];
    for(const pDef of PERIOD_DEFS){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='month-pill-btn'+(pDef.key===selectedPeriod?' active':'');
      const dot=document.createElement('span');
      dot.className='month-dot';
      const lbl=document.createElement('span');
      lbl.textContent=pDef.label;
      btn.append(dot,lbl);
      btn.onclick=()=>{
        selectedPeriod=pDef.key;
        if(pDef.key==='last_month'&&analyticsData.prevMonth){
          selectedMonthKey=analyticsData.prevMonth;
        }else if(analyticsData.currentMonth){
          selectedMonthKey=analyticsData.currentMonth;
        }
        const customWrap=$('#analytics-custom-range');
        if(customWrap){
          customWrap.hidden=(pDef.key!=='custom');
          if(pDef.key==='custom'){
            const nowStr=new Date(Date.now()+7*3600000).toISOString().slice(0,10);
            const sevenDaysAgo=new Date(Date.now()+7*3600000-6*86400000).toISOString().slice(0,10);
            if(!$('#range-start-date').value)$('#range-start-date').value=customStartDate||sevenDaysAgo;
            if(!$('#range-end-date').value)$('#range-end-date').value=customEndDate||nowStr;
          }
        }
        renderAnalytics();
        render();
      };
      monthPills.append(btn);
    }
  }

  // Custom Range Apply Button
  const applyRangeBtn=$('#apply-custom-range');
  if(applyRangeBtn){
    applyRangeBtn.onclick=()=>{
      customStartDate=$('#range-start-date')?.value||'';
      customEndDate=$('#range-end-date')?.value||'';
      if(!customStartDate||!customEndDate){
        notice('Pilih tanggal awal dan akhir terlebih dahulu.');
        return;
      }
      renderAnalytics();
      render();
    };
  }

  setText('#analytics-month-title',dateRange.label);
  setText('#analytics-active-month-label',dateRange.label);
  setText('#analytics-comp-month-badge',dateRange.label);
  setText('#analytics-active-page-label',current.label);
  setText('#analytics-updated-at','Diperbarui: '+fmtTime(analyticsData.updatedAt));
  setText('#analytics-daily-sub',`Rincian tanggal 1 s/d ${current.daysInPeriod||30} pada ${dateRange.label}`);

  document.querySelectorAll('.analytics-tab').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.page===activeAnalyticsPage);
  });

  // 1. Comparison Table (Recalculated for Selected Period)
  const compBody=$('#analytics-pages-rows');
  if(compBody){
    compBody.replaceChildren();
    const order=[
      {key:'home',icon:'🏠',title:'Halaman Utama (/)',sub:'Landing page utama dengan harga'},
      {key:'web',icon:'💌',title:'Web Invitation (/web-invitation)',sub:'Landing page khusus tanpa harga'},
      {key:'tema',icon:'🎨',title:'Katalog Tema (/tema)',sub:'Halaman katalog pilihan produk'},
      {key:'tutorial',icon:'📖',title:'Tutorial (/tutorial)',sub:'Panduan penggunaan undangan website'},
      {key:'all',icon:'🌐',title:'Semua Halaman (Gabungan)',sub:'Total gabungan seluruh website'}
    ];
    for(const item of order){
      const rawP=rawPages[item.key];
      if(!rawP)continue;
      const pData=computePeriodSlice(rawP,dateRange)||rawP;
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
      tdToday.textContent=`${fmtNum(pData.uniqueToday)} orang`;

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
  const kpiPeriodLabel=dateRange.isSingleDay?'Pengunjung Unik Hari Ini':(dateRange.isFullMonth?(isCurrent?'Pengunjung Unik Bulan Ini':'Pengunjung Unik Bulan Lalu'):`Pengunjung Unik (${dateRange.type==='last_7_days'?'7 Hari Terakhir':'Periode Ini'})`);
  setText('#kpi-unique-monthly',fmtNum(current.uniqueMonthly));
  setText('#kpi-unique-monthly-label',kpiPeriodLabel);
  setText('#kpi-unique-monthly-note',`Deduplikasi pengunjung unik anti-refresh pada ${dateRange.label}.`);

  setText('#kpi-unique-today',dateRange.isSingleDay?fmtNum(current.uniqueToday):fmtNum(current.avgDailyVisitors));
  setText('#kpi-unique-today-label',dateRange.isSingleDay?'Pengunjung Unik Hari Terpilih':'Rata-rata Pengunjung / Hari');
  setText('#kpi-unique-avg',dateRange.isSingleDay?(`Aktivitas: ${fmtNum(current.totalPageviews)}x dibuka`):(`Rata-rata: ${fmtNum(current.avgDailyVisitors)} orang unik / hari (${current.daysInPeriod} hari)`));

  setText('#kpi-total-views',fmtNum(current.totalPageviews));
  setText('#kpi-views-today',`🔍 ${fmtNum(current.totalPreviews||0)}x lihat contoh · Total ${fmtNum(current.totalPageviews)}x halaman dibuka`);

  setText('#kpi-wa-clicks',fmtNum(current.totalWaClicks));
  setText('#kpi-wa-conversion',`${fmtNum(current.uniqueWaClickers)} orang unik klik WA · Konversi ${current.conversionRate}%`);

  // 3. Sebaran Wilayah / Provinsi Table (Gambar 2: Konsep Provinsi & Filter Harian)
  const regHeading=$('#analytics-prov-heading');
  const regSub=$('#analytics-prov-sub');
  const thProvCol=$('#th-prov-col');
  if(regHeading)regHeading.textContent=provViewMode==='prov'?'📍 Sebaran Provinsi Pengunjung':'📍 Sebaran Wilayah / Kota Pengunjung';
  if(regSub)regSub.textContent=provViewMode==='prov'?'Dikelompokkan otomatis per provinsi Indonesia & zona waktu':'Deteksi otomatis dari jaringan IP & zona waktu tanpa meminta GPS';
  if(thProvCol)thProvCol.textContent=provViewMode==='prov'?'Provinsi (Zona Waktu)':'Wilayah / Kota (Zona Waktu)';

  const btnViewProv=$('#toggle-view-prov');
  const btnViewCity=$('#toggle-view-city');
  if(btnViewProv&&btnViewCity){
    btnViewProv.classList.toggle('active',provViewMode==='prov');
    btnViewCity.classList.toggle('active',provViewMode==='city');
    btnViewProv.onclick=()=>{provViewMode='prov';renderAnalytics();};
    btnViewCity.onclick=()=>{provViewMode='city';renderAnalytics();};
  }

  // Setup card-level daily filter pills & select dropdown
  const provPillsWrap=$('#prov-filter-pills');
  if(provPillsWrap){
    provPillsWrap.querySelectorAll('.prov-pill-btn').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.provDate===selectedProvDate);
      btn.onclick=()=>{
        selectedProvDate=btn.dataset.provDate;
        const sel=$('#prov-date-select');
        if(sel)sel.value=(['today','yesterday','7days','all'].includes(selectedProvDate)?selectedProvDate:'all');
        renderAnalytics();
      };
    });
  }

  const provSelect=$('#prov-date-select');
  if(provSelect){
    const availDays=(rawCurrent.dailyTrend||[]).map(d=>d.date).filter(Boolean);
    provSelect.replaceChildren();
    const optAll=document.createElement('option');
    optAll.value='all';
    optAll.textContent='-- Semua Sesuai Periode --';
    provSelect.append(optAll);
    for(const dk of availDays){
      const opt=document.createElement('option');
      opt.value=dk;
      opt.textContent=fmtDateIndo(dk);
      if(selectedProvDate===dk)opt.selected=true;
      provSelect.append(opt);
    }
    provSelect.onchange=()=>{
      selectedProvDate=provSelect.value;
      if(provPillsWrap){
        provPillsWrap.querySelectorAll('.prov-pill-btn').forEach(b=>{
          b.classList.toggle('active',b.dataset.provDate===selectedProvDate);
        });
      }
      renderAnalytics();
    };
  }

  // Calculate province / city slice based on selectedProvDate
  let activeProvData=current;
  if(selectedProvDate!=='all'){
    let subDates=[];
    const now=new Date(Date.now()+7*3600000);
    const todayStr=now.toISOString().slice(0,10);
    const yesterdayDate=new Date(now.getTime()-86400000);
    const yesterdayStr=yesterdayDate.toISOString().slice(0,10);

    if(selectedProvDate==='today'){
      subDates=[todayStr];
    }else if(selectedProvDate==='yesterday'){
      subDates=[yesterdayStr];
    }else if(selectedProvDate==='7days'){
      for(let i=0;i<7;i++){
        const dt=new Date(now.getTime()-i*86400000);
        subDates.push(dt.toISOString().slice(0,10));
      }
    }else{
      subDates=[selectedProvDate];
    }
    const subRange={dates:subDates,isSingleDay:subDates.length===1,isFullMonth:false};
    activeProvData=computePeriodSlice(rawCurrent,subRange)||current;
  }

  const regBody=$('#analytics-region-rows');
  if(regBody){
    regBody.replaceChildren();
    if(provViewMode==='prov'){
      const provs=activeProvData.provinces||[];
      if(!provs.length){
        emptyRow(regBody,5,'Belum ada data provinsi pengunjung pada tanggal/periode ini.');
      }else{
        for(const p of provs){
          const tr=document.createElement('tr');
          const tdProv=document.createElement('td');
          const wrap=document.createElement('div');
          wrap.className='prov-name-wrap';
          const title=document.createElement('strong');
          title.className='prov-name-title';
          title.textContent=`📍 ${p.province}`;
          wrap.append(title);

          if(p.cities&&p.cities.length){
            const citiesEl=document.createElement('div');
            citiesEl.className='prov-cities-list';
            const cityNames=p.cities.map(c=>`${c.name.replace(/\s*\([^)]*\)/,'').trim()} (${c.uniqueVisitors||1})`);
            citiesEl.textContent='Kota: '+cityNames.join(', ');
            wrap.append(citiesEl);
          }
          tdProv.append(wrap);

          const tdUniq=document.createElement('td');
          const pU=document.createElement('span');
          pU.className='pill-num';
          pU.textContent=`${fmtNum(p.uniqueVisitors)} orang`;
          tdUniq.append(pU);

          const tdViews=document.createElement('td');
          tdViews.textContent=`${fmtNum(p.totalViews)}x`;

          const tdWa=document.createElement('td');
          const pW=document.createElement('span');
          pW.className='pill-num wa';
          pW.textContent=`${fmtNum(p.totalWaClicks)} klik (${fmtNum(p.uniqueWaClickers)} org)`;
          tdWa.append(pW);

          const tdConv=document.createElement('td');
          tdConv.textContent=`${p.conversionRate}%`;

          tr.append(tdProv,tdUniq,tdViews,tdWa,tdConv);
          regBody.append(tr);
        }
      }
    }else{
      const regs=activeProvData.regions||[];
      if(!regs.length){
        emptyRow(regBody,5,'Belum ada data wilayah kota pengunjung pada tanggal/periode ini.');
      }else{
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

const SVG_EYE='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const SVG_EYE_OFF='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

function initPasswordToggles(){
  document.querySelectorAll('.btn-toggle-password').forEach(btn=>{
    btn.onclick=()=>{
      const wrap=btn.closest('.password-input-wrap');
      if(!wrap)return;
      const input=wrap.querySelector('input');
      if(!input)return;
      const willShow=input.type==='password';
      input.type=willShow?'text':'password';
      btn.innerHTML=willShow?SVG_EYE_OFF:SVG_EYE;
      const label=willShow?'Sembunyikan kata sandi':'Tampilkan kata sandi';
      btn.setAttribute('aria-label',label);
      btn.setAttribute('title',label);
    };
  });
}

function resetPasswordToggles(formEl){
  if(!formEl)return;
  formEl.querySelectorAll('.password-input-wrap').forEach(wrap=>{
    const input=wrap.querySelector('input');
    const btn=wrap.querySelector('.btn-toggle-password');
    if(input)input.type='password';
    if(btn){
      btn.innerHTML=SVG_EYE;
      btn.setAttribute('aria-label','Tampilkan kata sandi');
      btn.setAttribute('title','Tampilkan kata sandi');
    }
  });
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
      resetPasswordToggles(e.target);
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
    resetPasswordToggles(e.target);
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

const bannerSettingsForm=$('#banner-settings-form');
if(bannerSettingsForm){
  bannerSettingsForm.onsubmit=async e=>{
    e.preventDefault();
    const btn=$('#save-banner-settings-btn');
    const msg=$('#banner-settings-notice');
    btn.disabled=true;
    if(msg)msg.textContent='Menyimpan…';
    try{
      const temaBannerGroups={};
      BANNER_CONFIG_DEFS.forEach(bDef=>{
        const titleInput=$(`.banner-title-input[data-banner="${bDef.key}"]`);
        const subInput=$(`.banner-sub-input[data-banner="${bDef.key}"]`);
        const catCbs=Array.from(document.querySelectorAll(`.banner-cat-cb[data-banner="${bDef.key}"]:checked`));
        const defCatSelect=$(`#banner-defcat-${bDef.key}`);
        const subCbs=Array.from(document.querySelectorAll(`.banner-subcat-cb[data-banner="${bDef.key}"]:checked`));

        const imgInput=document.getElementById(`banner-img-${bDef.key}`);
        temaBannerGroups[bDef.key]={
          name:bDef.label,
          image:imgInput?imgInput.value.trim():bDef.defaultImage,
          title:titleInput?titleInput.value.trim():bDef.defaultTitle,
          sub:subInput?subInput.value.trim():bDef.defaultSub,
          categories:catCbs.map(cb=>cb.value),
          defaultCat:defCatSelect?defCatSelect.value:'',
          subcategories:subCbs.map(cb=>cb.value)
        };
      });

      settings=await api('/api/admin/settings','POST',{temaBannerGroups});
      renderBannerSettings();
      if(msg){
        msg.textContent='✓ Pengaturan gambar & tema berhasil disimpan';
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

const pageThumbnailsForm=$('#page-thumbnails-form');
if(pageThumbnailsForm){
  pageThumbnailsForm.onsubmit=async e=>{
    e.preventDefault();
    const btn=$('#save-page-thumbnails-btn');
    const msg=$('#page-thumbnails-notice');
    btn.disabled=true;
    if(msg)msg.textContent='Menyimpan…';
    try{
      const pageThumbnails={};
      PAGE_THUMBNAIL_DEFS.forEach(pDef=>{
        const imgInput=document.getElementById(`page-thumb-img-${pDef.key}`);
        const titleInput=document.getElementById(`page-thumb-title-${pDef.key}`);
        const descInput=document.getElementById(`page-thumb-desc-${pDef.key}`);

        pageThumbnails[pDef.key]={
          name:pDef.label,
          image:imgInput?imgInput.value.trim():pDef.defaultImage,
          title:titleInput?titleInput.value.trim():pDef.defaultTitle,
          description:descInput?descInput.value.trim():pDef.defaultDesc
        };
      });

      settings=await api('/api/admin/settings','POST',{pageThumbnails});
      renderPageThumbnailSettings();
      if(msg){
        msg.textContent='✓ Thumbnail sosial media berhasil disimpan';
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

initPasswordToggles();
load();
