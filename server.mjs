import {renderPreview,supportsPreview} from './preview.mjs';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
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
if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return send(res,403,{error:'Asal permintaan tidak diizinkan.'});
if(p==='/api/themes'&&req.method==='GET')return send(res,200,themes.filter(t=>t.active));
if(p==='/api/categories'&&req.method==='GET'){const list=[...categories];const seen=new Set(list.map(c=>c.name));for(const t of themes.filter(x=>x.active)){if(!seen.has(t.category)){seen.add(t.category);list.push({id:t.category.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name:t.category,note:''});}}return send(res,200,list);}
if(p==='/api/login'&&req.method==='POST'){const ip=req.socket.remoteAddress;const a=attempts.get(ip)||{n:0,until:0};if(a.until>Date.now()&&a.n>=8)return send(res,429,{error:'Terlalu banyak percobaan. Coba lagi 15 menit.'});const b=await body(req);const check=scryptSync(String(b.password||''),auth.salt,64);if(b.username!=='admin'||!timingSafeEqual(check,Buffer.from(auth.hash,'hex'))){attempts.set(ip,{n:a.until>Date.now()?a.n+1:1,until:Date.now()+900000});return send(res,401,{error:'Nama pengguna atau kata sandi salah.'});}attempts.delete(ip);const id=randomBytes(32).toString('hex');sessions.set(id,Date.now()+8*3600000);res.setHeader('Set-Cookie',`gs_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);return send(res,200,{ok:true});}
if(!logged)return send(res,401,{error:'Silakan masuk kembali.'});
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
const file=path.resolve(publicDir,'.'+decodeURIComponent(targetPath));if(!file.startsWith(publicDir+path.sep))return send(res,403,{error:'Akses ditolak.'});try{const bytes=await fs.readFile(file);const ext=path.extname(file);let cacheHeader='no-cache';if(p.startsWith('/assets/')||p.startsWith('/vendor/')||p.startsWith('/favicon')||['.webp','.png','.jpg','.jpeg','.svg','.ico','.woff2'].includes(ext)){cacheHeader='public, max-age=31536000, immutable';}else if(p.startsWith('/uploads/')){cacheHeader='public, max-age=2592000';}else if(ext==='.css'||ext==='.js'){cacheHeader='public, max-age=31536000, immutable';}res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':cacheHeader});res.end(req.method==='HEAD'?undefined:bytes);}catch{if(!path.extname(targetPath)||path.extname(targetPath)==='.html'){res.writeHead(302,{'Location':'/','Cache-Control':'no-cache'});return res.end();}return send(res,404,{error:'Halaman tidak ditemukan.'});}
}catch(e){send(res,400,{error:e.message||'Permintaan gagal.'});}}).listen(Number(process.env.PORT||4303),process.env.HOST||'127.0.0.1',()=>console.log('Galipat Story v.03: http://'+(process.env.HOST||'127.0.0.1')+':'+(process.env.PORT||4303)));
