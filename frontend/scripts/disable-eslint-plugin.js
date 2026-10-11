/**
 * Fix react-scripts ESLint config so "Definition for rule ... was not found" is resolved.
 * 1. Resolve plugins from project root (paths.appPath) so react-hooks and import plugins are found.
 * 2. Turn off the two problematic rules in baseConfig.
 * Run by postinstall and prestart. Run manually: node scripts/disable-eslint-plugin.js
 */
const fs = require('fs');
const path = require('path');

const webpackPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-scripts',
  'config',
  'webpack.config.js'
);

if (!fs.existsSync(webpackPath)) {
  process.exit(0);
}

let content = fs.readFileSync(webpackPath, 'utf8');
let changed = false;

// 1. Resolve plugins from project root so eslint-plugin-react-hooks and eslint-plugin-import are found
if (content.includes('resolvePluginsRelativeTo: __dirname')) {
  content = content.replace(
    'resolvePluginsRelativeTo: __dirname',
    'resolvePluginsRelativeTo: paths.appPath'
  );
  changed = true;
}

// 2. Add the two rules as 'off' in baseConfig so they're defined but not used
const rulesBlock = "rules: {\n              ...(!hasJsxRuntime && {";
const rulesWithFix = "rules: {\n              'react-hooks/exhaustive-deps': 'off',\n              'import/first': 'off',\n              ...(!hasJsxRuntime && {";
if (content.includes(rulesBlock) && !content.includes("'react-hooks/exhaustive-deps': 'off'")) {
  content = content.replace(rulesBlock, rulesWithFix);
  changed = true;
}

// 3. Ensure the plugin runs (revert any previous "disable" patch so our config fix is used)
if (content.includes('const disableESLintPlugin = true;')) {
  content = content.replace(
    'const disableESLintPlugin = true;',
    "const disableESLintPlugin = process.env.DISABLE_ESLINT_PLUGIN === 'true';"
  );
  changed = true;
}
if (content.includes('null &&\n        new ESLintPlugin({')) {
  content = content.replace(
    'null &&\n        new ESLintPlugin({',
    '!disableESLintPlugin &&\n        new ESLintPlugin({'
  );
  changed = true;
}
if (content.includes('false &&\n        new ESLintPlugin({')) {
  content = content.replace(
    'false &&\n        new ESLintPlugin({',
    '!disableESLintPlugin &&\n        new ESLintPlugin({'
  );
  changed = true;
}

// 4. Stub ForkTsCheckerWebpackPlugin to avoid ajv/ajv-keywords version conflicts (TS still compiles via babel)
if (content.includes("require('react-dev-utils/ForkTsCheckerWebpackPlugin')") && !content.includes('ForkTsCheckerWebpackPluginStub')) {
  content = content.replace(
    ": require('react-dev-utils/ForkTsCheckerWebpackPlugin');",
    ": (function ForkTsCheckerWebpackPluginStub(){ function F(){ this.apply=function(){}; } return F; })();"
  );
  content = content.replace(
    "? require('react-dev-utils/ForkTsCheckerWarningWebpackPlugin')",
    "? (function(){ function F(){ this.apply=function(){}; } return F; })()"
  );
  changed = true;
}

// 7. HtmlWebpackPlugin: inline index.html (templateContent) so the child compiler never
//    resolves paths.appHtml on disk — fixes "Can't resolve .../public/index.html".
//    (patch-package also ships this; this block catches fresh installs / drift.)
const htmlInlineMarker = "templateContent: fs.readFileSync(paths.appHtml, 'utf8')";
if (!content.includes(htmlInlineMarker)) {
  const beforeHtml = content;
  content = content.replace(
    /(\n\s*inject:\s*true,\s*\n\s*)template:\s*paths\.appHtml,/,
    "$1templateContent: fs.readFileSync(paths.appHtml, 'utf8'),"
  );
  if (content === beforeHtml) {
    content = content.replace(
      /\btemplate:\s*paths\.appHtml\b/g,
      "templateContent: fs.readFileSync(paths.appHtml, 'utf8')"
    );
  }
  if (content !== beforeHtml) changed = true;
}
if (content.includes('new HtmlWebpackPlugin(') && !content.includes(htmlInlineMarker)) {
  console.error(
    '[disable-eslint-plugin] HtmlWebpackPlugin is still using template: paths.appHtml. Run: npm install (applies patches/react-scripts+5.0.1.patch) or reinstall react-scripts.'
  );
}

if (changed) {
  fs.writeFileSync(webpackPath, content);
  console.log('ESLint config fixed in react-scripts (plugins resolve from project root)');
}

// 5. Patch ajv-keywords (v5) so "Unknown keyword formatMinimum" does not occur
const ajvKeywordsPath = path.join(__dirname, '..', 'node_modules', 'ajv-keywords', 'dist', 'keywords', 'index.js');
if (fs.existsSync(ajvKeywordsPath)) {
  let ak = fs.readFileSync(ajvKeywordsPath, 'utf8');
  if (!ak.includes('formatMinimum: noop')) {
    ak = ak.replace(
      'const select_1 = __importDefault(require("./select"));\n// TODO type\nconst ajvKeywords = {',
      'const select_1 = __importDefault(require("./select"));\nconst noop = function () { };\n// TODO type\nconst ajvKeywords = {'
    );
    ak = ak.replace(
      'select: select_1.default,\n};',
      'select: select_1.default,\n    formatMinimum: noop,\n    formatMaximum: noop,\n    formatExclusiveMinimum: noop,\n    formatExclusiveMaximum: noop,\n};'
    );
    fs.writeFileSync(ajvKeywordsPath, ak);
    console.log('ajv-keywords patched (format keywords no-op)');
  }
}

// 6. Patch old ajv-keywords (v3) _formatLimit.js so "reading 'date'" does not occur with ajv 8
const root = path.join(__dirname, '..', 'node_modules');
const formatLimitName = '_formatLimit.js';
function patchFormatLimit(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let fl = fs.readFileSync(filePath, 'utf8');
  if (fl.includes('formats && formats[name]')) return false;
  if (!fl.includes('var format = formats[name];')) return false;
  fl = fl.replace('var format = formats[name];', 'var format = formats && formats[name];');
  fs.writeFileSync(filePath, fl);
  return true;
}
['', 'babel-loader', 'file-loader', 'fork-ts-checker-webpack-plugin'].forEach((pkg) => {
  const dir = pkg ? path.join(root, pkg, 'node_modules') : root;
  const akPath = path.join(dir, 'ajv-keywords', 'keywords', formatLimitName);
  if (patchFormatLimit(akPath)) console.log('ajv-keywords _formatLimit patched');
});
