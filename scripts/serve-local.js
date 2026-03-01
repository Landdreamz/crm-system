#!/usr/bin/env node
/**
 * Serve the repo root on port 3001 so http://localhost:3001/crm-system/ loads the app.
 * No external deps (uses Node http + fs).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const ROOT = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (filePath.endsWith('/')) filePath = path.join(filePath, 'index.html');
  filePath = path.resolve(filePath);
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.end('Not Found');
      } else {
        res.statusCode = 500;
        res.end('Error');
      }
      return;
    }
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Serving at http://localhost:${PORT}/`);
  console.log(`Open the app: http://localhost:${PORT}/crm-system/`);
});
