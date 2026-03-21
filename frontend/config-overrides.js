/**
 * Remove ESLint webpack plugin so "Definition for rule ... was not found" never runs.
 * Remove ForkTsCheckerWebpackPlugin to avoid ajv/ajv-keywords version conflicts (TypeScript still compiles via babel).
 */
module.exports = function override(config) {
  config.plugins = config.plugins.filter((p) => {
    if (!p) return true;
    const n = (p.constructor && p.constructor.name) || '';
    if (n === 'ESLintPlugin' || n.indexOf('ESLint') !== -1) return false;
    if (n === 'ForkTsCheckerWebpackPlugin') return false;
    return true;
  });
  return config;
};
