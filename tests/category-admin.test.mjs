import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('category creation and listing for admin and public catalog', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'galipat-cat-test-'));
  let child;
  const port = 14304, base = `http://127.0.0.1:${port}`, origin = base;

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

  let cookie = '';
  async function api(route, method = 'GET', body, withAuth = true) {
    return fetch(base + route, {
      method,
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        ...(withAuth ? { Cookie: cookie } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }

  try {
    await fs.mkdir(path.join(dir, 'public'));
    await fs.mkdir(path.join(dir, 'data'));
    await fs.writeFile(path.join(dir, 'data/themes.json'), '[]');
    await fs.copyFile(new URL('../server.mjs', import.meta.url), path.join(dir, 'server.mjs'));
    await fs.copyFile(new URL('../preview.mjs', import.meta.url), path.join(dir, 'preview.mjs'));

    await start();

    // 1. Check public /api/categories
    const publicCatsRes = await api('/api/categories', 'GET', undefined, false);
    assert.equal(publicCatsRes.status, 200);
    const publicCats = await publicCatsRes.json();
    assert.ok(Array.isArray(publicCats) && publicCats.length >= 8);

    // 2. Unauthenticated POST /api/admin/categories should fail
    const unauthPost = await api('/api/admin/categories', 'POST', { name: 'Kategori Baru' }, false);
    assert.equal(unauthPost.status, 401);

    // 3. Login as admin
    const secret = await fs.readFile(path.join(dir, 'AKSES-ADMIN.txt'), 'utf8');
    const password = secret.match(/Kata sandi awal: (.+)/)[1];
    const loginRes = await api('/api/login', 'POST', { username: 'admin', password });
    assert.equal(loginRes.status, 200);
    cookie = loginRes.headers.get('set-cookie').split(';')[0];

    // 4. Authenticated POST /api/admin/categories
    const createRes = await api('/api/admin/categories', 'POST', {
      name: 'Muslim Modern',
      note: 'Tanpa foto Rp89.000 · Dengan foto Rp119.000'
    });
    assert.equal(createRes.status, 200);
    const created = await createRes.json();
    assert.equal(created.name, 'Muslim Modern');
    assert.equal(created.note, 'Tanpa foto Rp89.000 · Dengan foto Rp119.000');

    // 5. Duplicate name should fail
    const dupRes = await api('/api/admin/categories', 'POST', { name: 'Muslim Modern' });
    assert.equal(dupRes.status, 400);

    // 6. Public /api/categories now includes newly added category
    const afterCats = await (await api('/api/categories', 'GET', undefined, false)).json();
    assert.ok(afterCats.some(c => c.name === 'Muslim Modern'));

    // 7. Restart server and verify persistence
    await stop();
    await start();
    const persistedCats = await (await api('/api/categories', 'GET', undefined, false)).json();
    assert.ok(persistedCats.some(c => c.name === 'Muslim Modern'));
  } finally {
    if (child?.exitCode === null) await stop();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
