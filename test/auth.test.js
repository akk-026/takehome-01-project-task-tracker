const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');

let server;
let baseUrl;
let tempDirectory;

function call(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, { ...options, headers: { 'content-type': 'application/json', ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) } });
}

test.before(async () => {
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'northstar-auth-'));
  server = http.createServer(createApp({ dataFile: path.join(tempDirectory, 'data.json'), publicDirectory: path.join(__dirname, '..', 'public') }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => { server.close(); fs.rmSync(tempDirectory, { recursive: true, force: true }); });

test('signs in a manager and exposes only public user fields', async () => {
  const response = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'alice@northstar.test', password: 'manager123' }) });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.user.role, 'MANAGER');
  assert.equal('passwordHash' in body.user, false);
  assert.ok(body.token);
});

test('rejects wrong credentials and protects anonymous routes', async () => {
  const invalid = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'alice@northstar.test', password: 'wrong' }) });
  assert.equal(invalid.status, 401);
  assert.equal((await call('/api/auth/me')).status, 401);
});

test('enforces the manager role on the server', async () => {
  const login = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'dan@northstar.test', password: 'member123' }) });
  const { token } = await login.json();
  const denied = await call('/api/admin/manager-check', { method: 'POST', token });
  assert.equal(denied.status, 403);
  assert.match((await denied.json()).error, /server/);
});
