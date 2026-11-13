import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('settings API: get public settings, admin authentication, update and persistence', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'galipat-settings-test-'));
  let child;
  const port = 14306, base = `http://127.0.0.1:${port}`, origin = base;

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

    // 1. Check public /api/settings
    const publicSettingsRes = await api('/api/settings', 'GET', undefined, false);
    assert.equal(publicSettingsRes.status, 200);
    const publicSettings = await publicSettingsRes.json();
    assert.equal(publicSettings.previewMode, 'new_tab');

    // 2. Unauthenticated POST /api/admin/settings fails with 401
    const unauthPost = await api('/api/admin/settings', 'POST', { previewMode: 'modal' }, false);
    assert.equal(unauthPost.status, 401);

    // 3. Login as admin
    const loginRes = await api('/api/login', 'POST', { username: 'admin', password: 'IniBulanAgustus2026' }, false);
    assert.equal(loginRes.status, 200);
    const setCookie = loginRes.headers.get('set-cookie');
    assert.ok(setCookie?.includes('gs_session='));
    cookie = setCookie.split(';')[0];

    // 4. Authenticated GET /api/admin/settings
    const authGet = await api('/api/admin/settings', 'GET');
    assert.equal(authGet.status, 200);
    const authSettings = await authGet.json();
    assert.equal(authSettings.previewMode, 'new_tab');

    // 5. Authenticated POST /api/admin/settings to 'modal'
    const updateRes = await api('/api/admin/settings', 'POST', { previewMode: 'modal' });
    assert.equal(updateRes.status, 200);
    const updated = await updateRes.json();
    assert.equal(updated.previewMode, 'modal');

    // 6. Verify data/settings.json file on disk
    const diskContent = JSON.parse(await fs.readFile(path.join(dir, 'data/settings.json'), 'utf8'));
    assert.equal(diskContent.previewMode, 'modal');

    // 7. Verify public /api/settings returns new setting
    const publicAfterUpdate = await (await api('/api/settings', 'GET', undefined, false)).json();
    assert.equal(publicAfterUpdate.previewMode, 'modal');

    // 8. Update back to 'new_tab'
    const backToNewTab = await (await api('/api/admin/settings', 'POST', { previewMode: 'new_tab' })).json();
    assert.equal(backToNewTab.previewMode, 'new_tab');

    // 9. Sanitization: unrecognized mode defaults to 'new_tab'
    const sanitizeRes = await (await api('/api/admin/settings', 'POST', { previewMode: 'unknown_stuff' })).json();
    assert.equal(sanitizeRes.previewMode, 'new_tab');
  } finally {
    if (child?.exitCode === null) await stop();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
