const fs = require('node:fs');
const path = require('node:path');
const { sendError } = require('./lib/http');
const { handleAuthRoute } = require('./routes/auth');
const { createAuth } = require('./services/auth');
const { createStore } = require('./services/store');

const mimeTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript' };

function createApp({ dataFile, publicDirectory } = {}) {
  const auth = createAuth(createStore(dataFile));
  const publicDir = publicDirectory || path.join(__dirname, '..', 'public');
  return async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      if (url.pathname.startsWith('/api/')) {
        if (!await handleAuthRoute(request, response, url.pathname, auth)) sendError(response, 404, 'API route not found.');
        return;
      }
      const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const file = path.normalize(path.join(publicDir, relative));
      if (!file.startsWith(publicDir) || !fs.existsSync(file)) { response.writeHead(404); response.end('Not found'); return; }
      response.writeHead(200, { 'content-type': `${mimeTypes[path.extname(file)] || 'application/octet-stream'}; charset=utf-8` });
      fs.createReadStream(file).pipe(response);
    } catch (error) { sendError(response, 500, error.message || 'Unexpected server error.'); }
  };
}

module.exports = { createApp };
