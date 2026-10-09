import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createApp, TERMS_VERSION } from '../src/app.js';
import { openDatabase } from '../src/database.js';
import { loadConfig } from '../src/config.js';

const password = 'a unique test passphrase 2026';
const registration = (email = 'alex@example.com') => ({
  name: 'Alex', email, password, termsVersion: TERMS_VERSION,
  consents: { peerSupport: true, emergency: true, ageAndTerms: true },
});

async function fixture(filename = ':memory:', overrides = {}) {
  const db = openDatabase(filename);
  const config = { ...loadConfig({}), ...overrides };
  const app = await createApp({ db, config });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    db,
    async request(endpoint, { body, cookie, headers = {}, raw } = {}) {
      return fetch(`${url}${endpoint}`, {
        method: body === undefined && raw === undefined ? 'GET' : 'POST',
        headers: {
          ...(body !== undefined || raw !== undefined ? {
            'Content-Type': 'application/json', 'X-Safe-Space': '1', 'Origin': config.origin,
          } : {}),
          ...(cookie ? { Cookie: cookie } : {}), ...headers,
        },
        body: raw === undefined ? (body === undefined ? undefined : JSON.stringify(body)) : raw,
      });
    },
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
      db.close();
    },
  };
}
const cookieOf = (response) => response.headers.get('set-cookie').split(';')[0];

test('registration hashes passwords, records consent, and issues a protected session', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const response = await f.request('/api/auth/register', { body: registration(' ALEX@Example.COM ') });
  assert.equal(response.status, 201);
  const { user } = await response.json();
  assert.equal(user.email, 'alex@example.com');
  assert.equal(user.name, 'Alex');
  assert.equal(user.password_hash, undefined);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /SameSite=Strict/);
  const record = f.db.prepare('SELECT * FROM users').get();
  assert.match(record.password_hash, /^scrypt\$32768\$8\$3\$/);
  assert.ok(!record.password_hash.includes(password));
  assert.equal(record.terms_version, TERMS_VERSION);
  assert.ok(record.terms_accepted_at > 0);
  const token = cookieOf(response).split('=')[1];
  assert.notEqual(f.db.prepare('SELECT token_hash FROM sessions').get().token_hash, token);
  const me = await f.request('/api/auth/me', { cookie: cookieOf(response) });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.id, user.id);
  const duplicate = await f.request('/api/auth/register', { body: registration('alex@EXAMPLE.com') });
  assert.equal(duplicate.status, 409);
});

test('registration validates passwords, names and every current consent on the server', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  for (const body of [
    { ...registration(), password: 'short' },
    { ...registration(), name: 'A' },
    { ...registration(), email: 'invalid' },
    { ...registration(), termsVersion: 'old-terms' },
    { ...registration(), consents: { peerSupport: true, emergency: false, ageAndTerms: true } },
    { ...registration(), consents: { peerSupport: 'true', emergency: true, ageAndTerms: true } },
  ]) {
    const response = await f.request('/api/auth/register', { body });
    assert.equal(response.status, 400);
  }
  assert.equal(f.db.prepare('SELECT count(*) AS count FROM users').get().count, 0);
});

test('login rejects incorrect credentials, rotates sessions and logout invalidates them', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  const registered = await f.request('/api/auth/register', { body: registration() });
  const oldCookie = cookieOf(registered);
  const wrong = await f.request('/api/auth/login', { body: { email: 'alex@example.com', password: 'wrong' } });
  const unknown = await f.request('/api/auth/login', { body: { email: 'nobody@example.com', password } });
  assert.equal(wrong.status, 401); assert.equal(unknown.status, 401);
  assert.deepEqual(await wrong.json(), await unknown.json());
  const login = await f.request('/api/auth/login', { body: { email: 'ALEX@example.com', password }, cookie: oldCookie });
  assert.equal(login.status, 200);
  const newCookie = cookieOf(login);
  assert.notEqual(newCookie, oldCookie);
  assert.equal((await f.request('/api/auth/me', { cookie: oldCookie })).status, 401);
  assert.equal((await f.request('/api/auth/me', { cookie: newCookie })).status, 200);
  assert.equal((await f.request('/api/auth/logout', { body: {}, cookie: newCookie })).status, 204);
  assert.equal((await f.request('/api/auth/me', { cookie: newCookie })).status, 401);
  assert.equal((await f.request('/api/auth/logout', { body: {}, cookie: newCookie })).status, 204);
});

