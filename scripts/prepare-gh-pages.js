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

// Rename static/ to assets/ so deploy isn't affected by .gitignore "static/" rules
const staticDir = path.join(out, 'static');
const assetsDir = path.join(out, 'assets');
if (fs.existsSync(staticDir)) {
  fs.renameSync(staticDir, assetsDir);
  // Update references in index.html and asset-manifest.json
  const indexPath = path.join(out, 'index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  indexHtml = indexHtml.replace(/\.\/static\//g, './assets/');
  fs.writeFileSync(indexPath, indexHtml);
  const manifestPath = path.join(out, 'asset-manifest.json');
  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf8');
    manifest = manifest.replace(/\.\/static\//g, './assets/');
    fs.writeFileSync(manifestPath, manifest);
  }
}

// Tell GitHub Pages not to use Jekyll (avoids 404s for static assets)
fs.writeFileSync(path.join(out, '.nojekyll'), '');

// Optional: add repo-root assets if present (manifest, robots, logos)
const optionalFromRoot = ['manifest.json', 'robots.txt', 'logo192.png', 'logo512.png'];
for (const name of optionalFromRoot) {
  const src = path.join(root, name);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(out, name));
  }
}

console.log('Prepared gh-pages-publish from frontend/build');
