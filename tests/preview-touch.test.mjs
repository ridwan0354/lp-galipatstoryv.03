import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile(new URL('../public/preview-opener.js',import.meta.url),'utf8');
function scene(){
 const handlers={document:{},window:{}};
 const style=()=>{const values=new Map();return {getPropertyValue:k=>values.get(k)?.value||'',getPropertyPriority:k=>values.get(k)?.priority||'',setProperty:(k,value,priority)=>values.set(k,{value,priority})};};
 const cover={style:style(),contains:()=>false};
 const column={style:style()};
 const content={scrollIntoView(){content.scrolled=true;}};
 const link={textContent:'Buka Undangan',matches:()=>true,closest:()=>cover};
 const span={nodeType:1,closest:()=>link};
 const root={style:style(),dataset:{}};
 const body={style:style()};
 const document={documentElement:root,body,addEventListener:(k,fn)=>handlers.document[k]=fn,getElementById:()=>content,querySelector:()=>column,querySelectorAll:selector=>selector==='.kolomPertama'?[column]:(selector.includes('tombolbuka')||selector.includes('tombol-buka'))?[link]:[]};
 const window={onscroll:()=>{},parent:{postMessage(){}},addEventListener:(k,fn)=>handlers.window[k]=fn};
 vm.runInNewContext(code,{document,window,MutationObserver:class{observe(){}},Math});
 const event=target=>({target,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}});
 return {handlers,window,root,body,column,cover,content,span,event};
}
test('touchend on text inside the native link opens the invitation exactly once',()=>{
 const s=scene();const event=s.event({nodeType:3,parentElement:s.span});
 s.handlers.document.touchend(event);
 assert.equal(s.root.dataset.gsOpened,'true');
 assert.equal(s.cover.style.getPropertyValue('display'),'none');
 assert.equal(s.column.style.getPropertyValue('display'),'block');
 assert.equal(s.body.style.getPropertyValue('overflow-y'),'auto');
 assert.equal(s.content.scrolled,true);
 assert.equal(event.prevented,true);
 s.window.gsOpenInvitation(s.event(s.span));
 assert.equal(s.root.dataset.gsOpened,'true');
});
test('pointer tap opens native link, but moving the pointer to scroll does not',()=>{
 const s=scene();s.handlers.window.pointerdown({pointerId:1,clientX:20,clientY:20});
 s.handlers.window.pointerup({...s.event(s.span),pointerId:1,clientX:20,clientY:55});
 assert.equal(s.root.dataset.gsOpened,undefined);
 s.handlers.window.pointerdown({pointerId:2,clientX:20,clientY:20});
 s.handlers.window.pointerup({...s.event(s.span),pointerId:2,clientX:21,clientY:21});
 assert.equal(s.root.dataset.gsOpened,'true');
});
test('premium theme with tombol-buka and sec-cover opens and unlocks smoothly',()=>{
 const handlers={document:{},window:{}};
 const style=()=>{const values=new Map();return {getPropertyValue:k=>values.get(k)?.value||'',getPropertyPriority:k=>values.get(k)?.priority||'',setProperty:(k,value,priority)=>values.set(k,{value,priority})};};
 const secCover={style:style(),contains:()=>false};
 const isiCover={style:style(),contains:()=>false};
 const mainContent={style:style(),scrollIntoView(){mainContent.scrolled=true;}};
 const link={textContent:'Buka Undangan',matches:selector=>selector.includes('tombol-buka'),closest:()=>secCover};
 const span={nodeType:1,closest:()=>link};
 const root={style:style(),dataset:{}};
 const body={style:style()};
 const document={documentElement:root,body,addEventListener:(k,fn)=>handlers.document[k]=fn,getElementById:id=>id==='sec-cover'?secCover:id==='isi-cover'?isiCover:null,querySelector:()=>null,querySelectorAll:selector=>{if(selector==='#sec-cover')return [secCover];if(selector==='#isi-cover')return [isiCover];if(selector.includes('tombol-buka'))return [link];if(selector.includes('main'))return [mainContent];return [];}};
 const window={onscroll:()=>{},parent:{postMessage(){}},addEventListener:(k,fn)=>handlers.window[k]=fn};
 vm.runInNewContext(code,{document,window,MutationObserver:class{observe(){}},Math,Object});
 const event=s=>({target:s,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}});
 handlers.document.click(event(span));
 assert.equal(root.dataset.gsOpened,'true');
 assert.equal(secCover.style.getPropertyValue('display'),'none');
 assert.equal(isiCover.style.getPropertyValue('display'),'none');
 assert.equal(body.style.getPropertyValue('overflow-y'),'auto');
 assert.equal(mainContent.scrolled,true);
});