test('forged, expired and missing sessions cannot authenticate', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  assert.equal((await f.request('/api/auth/me')).status, 401);
  for (const cookie of ['ss_session=forged', `ss_session=${'A'.repeat(43)}`, 'ss_session=%not-valid']) {
    assert.equal((await f.request('/api/auth/me', { cookie })).status, 401);
  }
  const response = await f.request('/api/auth/register', { body: registration() });
  f.db.prepare('UPDATE sessions SET expires_at = ?').run(Date.now() - 1000);
  assert.equal((await f.request('/api/auth/me', { cookie: cookieOf(response) })).status, 401);
});

test('cross-origin, malformed and oversized requests are rejected; private files stay private', async (t) => {
  const f = await fixture(); t.after(() => f.close());
  for (const headers of [
    { Origin: 'https://attacker.example' }, { 'X-Safe-Space': '' },
    { 'Content-Type': 'text/plain' }, { 'Sec-Fetch-Site': 'cross-site' },
  ]) {
    assert.equal((await f.request('/api/auth/register', { body: registration(), headers })).status, 403);
  }
  assert.equal((await f.request('/api/auth/login', { raw: '{broken' })).status, 400);
  assert.equal((await f.request('/api/auth/login', { raw: JSON.stringify({ value: 'x'.repeat(9000) }) })).status, 413);
  assert.equal((await f.request('/api/auth/login', { body: { email: "x'OR'1'='1@example.com", password } })).status, 401);
  for (const route of ['/.env', '/data/safe-space.sqlite', '/db/001-auth.sql', '/src/server.js']) {
    assert.equal((await f.request(route)).status, 404);
  }
  const page = await f.request('/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
  assert.ok(!page.headers.get('content-security-policy').includes('upgrade-insecure-requests'));
  assert.equal((await f.request('/api/health')).headers.get('cache-control'), 'no-store');
});

test('accounts, sessions and rate limits survive reopening the database', async (t) => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'safe-space-test-'));
  let second;
  t.after(async () => {
    if (second) await second.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const filename = path.join(directory, 'auth.sqlite');
  const first = await fixture(filename);
  let cookie;
  try {
    const response = await first.request('/api/auth/register', { body: registration() });
    cookie = cookieOf(response);
    for (let i = 0; i < 9; i++) {
      assert.equal((await first.request('/api/auth/login', { body: { email: 'alex@example.com', password: 'wrong' } })).status, 401);
    }
  } finally { await first.close(); }
  second = await fixture(filename);
  assert.equal((await second.request('/api/auth/me', { cookie })).status, 200);
  const blocked = await second.request('/api/auth/login', { body: { email: 'alex@example.com', password } });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  second.db.prepare('UPDATE auth_limits SET expires_at = ?').run(Date.now() - 1);
  assert.equal((await second.request('/api/auth/login', { body: { email: 'alex@example.com', password } })).status, 200);
});

test('production requires HTTPS and marks session cookies Secure', async (t) => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production', APP_ORIGIN: 'http://example.com' }), /HTTPS/);
  assert.throws(() => loadConfig({ SESSION_DAYS: '0' }), /SESSION_DAYS/);
  const f = await fixture(':memory:', { production: true, origin: 'https://safe.example.com' });
  t.after(() => f.close());
  const response = await f.request('/api/auth/register', { body: registration() });
  assert.equal(response.status, 201);
  assert.match(response.headers.get('set-cookie'), /^__Host-ss_session=/);
  assert.match(response.headers.get('set-cookie'), /; Secure/);
});
