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

  // Safe mock for storage so sandboxed iframes or Safari / in-app browsers never crash on SecurityError
  try {
    const createMemoryStorage = () => {
      let store = {};
      return {
        getItem: key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
        setItem: (key, val) => { store[key] = String(val); },
        removeItem: key => { delete store[key]; },
        clear: () => { store = {}; },
        key: i => Object.keys(store)[i] || null,
        get length() { return Object.keys(store).length; }
      };
    };
    if (typeof window !== 'undefined') {
      try {
        const testK = '__gs_t__';
        window.sessionStorage?.setItem(testK, '1');
        window.sessionStorage?.removeItem(testK);
      } catch (_) {
        try {
          Object.defineProperty(window, 'sessionStorage', { value: createMemoryStorage(), configurable: true, enumerable: true });
        } catch (_) {}
      }
      try {
        const testK = '__gs_t__';
        window.localStorage?.setItem(testK, '1');
        window.localStorage?.removeItem(testK);
      } catch (_) {
        try {
          Object.defineProperty(window, 'localStorage', { value: createMemoryStorage(), configurable: true, enumerable: true });
        } catch (_) {}
      }
    }
  } catch (_) {}

  // Scroll management: keep initial view at top (0, 0)
  try {
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo(0, 0);
    }
  } catch (_) {}

  function lockCover() {
    if (opened) return;
    for (const root of [document.documentElement, document.body]) {
      if (root) {
        forceStyle(root, 'overflow', 'hidden');
        forceStyle(root, 'overflow-y', 'hidden');
        forceStyle(root, 'height', '100%');
      }
    }
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo(0, 0);
    }
  }

  function revealInvisible() {
    try {
      const invs = document.querySelectorAll?.('.elementor-invisible') || [];
      for (const el of invs) {
        el.classList?.remove?.('elementor-invisible');
        el.style?.setProperty?.('visibility', 'visible', 'important');
        el.style?.setProperty?.('opacity', '1', 'important');
      }
      const notSupp = document.getElementById?.('notSupport');
      if (notSupp) notSupp.remove();
    } catch (_) {}
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener?.('DOMContentLoaded', () => { lockCover(); revealInvisible(); });
    } else {
      lockCover();
      revealInvisible();
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener?.('load', () => { if (!opened) lockCover(); revealInvisible(); });
  }

  function isOpenLink(node) {
    if (!node) return false;
    return Boolean(
      node.matches?.(openerSelector) ||
      node.closest?.(openerSelector) ||
      /\bbuka\s+undangan\b/i.test(node.textContent || '')
    );
  }

  function forceStyle(element, property, value) {
    if (element && element.style && (element.style.getPropertyValue?.(property) !== value || element.style.getPropertyPriority?.(property) !== 'important')) {
      element.style.setProperty?.(property, value, 'important');
    }
  }

  function unlock() {
    window.onscroll = null;
    document.body?.classList?.remove?.('stop-scrolling');
    for (const root of [document.documentElement, document.body]) {
      if (root) {
        forceStyle(root, 'overflow', 'auto');
        forceStyle(root, 'overflow-y', 'auto');
        forceStyle(root, 'height', 'auto');
        root.classList?.remove?.('stop-scrolling');
      }
    }
    document.querySelectorAll('.kolomPertama').forEach(node => forceStyle(node, 'display', 'block'));
    document.querySelectorAll('.not-open').forEach(node => node.classList?.remove?.('not-open'));
    for (const cover of covers) {
      forceStyle(cover, 'display', 'none');
      forceStyle(cover, 'visibility', 'hidden');
    }
    try {
      if (typeof window.showAllSect === 'function') window.showAllSect();
      if (typeof window.enableScroll === 'function') window.enableScroll();
      document.querySelectorAll?.('.elementor-top-section, .elementor-section').forEach?.(el => {
        if (!covers.has(el) && el.style?.display === 'none') el.style.display = '';
      });
    } catch (_) {}
  }

  function openInvitation(event) {
    const target = event.target?.nodeType === 3 ? event.target.parentElement : event.target;
    const link = target?.closest?.('a, button, [role="button"], #tombol-buka, #tombolbuka, #btnOpens, .btn-open-invitation');
    if (!link || !isOpenLink(link)) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

    // Remove .not-open and hide button immediately (for SatuMomen themes)
    document.querySelectorAll('.not-open').forEach(node => node.classList?.remove?.('not-open'));
    document.querySelectorAll('.btn-open-invitation').forEach(b => b.classList?.add?.('d-none'));

    // Trigger theme-native opener methods if present
    try {
      if (typeof window.swipeUp === 'function') window.swipeUp();
      if (typeof window.playMusic === 'function') window.playMusic(true);
      if (typeof window.playInvitation === 'function') window.playInvitation();
      if (typeof window._playAudio === 'function') window._playAudio();
      if (typeof window.showAllSect === 'function') window.showAllSect();
      if (typeof window.enableScroll === 'function') window.enableScroll();
      const tb = document.getElementById?.('tombolbuka') || document.getElementById?.('tombol-buka');
      if (typeof tb?.onclick === 'function') tb.onclick(event);
    } catch (_) {}

    if (opened) return;

    let targetEl = null;
    const href = (link.getAttribute?.('href') || '').trim();
    if (href.startsWith('#') && href.length > 1) {
      const targetId = href.slice(1);
      targetEl = document.getElementById?.(targetId) ||
                 document.querySelector?.(`[id="${targetId}"]`) ||
                 document.querySelector?.(`a[name="${targetId}"]`);
    }

    content = targetEl ||
              document.getElementById?.('open') ||
              document.getElementById?.('home') ||
              document.getElementById?.('content') ||
              document.querySelector?.('.kolomPertama');

    let buttonCover = link.closest?.('.cover, #sec-cover, #isi-cover, .e-parent, .elementor-top-section, section, header') ||
                      link.closest?.('.e-con');
    if (buttonCover?.parentElement?.closest?.('.cover, #sec-cover, #isi-cover')) {
      buttonCover = buttonCover.parentElement.closest('.cover, #sec-cover, #isi-cover');
    }
    if (buttonCover && buttonCover !== content && !buttonCover.contains?.(content)) {
      covers.add(buttonCover);
    }

    for (const sel of ['#sec-cover', '#isi-cover']) {
      const els = document.querySelectorAll?.(sel) || [];
      for (const el of els) {
        if (el !== content && !el.contains?.(content)) covers.add(el);
      }
    }

    // Additional covers for openers that are not inside buttonCover
    for (const node of (document.querySelectorAll?.('a, button, #btnOpens, #tombolbuka, #tombol-buka, [role="button"]') || [])) {
      if (!isOpenLink(node)) continue;
      let c = node.closest?.('.cover, #sec-cover, #isi-cover, .e-parent, .elementor-top-section, section, header') ||
              node.closest?.('.e-con');
      if (c?.parentElement?.closest?.('.cover, #sec-cover, #isi-cover')) {
        c = c.parentElement.closest('.cover, #sec-cover, #isi-cover');
      }
      if (c && c !== content && !c.contains?.(content)) covers.add(c);
    }

    if (!content) {
      // First try immediate next element sibling of buttonCover that is not in covers
      let sib = buttonCover?.nextElementSibling;
      while (sib) {
        if (!covers.has(sib) && !sib.contains?.(link)) {
          content = sib;
          break;
        }
        sib = sib.nextElementSibling;
      }
    }

    if (!content) {
      for (const el of (document.querySelectorAll?.('main, section, article, .elementor-section, .e-con.e-parent, .e-con') || [])) {
        let insideCover = false;
        for (const cover of covers) {
          if (cover === el || cover.contains?.(el)) { insideCover = true; break; }
        }
        if (!insideCover) {
          content = el;
          break;
        }
      }
    }

    // Safety: ensure content (and its parents) is never hidden
    if (content) {
      covers.delete(content);
      for (const c of covers) {
        if (c.contains?.(content)) covers.delete(c);
      }
    }

    opened = true;
    document.documentElement.dataset.gsOpened = 'true';
    unlock();
    try {
      Object.defineProperty(window, 'onscroll', { get: () => null, set: () => {}, configurable: true });
    } catch {}

    for (const media of (document.querySelectorAll?.('audio, .motionSection video') || [])) {
      try { media.play?.()?.catch?.(() => {}); } catch {}
    }
    if (content && typeof content.scrollIntoView === 'function') {
      content.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else {
      window.scrollTo?.(0, 0);
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
