#!/usr/bin/env node
/** Serve frontend/build on port 3002 so you can open http://localhost:3002 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const ROOT = path.join(__dirname, '..', 'frontend', 'build');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  let url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  let filePath = path.join(ROOT, url);
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
  console.log(`CRM running at http://localhost:${PORT}`);
});