test('floral theme with href="#cover" does not hide the content section #cover', () => {
  const handlers = { document: {}, window: {} };
  const style = () => {
    const values = new Map();
    return {
      getPropertyValue: k => values.get(k)?.value || '',
      getPropertyPriority: k => values.get(k)?.priority || '',
      setProperty: (k, value, priority) => values.set(k, { value, priority })
    };
  };
  const coverSection = { style: style(), contains: () => false };
  const mainContentCover = { style: style(), id: 'cover', contains: () => false, scrollIntoView() { this.scrolled = true; } };
  const link = {
    textContent: 'Buka Undangan',
    getAttribute: attr => attr === 'href' ? '#cover' : null,
    matches: () => true,
    closest: () => coverSection
  };
  const span = { nodeType: 1, closest: () => link };
  const root = { style: style(), dataset: {} };
  const body = { style: style() };
  const document = {
    documentElement: root,
    body,
    addEventListener: (k, fn) => handlers.document[k] = fn,
    getElementById: id => id === 'cover' ? mainContentCover : null,
    querySelector: () => null,
    querySelectorAll: () => [link]
  };
  const window = { onscroll: () => {}, parent: { postMessage() {} }, addEventListener: (k, fn) => handlers.window[k] = fn };
  vm.runInNewContext(code, { document, window, MutationObserver: class { observe() {} }, Math, Object });
  const event = s => ({ target: s, preventDefault() {}, stopImmediatePropagation() {} });
  handlers.document.click(event(span));
  assert.equal(root.dataset.gsOpened, 'true');
  assert.equal(coverSection.style.getPropertyValue('display'), 'none');
  // Content section #cover must NOT have display: none
  assert.notEqual(mainContentCover.style.getPropertyValue('display'), 'none');
  assert.equal(mainContentCover.scrolled, true);
});

test('animation theme with href="#home" scrolls directly to target #home', () => {
  const handlers = { document: {}, window: {} };
  const style = () => {
    const values = new Map();
    return {
      getPropertyValue: k => values.get(k)?.value || '',
      getPropertyPriority: k => values.get(k)?.priority || '',
      setProperty: (k, value, priority) => values.set(k, { value, priority })
    };
  };
  const coverSection = { style: style(), contains: () => false };
  const homeTarget = { style: style(), id: 'home', contains: () => false, scrollIntoView() { this.scrolled = true; } };
  const link = {
    textContent: 'Buka Undangan',
    getAttribute: attr => attr === 'href' ? '#home' : null,
    matches: () => true,
    closest: () => coverSection
  };
  const span = { nodeType: 1, closest: () => link };
  const root = { style: style(), dataset: {} };
  const body = { style: style() };
  const document = {
    documentElement: root,
    body,
    addEventListener: (k, fn) => handlers.document[k] = fn,
    getElementById: id => id === 'home' ? homeTarget : null,
    querySelector: () => null,
    querySelectorAll: () => [link]
  };
  const window = { onscroll: () => {}, parent: { postMessage() {} }, addEventListener: (k, fn) => handlers.window[k] = fn };
  vm.runInNewContext(code, { document, window, MutationObserver: class { observe() {} }, Math, Object });
  const event = s => ({ target: s, preventDefault() {}, stopImmediatePropagation() {} });
  handlers.document.click(event(span));
  assert.equal(root.dataset.gsOpened, 'true');
  assert.equal(coverSection.style.getPropertyValue('display'), 'none');
  assert.equal(homeTarget.scrolled, true);
});

test('exclusive theme TE#06 with nested e-parent cover and stop-scrolling opens and unlocks smoothly', () => {
  const handlers = { document: {}, window: {} };
  const style = () => {
    const values = new Map();
    return {
      getPropertyValue: k => values.get(k)?.value || '',
      getPropertyPriority: k => values.get(k)?.priority || '',
      setProperty: (k, value, priority) => values.set(k, { value, priority })
    };
  };
  const rootCover = {
    style: style(),
    contains: target => target === childCover || target === link,
    nextElementSibling: null
  };
  const childCover = {
    style: style(),
    parentElement: rootCover,
    contains: target => target === link
  };
  const mainContent = {
    style: style(),
    contains: () => false,
    scrollIntoView() { this.scrolled = true; }
  };
  rootCover.nextElementSibling = mainContent;

  const link = {
    textContent: 'Buka Undangan',
    getAttribute: () => '#',
    matches: () => true,
    closest: selector => {
      if (selector.includes('.cover') || selector.includes('.e-parent')) return rootCover;
      if (selector.includes('.e-con')) return childCover;
      return null;
    }
  };
  const span = { nodeType: 1, closest: () => link };
  const root = { style: style(), dataset: {} };
  const body = {
    style: style(),
    classList: {
      classes: new Set(['stop-scrolling']),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    }
  };

  let showAllSectCalled = false;
  let enableScrollCalled = false;
  let audioPlayed = false;

  const window = {
    onscroll: () => {},
    parent: { postMessage() {} },
    addEventListener: (k, fn) => handlers.window[k] = fn,
    showAllSect: () => { showAllSectCalled = true; },
    enableScroll: () => { enableScrollCalled = true; },
    _playAudio: () => { audioPlayed = true; }
  };

  const document = {
    documentElement: root,
    body,
    addEventListener: (k, fn) => handlers.document[k] = fn,
    getElementById: id => id === 'tombolbuka' ? link : null,
    querySelector: () => null,
    querySelectorAll: () => [link]
  };

  vm.runInNewContext(code, { document, window, MutationObserver: class { observe() {} }, Math, Object });
  const event = s => ({ target: s, preventDefault() {}, stopImmediatePropagation() {} });
  handlers.document.click(event(span));

  assert.equal(root.dataset.gsOpened, 'true');
  assert.equal(rootCover.style.getPropertyValue('display'), 'none');
  assert.equal(body.classList.contains('stop-scrolling'), false);
  assert.equal(showAllSectCalled, true);
  assert.equal(enableScrollCalled, true);
  assert.equal(audioPlayed, true);
  assert.equal(mainContent.scrolled, true);
});
