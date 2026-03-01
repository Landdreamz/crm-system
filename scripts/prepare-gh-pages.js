#!/usr/bin/env node
/**
 * Copies the latest frontend build (frontend/build/) into gh-pages-publish/
 * so gh-pages pushes the current app to the gh-pages branch.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'frontend', 'build');
const out = path.join(root, 'gh-pages-publish');

if (!fs.existsSync(buildDir)) {
  console.error('No frontend build found. Run: npm run build');
  process.exit(1);
}

if (fs.existsSync(out)) {
  fs.rmSync(out, { recursive: true });
}
fs.mkdirSync(out, { recursive: true });

// Copy entire frontend build (index.html, static/, favicon, etc.)
fs.cpSync(buildDir, out, { recursive: true });

// Optional: add repo-root assets if present (manifest, robots, logos)
const optionalFromRoot = ['manifest.json', 'robots.txt', 'logo192.png', 'logo512.png'];
for (const name of optionalFromRoot) {
  const src = path.join(root, name);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(out, name));
  }
}

console.log('Prepared gh-pages-publish from frontend/build');
