import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('routes /tema and /web-invitation serve respective landing pages', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'galipat-routes-test-'));
  let child;
  const port = 14305, base = `http://127.0.0.1:${port}`;

  async function start() {
    child = spawn(process.execPath, [path.join(dir, 'server.mjs')], {
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await new Promise((resolve, reject) => {
      child.stdout.once('data', resolve);
      child.once('exit', () => reject(Error('Server stopped')));
      child.once('error', reject);
    });
  }

  async function stop() {
    child.kill();
    await new Promise(r => child.once('exit', r));
  }

  try {
    await fs.mkdir(path.join(dir, 'public'));
    await fs.mkdir(path.join(dir, 'data'));
    await fs.writeFile(path.join(dir, 'data/themes.json'), '[]');
    await fs.copyFile(new URL('../server.mjs', import.meta.url), path.join(dir, 'server.mjs'));
    await fs.copyFile(new URL('../preview.mjs', import.meta.url), path.join(dir, 'preview.mjs'));
    await fs.copyFile(new URL('../public/tema.html', import.meta.url), path.join(dir, 'public/tema.html'));
    await fs.copyFile(new URL('../public/web-invitation.html', import.meta.url), path.join(dir, 'public/web-invitation.html'));
    await fs.copyFile(new URL('../public/index.html', import.meta.url), path.join(dir, 'public/index.html'));
    await fs.copyFile(new URL('../public/admin.html', import.meta.url), path.join(dir, 'public/admin.html'));

    await start();

    // Check /kamu serves admin panel, /admin redirects to /
    const rKamu = await fetch(`${base}/kamu`);
    assert.equal(rKamu.status, 200);
    const htmlKamu = await rKamu.text();
    assert.ok(htmlKamu.includes('RUANG KELOLA KATALOG'));
    assert.ok(!htmlKamu.includes('AKSES-ADMIN.txt'));

    const rKamuSlash = await fetch(`${base}/kamu/`);
    assert.equal(rKamuSlash.status, 200);

    const rAdmin = await fetch(`${base}/admin`, { redirect: 'manual' });
    assert.equal(rAdmin.status, 302);
    assert.equal(rAdmin.headers.get('location'), '/');

    const rAdminSlash = await fetch(`${base}/admin/`, { redirect: 'manual' });
    assert.equal(rAdminSlash.status, 302);
    assert.equal(rAdminSlash.headers.get('location'), '/');

    const rAdminHtml = await fetch(`${base}/admin.html`, { redirect: 'manual' });
    assert.equal(rAdminHtml.status, 302);
    assert.equal(rAdminHtml.headers.get('location'), '/');

    const rRandom = await fetch(`${base}/coba-halaman-acak`, { redirect: 'manual' });
    assert.equal(rRandom.status, 302);
    assert.equal(rRandom.headers.get('location'), '/');

    // Follow redirect on /admin brings visitor to homepage
    const rAdminFollow = await fetch(`${base}/admin`);
    assert.equal(rAdminFollow.status, 200);
    const htmlAdminFollow = await rAdminFollow.text();
    assert.ok(htmlAdminFollow.includes('Galipat Story'));

    // Check /tema and /tema/
    const rTema1 = await fetch(`${base}/tema`);
    assert.equal(rTema1.status, 200);
    const htmlTema1 = await rTema1.text();
    assert.ok(htmlTema1.includes('Tema Undangan'));
    assert.ok(htmlTema1.includes('class="tema-page hide-pricing-page"'));
    assert.ok(!htmlTema1.includes('Harga terendah'));

    const rTema2 = await fetch(`${base}/tema/`);
    assert.equal(rTema2.status, 200);

    // Check /web-invitation and /web-invitation/
    const rWeb1 = await fetch(`${base}/web-invitation`);
    assert.equal(rWeb1.status, 200);
    const htmlWeb1 = await rWeb1.text();
    assert.ok(htmlWeb1.includes('Undangan Digital Web'));
    assert.ok(htmlWeb1.includes('class="hide-pricing-page"'));
    assert.ok(!htmlWeb1.includes('Rp79.000'));
    assert.ok(!htmlWeb1.includes('Harga mulai'));
    assert.ok(!htmlWeb1.includes('Harga terendah'));

    const rWeb2 = await fetch(`${base}/web-invitation/`);
    assert.equal(rWeb2.status, 200);
  } finally {
    if (child?.exitCode === null) await stop();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
