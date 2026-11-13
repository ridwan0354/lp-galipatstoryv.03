import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const secretPath = path.join(root, 'data/admin-secret.json');
const newPassword = process.argv[2] || 'IniBulanAgustus2026';
const salt = randomBytes(16).toString('hex');
const auth = {
  version: 2,
  salt,
  hash: scryptSync(newPassword, salt, 64).toString('hex')
};

await fs.writeFile(secretPath, JSON.stringify(auth), { mode: 0o600 });
console.log(`✅ Kata sandi admin berhasil diperbarui menjadi: ${newPassword}`);
console.log(`🌐 Halaman admin: /kamu`);
