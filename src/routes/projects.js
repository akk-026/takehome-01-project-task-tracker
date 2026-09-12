const { readJson, sendError, sendJson } = require('../lib/http');
const { requireManager, requireUser } = require('../middleware/auth');

async function handleProjectRoute(request, response, url, auth, projects) {
  if (!url.pathname.startsWith('/api/projects')) return false;
  const user = requireUser(request, response, auth);
  if (!user) return true;
  const includeArchived = url.searchParams.get('archived') === 'true';

  if (url.pathname === '/api/projects' && request.method === 'GET') {
    sendJson(response, 200, { projects: projects.list(user, includeArchived) });
    return true;
  }
  if (url.pathname === '/api/projects' && request.method === 'POST') {
    if (!requireManager(response, user)) return true;
    const result = projects.create(await readJson(request));
    if (result.error) sendError(response, result.status || 400, result.error);
    else sendJson(response, 201, result);
    return true;
  }

  const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch && request.method === 'GET') {
    const project = projects.get(user, projectMatch[1], includeArchived);
    if (!project) sendError(response, 404, 'Project not found.');
    else sendJson(response, 200, { project });
    return true;
  }
  if (projectMatch && request.method === 'PATCH') {
    if (!requireManager(response, user)) return true;
    const result = projects.update(projectMatch[1], await readJson(request));
    if (result.error) sendError(response, result.status || 400, result.error);
    else sendJson(response, 200, result);
    return true;
  }
  if (projectMatch && request.method === 'DELETE') {
    if (!requireManager(response, user)) return true;
    const result = projects.archive(projectMatch[1], true);
    if (result.error) sendError(response, result.status || 400, result.error);
    else sendJson(response, 200, result);
    return true;
  }

  const restoreMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/restore$/);
  if (restoreMatch && request.method === 'POST') {
    if (!requireManager(response, user)) return true;
    const result = projects.archive(restoreMatch[1], false);
    if (result.error) sendError(response, result.status || 400, result.error);
    else sendJson(response, 200, result);
    return true;
  }
  const memberMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/members$/);
  if (memberMatch && request.method === 'PUT') {
    if (!requireManager(response, user)) return true;
    const result = projects.setMembers(memberMatch[1], (await readJson(request)).memberIds);
    if (result.error) sendError(response, result.status || 400, result.error);
    else sendJson(response, 200, result);
    return true;
  }
  return false;
}

module.exports = { handleProjectRoute };
