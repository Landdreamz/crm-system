module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Remove ESLint plugin so "definition not found" errors don't block compile
      webpackConfig.plugins = webpackConfig.plugins.filter(
        (p) => p?.constructor?.name !== 'ESLintPlugin'
      );
      return webpackConfig;
    },
  },
};
