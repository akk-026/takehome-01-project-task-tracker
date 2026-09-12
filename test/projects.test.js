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

async function call(pathname, token, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }
  });
  return { response, body: await response.json() };
}

async function login(email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  return (await response.json()).token;
}

test.before(async () => {
  tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'northstar-projects-'));
  server = http.createServer(createApp({ dataFile: path.join(tempDirectory, 'data.json'), publicDirectory: path.join(__dirname, '..', 'public') }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); fs.rmSync(tempDirectory, { recursive: true, force: true }); });

test('only a manager can create a project', async () => {
  const manager = await login('alice@northstar.test', 'manager123');
  const member = await login('dan@northstar.test', 'member123');
  const input = { key: 'AUR', name: 'Aurora', description: 'Website redesign', ownerId: 'user_alice', memberIds: ['user_dan'] };
  const denied = await call('/api/projects', member, { method: 'POST', body: JSON.stringify(input) });
  assert.equal(denied.response.status, 403);
  const created = await call('/api/projects', manager, { method: 'POST', body: JSON.stringify(input) });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.project.key, 'AUR');
  assert.deepEqual(created.body.project.memberIds.sort(), ['user_alice', 'user_dan']);
});

test('limits member visibility and supports archive and restore', async () => {
  const manager = await login('alice@northstar.test', 'manager123');
  const member = await login('dan@northstar.test', 'member123');
  const privateProject = await call('/api/projects', manager, { method: 'POST', body: JSON.stringify({ key: 'COM', name: 'Compass', description: 'Private project', ownerId: 'user_alice', memberIds: [] }) });
  const memberProjects = await call('/api/projects', member);
  assert.deepEqual(memberProjects.body.projects.map(project => project.key), ['AUR']);
  const projectId = privateProject.body.project.id;
  assert.equal((await call(`/api/projects/${projectId}`, manager, { method: 'DELETE' })).response.status, 200);
  const defaultList = await call('/api/projects', manager);
  assert.equal(defaultList.body.projects.some(project => project.id === projectId), false);
  const archivedList = await call('/api/projects?archived=true', manager);
  assert.equal(archivedList.body.projects.find(project => project.id === projectId).archived, true);
  assert.equal((await call(`/api/projects/${projectId}/restore`, manager, { method: 'POST' })).response.status, 200);
});

test('manager can edit project details and membership', async () => {
  const manager = await login('alice@northstar.test', 'manager123');
  const list = await call('/api/projects', manager);
  const aurora = list.body.projects.find(project => project.key === 'AUR');
  const edited = await call(`/api/projects/${aurora.id}`, manager, { method: 'PATCH', body: JSON.stringify({ key: 'AUR', name: 'Aurora refreshed', description: 'Updated description', ownerId: 'user_alice', memberIds: aurora.memberIds }) });
  assert.equal(edited.body.project.name, 'Aurora refreshed');
  const membership = await call(`/api/projects/${aurora.id}/members`, manager, { method: 'PUT', body: JSON.stringify({ memberIds: ['user_alice'] }) });
  assert.deepEqual(membership.body.project.memberIds, ['user_alice']);
});
