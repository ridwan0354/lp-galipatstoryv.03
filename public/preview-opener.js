// Repair the existing invitation's opener; do not create another button.
(() => {
  const openerSelector = '#btnOpens, #tombolbuka, #tombol-buka, [id*="tombol-buka"], [id*="tombolbuka"], [id*="btnOpen"], a[href="#open"], a[href$="#open"], .btn-open-invitation, [class*="btn-open"]';
  let opened = false;
  let content;
  const covers = new Set();

  // Safe mock for requestFullscreen so permission policy or sandboxing never throws an unhandled error
  try {
    const noop = () => Promise.resolve();
    if (typeof Element !== 'undefined') {
      Element.prototype.requestFullscreen = noop;
      Element.prototype.webkitRequestFullscreen = noop;
    }
    if (typeof Document !== 'undefined') {
      Document.prototype.requestFullscreen = noop;
      Document.prototype.webkitRequestFullscreen = noop;
    }
  } catch (_) {}

  function isOpenLink(node) {
    if (!node) return false;
    return Boolean(
      node.matches?.(openerSelector) ||
      node.closest?.(openerSelector) ||
      /\bbuka\s+undangan\b/i.test(node.textContent || '')
    );
  }

  function forceStyle(element, property, value) {
    if (element && (element.style.getPropertyValue(property) !== value || element.style.getPropertyPriority(property) !== 'important')) {
      element.style.setProperty(property, value, 'important');
    }
  }

  function unlock() {
    window.onscroll = null;
    for (const root of [document.documentElement, document.body]) {
      if (root) {
        forceStyle(root, 'overflow', 'auto');
        forceStyle(root, 'overflow-y', 'auto');
        forceStyle(root, 'height', 'auto');
      }
    }
    document.querySelectorAll('.kolomPertama').forEach(node => forceStyle(node, 'display', 'block'));
    document.querySelectorAll('.not-open').forEach(node => node.classList.remove('not-open'));
    for (const cover of covers) {
      forceStyle(cover, 'display', 'none');
      forceStyle(cover, 'visibility', 'hidden');
    }
  }

  function openInvitation(event) {
    const target = event.target?.nodeType === 3 ? event.target.parentElement : event.target;
    const link = target?.closest?.('a, button, [role="button"], #tombol-buka, #tombolbuka, #btnOpens, .btn-open-invitation');
    if (!link || !isOpenLink(link)) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

    // Remove .not-open and hide button immediately (for SatuMomen themes)
    document.querySelectorAll('.not-open').forEach(node => node.classList.remove('not-open'));
    document.querySelectorAll('.btn-open-invitation').forEach(b => b.classList.add('d-none'));

    // Trigger theme-native opener methods if present
    try {
      if (typeof window.swipeUp === 'function') window.swipeUp();
      if (typeof window.playMusic === 'function') window.playMusic(true);
      if (typeof window.playInvitation === 'function') window.playInvitation();
    } catch (_) {}

    if (opened) return;

    for (const sel of ['#sec-cover', '#isi-cover', '#cover', '#_foto_galeri_bg', '.cover']) {
      for (const el of document.querySelectorAll(sel)) covers.add(el);
    }

    content = document.getElementById('open') || document.querySelector('.kolomPertama');
    // The source templates keep separate desktop/mobile covers, sometimes with duplicate IDs.
    for (const node of document.querySelectorAll('a, button, #btnOpens, #tombolbuka, #tombol-buka, [role="button"]')) {
      if (!isOpenLink(node)) continue;
      const cover = node.closest('section, header, .e-con, .e-parent, [id*="cover"]');
      if (cover && (!content || !cover.contains(content))) covers.add(cover);
    }

    if (!content) {
      for (const el of document.querySelectorAll('main, section, article, .elementor-section, .e-con')) {
        let insideCover = false;
        for (const cover of covers) {
          if (cover === el || cover.contains(el)) { insideCover = true; break; }
        }
        if (!insideCover) {
          content = el;
          break;
        }
      }
    }

    opened = true;
    document.documentElement.dataset.gsOpened = 'true';
    unlock();
    try {
      Object.defineProperty(window, 'onscroll', { get: () => null, set: () => {}, configurable: true });
    } catch {}

    for (const media of document.querySelectorAll('audio, .motionSection video')) {
      try { media.play()?.catch(() => {}); } catch {}
    }
    if (content && typeof content.scrollIntoView === 'function') {
      content.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else {
      window.scrollTo(0, 0);
    }
    // Late-loading template scripts must not restore the scroll lock or the cover.
    const observer = new MutationObserver(unlock);
    for (const node of [document.documentElement, document.body, ...covers]) {
      if (node) observer.observe(node, { attributes: true, attributeFilter: ['style', 'class'] });
    }
  }

  // Kept as a named function for the original anchor's inline click/touch handlers.
  window.gsOpenInvitation = openInvitation;
  document.addEventListener('click', openInvitation, true);
  let pointerStart;
  window.addEventListener('pointerdown', event => { pointerStart = {x:event.clientX,y:event.clientY,id:event.pointerId}; }, true);
  window.addEventListener('pointerup', event => {if(pointerStart?.id===event.pointerId&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)<12)openInvitation(event);pointerStart=null;}, true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')window.parent.postMessage({type:'gs-preview-close'},'*');});
  document.addEventListener('touchend', openInvitation, { capture: true, passive: false });
})();
