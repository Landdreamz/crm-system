/**
 * react-app-rewired loads ./config-overrides.js (see react-app-rewired/config-overrides.js).
 *
 * - Drops ESLint / ForkTsChecker plugins.
 * - Replaces HtmlWebpackPlugin with a new instance that uses templateContent (HTML read in Node).
 *   Mutating the existing plugin often does NOT clear the child-compiler entry; webpack still
 *   tries to resolve public/index.html and fails on some machines.
 */
const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const appHtml = path.resolve(__dirname, 'public', 'index.html');
if (!fs.existsSync(appHtml)) {
  throw new Error(
    `[config-overrides] Missing ${appHtml}. Restore frontend/public/ from the repo.`
  );
}
const htmlTemplate = fs.readFileSync(appHtml, 'utf8');

function isHtmlPlugin(p) {
  if (!p) return false;
  if (p instanceof HtmlWebpackPlugin) return true;
  const n = p.constructor && p.constructor.name;
  return n === 'HtmlWebpackPlugin';
}

module.exports = function override(config) {
  config.plugins = config.plugins.filter((p) => {
    if (!p) return true;
    const n = (p.constructor && p.constructor.name) || '';
    if (n === 'ESLintPlugin' || n.indexOf('ESLint') !== -1) return false;
    if (n === 'ForkTsCheckerWebpackPlugin') return false;
    return true;
  });

  config.plugins = config.plugins.map((p) => {
    if (!isHtmlPlugin(p)) return p;
    const opts = { ...(p.userOptions || {}) };
    delete opts.template;
    return new HtmlWebpackPlugin({
      ...opts,
      templateContent: htmlTemplate,
      cache: false,
    });
  });

  return config;
};
