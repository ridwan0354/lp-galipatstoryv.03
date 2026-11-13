import {test} from 'node:test';import assert from 'node:assert/strict';import {renderPreview,supportsPreview} from '../preview.mjs';
test('preview restricted to original demo host',async()=>{assert.equal(supportsPreview('https://by.galipatstory.id/te03/'),true);assert.equal(supportsPreview('https://by.galipat-story.com/ts1-indonesia/'),true);assert.equal(supportsPreview('https://inv.galipat-story.com/preview/ondel-ondel'),true);assert.equal(supportsPreview('https://evil.example/'),false);await assert.rejects(renderPreview({demo:'https://evil.example/'},false));});
test('preview keeps UTF-8 and injects mobile opener before original scripts',async()=>{const original=globalThis.fetch;try{globalThis.fetch=async()=>new Response('<html><head></head><body>Undangan bahagia ❤️</body></html>');const html=await renderPreview({demo:'https://by.galipatstory.id/tanpa-te03/',demoPhoto:'https://by.galipatstory.id/te03/'},true);assert.ok(html.includes('<base href="https://by.galipatstory.id/te03/">'));assert.ok(html.includes('stopImmediatePropagation'));assert.ok(html.includes('scrollIntoView'));assert.ok(html.includes('bahagia ❤️'));assert.ok(html.includes('data:font/woff2;base64,'));assert.ok(html.includes('#tombolbuka'));assert.ok(html.includes('dataset.gsOpened'));assert.ok(!html.includes('visibility:hidden!important'));assert.ok(!html.includes('gs-preview-opened'));assert.ok(!html.includes('preview-open-cover'));}finally{globalThis.fetch=original;}});

test('preview preserves the single original opener and does not add a second control', async () => {
  const originalFetch = globalThis.fetch;
  const button = '<a class="elementor-button" href="#open"><span>Buka Undangan</span></a>';
  try {
    for (const id of ['btnOpens', 'tombolbuka']) {
      globalThis.fetch = async () => new Response('<html><head></head><body><section><div id="'+id+'">'+button+'</div></section><section id="open">Isi undangan</section></body></html>');
      const html = await renderPreview({demo:'https://by.galipatstory.id/te04/'}, false);
      assert.ok(html.includes('<span>Buka Undangan</span></a>'));
      assert.ok(html.includes('onclick="window.gsOpenInvitation(event);return false"'));
      assert.ok(html.includes('ontouchend="window.gsOpenInvitation(event);return false"'));
      assert.equal((html.match(/<a class="elementor-button"/g) || []).length, 1);
      assert.equal((html.match(/<button\b/g) || []).length, 0);
      assert.ok(!html.includes('visibility:hidden'));
    }
  } finally { globalThis.fetch = originalFetch; }
});

test('conflicting source openers are removed and early body observer waits for DOM', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('<html><head><script>mo.observe(document.body, {});</script></head><body><script>jQuery(function($){$("#tombolbuka").on("click", oldOpen);});</script><script>window.__CF$cv$params={};</script></body></html>');
    const html = await renderPreview({demo:'https://by.galipatstory.id/tanpa-te04/'},false);
    assert.ok(!html.includes('oldOpen'));
    assert.ok(!html.includes('__CF$cv$params'));
    assert.ok(html.includes('document.addEventListener("DOMContentLoaded",function(){mo.observe'));
  } finally { globalThis.fetch=originalFetch; }
});

test('preview injects styles to ensure elementor-invisible is visible and notSupport modal is hidden', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('<html><head></head><body><div class="elementor-invisible">Title</div><div id="notSupport">Alert</div></body></html>');
    const html = await renderPreview({demo:'https://by.galipatstory.id/tanpa-te04/'}, false);
    assert.ok(html.includes('.elementor-invisible{visibility:visible!important;opacity:1!important}'));
    assert.ok(html.includes('#notSupport{display:none!important}'));
  } finally { globalThis.fetch = originalFetch; }
});
