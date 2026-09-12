const { readJson, sendError, sendJson } = require('../lib/http');
const { requireManager, requireUser } = require('../middleware/auth');

async function handleAuthRoute(request, response, pathname, auth) {
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const { email, password } = await readJson(request);
    const session = auth.signIn(email, password);
    if (!session) sendError(response, 401, 'Incorrect email or password.');
    else sendJson(response, 200, session);
    return true;
  }
  if (pathname === '/api/auth/me' && request.method === 'GET') {
    const user = requireUser(request, response, auth);
    if (user) sendJson(response, 200, { user });
    return true;
  }
  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    const user = requireUser(request, response, auth);
    if (user) { auth.signOut(request); sendJson(response, 200, { ok: true }); }
    return true;
  }
  // Temporary proof that project mutations will be protected server-side in the next commit.
  if (pathname === '/api/admin/manager-check' && request.method === 'POST') {
    const user = requireUser(request, response, auth);
    if (user && requireManager(response, user)) sendJson(response, 200, { ok: true });
    return true;
  }
  return false;
}

module.exports = { handleAuthRoute };
