#!/usr/bin/env node
/**
 * Copies frontend/build → crm-system/ so http://localhost:3001/crm-system/ matches the latest build.
 * (crm-system/ is gitignored; without this, index.html often points at missing main.*.js hashes.)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'frontend', 'build');
const out = path.join(root, 'crm-system');

if (!fs.existsSync(buildDir) || !fs.existsSync(path.join(buildDir, 'index.html'))) {
  console.error('No frontend/build. Run from repo root: npm run build');
  process.exit(1);
}

if (fs.existsSync(out)) {
  fs.rmSync(out, { recursive: true });
}
fs.mkdirSync(out, { recursive: true });
fs.cpSync(buildDir, out, { recursive: true });

const idx = path.join(out, 'index.html');
const html = fs.readFileSync(idx, 'utf8');
const m = html.match(/static\/js\/(main\.[a-f0-9]+\.js)/);
console.log('Synced frontend/build → crm-system/');
if (m) console.log('  index.html loads', m[1]);
