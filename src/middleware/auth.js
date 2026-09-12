const { sendError } = require('../lib/http');

function requireUser(request, response, auth) {
  const user = auth.userFromRequest(request);
  if (!user) { sendError(response, 401, 'Please sign in to continue.'); return null; }
  return user;
}

function requireManager(response, user) {
  if (user.role !== 'MANAGER') { sendError(response, 403, 'Managers only. This permission is enforced by the server.'); return false; }
  return true;
}

module.exports = { requireManager, requireUser };
