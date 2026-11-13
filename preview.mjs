import {readFile} from 'node:fs/promises';
const allowedHosts=new Set(['by.galipatstory.id','by.galipat-story.com','inv.galipat-story.com']);

const templateFontCache = new Map();

async function inlineTemplateFonts(html, baseUrl) {
  const importRegex = /@import\s+url\((['"]?)([^'"\)]*\/fonts\/[^'"\)]+)\1\);?/gi;
  const matches = [...html.matchAll(importRegex)];
  if (!matches.length) return html;

  let inlinedStyles = '';
  for (const match of matches) {
    const rawImportPath = match[2];
    let fullCssUrl;
    try {
      fullCssUrl = new URL(rawImportPath, baseUrl).href;
    } catch {
      continue;
    }

    let inlined = templateFontCache.get(fullCssUrl);
    if (!inlined) {
      try {
        const res = await fetch(fullCssUrl, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const cssText = await res.text();
          const urlMatches = [...cssText.matchAll(/url\((['"]?)([^'"\)]+)\1\)/g)];
          const woff2 = urlMatches.find(m => m[2].includes('.woff2'));
          const ttf = urlMatches.find(m => m[2].includes('.ttf'));
          const woff = urlMatches.find(m => m[2].includes('.woff'));
          const best = woff2 || ttf || woff;

          if (best) {
            const fontUrl = new URL(best[2].split('?')[0].split('#')[0], fullCssUrl).href;
            const fontRes = await fetch(fontUrl, { signal: AbortSignal.timeout(5000) });
            if (fontRes.ok) {
              const buf = Buffer.from(await fontRes.arrayBuffer());
              const mime = fontUrl.endsWith('.woff2') ? 'font/woff2' : fontUrl.endsWith('.woff') ? 'font/woff' : 'font/ttf';
              const format = fontUrl.endsWith('.woff2') ? 'woff2' : fontUrl.endsWith('.woff') ? 'woff' : 'truetype';
              const dataUri = `data:${mime};base64,${buf.toString('base64')}`;

              const familyMatch = cssText.match(/font-family:\s*(['"][^'"]+['"]|[^;}]+)/i);
              const family = familyMatch ? familyMatch[1] : '';
              if (family) {
                inlined = `@font-face {\n  font-family: ${family};\n  src: url("${dataUri}") format("${format}");\n  font-display: swap;\n}`;
              }
            }
          }
        }
      } catch (e) {
        // Fallback gracefully if font fetch fails
      }
      if (inlined) templateFontCache.set(fullCssUrl, inlined);
    }

    if (inlined) {
      html = html.replace(match[0], '');
      inlinedStyles += inlined + '\n';
    }
  }

  if (inlinedStyles) {
    html = html.replace(/<head[^>]*>/i, m => m + `<style id="gs-inlined-fonts">\n${inlinedStyles}</style>`);
  }

  return html;
}

export async function renderPreview(theme,photo){
 const source=new URL(photo?theme.demoPhoto:theme.demo);
 if(source.protocol!=='https:'||!allowedHosts.has(source.hostname))throw Error('Preview ini memakai tautan langsung.');
 const response=await fetch(source,{signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!response.ok)throw Error('Contoh sedang tidak tersedia.');
 let html='';let size=0;const decoder=new TextDecoder();for await(const chunk of response.body){size+=chunk.length;if(size>3000000)throw Error('Contoh terlalu besar.');html+=decoder.decode(chunk,{stream:true});}html+=decoder.decode();
 // The preview owns only the existing opener; omit source handlers that also control the cover.
 html=html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(tag,attributes,code)=>{
   if(/\bsrc\s*=/.test(attributes))return tag;
   if(code.includes('__CF$cv$params')||((code.includes('btnOpens')||code.includes('tombolbuka'))&&(code.includes('.on(')||code.includes('delaySection'))))return '';
   // This text-normalization snippet was inserted in <head> but observes body before it exists.
   if(code.includes('mo.observe(document.body'))return '<script'+attributes+'>document.addEventListener("DOMContentLoaded",function(){'+code+'});</script>';
   if(code.includes('const params = new URLSearchParams'))return '<script'+attributes+'>{\n'+code+'\n}</script>';
   return tag;
 });
 html=html.replace(/<a\b([^>]*\bhref=["']#open["'][^>]*)>/gi,(tag,attributes)=>'<a'+attributes.replace(/\s+on(?:click|touchend)=["'][\s\S]*?["']/gi,'')+' onclick="window.gsOpenInvitation(event);return false" ontouchend="window.gsOpenInvitation(event);return false">');
 const adapter = '<script>'+await readFile(new URL('./public/preview-opener.js',import.meta.url),'utf8')+'</script>';
 const fontFiles=['fa-solid-900.woff2','fa-regular-400.woff2','fa-brands-400.woff2','eicons.woff2'];
 const fontData=await Promise.all(fontFiles.map(async name=>'data:font/woff2;base64,'+(await readFile(new URL('./public/vendor/fonts/'+name,import.meta.url))).toString('base64')));
 const fonts=`<style>

 @font-face{font-family:'GS Icons Solid';font-style:normal;font-weight:900;src:url('${fontData[0]}') format('woff2');font-display:block}
 @font-face{font-family:'GS Icons Regular';font-style:normal;font-weight:400;src:url('${fontData[1]}') format('woff2');font-display:block}
 @font-face{font-family:'GS Icons Brands';font-style:normal;font-weight:400;src:url('${fontData[2]}') format('woff2');font-display:block}
 @font-face{font-family:'GS Elementor Icons';font-style:normal;font-weight:400;src:url('${fontData[3]}') format('woff2');font-display:block}
 .fa,.fas,.fa-solid,.fas:before,.fa:before{font-family:'GS Icons Solid'!important;font-weight:900!important;font-style:normal!important}
 .far,.fa-regular,.far:before{font-family:'GS Icons Regular'!important;font-weight:400!important;font-style:normal!important}
 .fab,.fa-brands,.fab:before{font-family:'GS Icons Brands'!important;font-weight:400!important;font-style:normal!important}
 [class^=eicon-],[class*=" eicon-"]{font-family:'GS Elementor Icons'!important}
 </style>`;
 // Keep external templates isolated in an opaque sandbox; never grant same-origin privileges.
 html=html.replace(/<head[^>]*>/i,match=>match+`<base href="${source.href.replaceAll('&','&amp;').replaceAll('"','&quot;')}">`+adapter+fonts);
 html=await inlineTemplateFonts(html, source);
 return html;
}
export function supportsPreview(url){try{return allowedHosts.has(new URL(url).hostname)}catch{return false}}
