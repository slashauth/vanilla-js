const webpack = require('webpack');
const path = require('path');

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    os: require.resolve('os-browserify'),
  });
  config.resolve.fallback = fallback;
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ]);
  const npmLinkPaths = {
    react: path.join(__dirname, './node_modules/react'),
    'react-dom': path.join(__dirname, 'node_modules/react-dom'),
  };
  if (process.env.REACT_APP_BUILD === 'development') {
    const alias = config.resolve.alias || {};
    Object.assign(alias, npmLinkPaths);
    config.resolve.alias = alias;

    const idx = config.resolve.plugins.findIndex(
      (plugin) => plugin.constructor.name === 'ModuleScopePlugin'
    );
    if (idx !== -1) {
      config.resolve.plugins.splice(idx, 1);
    }
  }

  config.ignoreWarnings = [/Failed to parse source map/];
  const isEnvProduction = process.env.REACT_APP_ENV === "production";
  const isEnvDevelopment = !isEnvProduction || process.env.REACT_APP_ENV === "development";
  config.output = config.output || {};

  config.output.libraryTarget = "umd";
  config.output.library = "Slashauth";
  config.output.filename = isEnvProduction
      ? 'static/js/[name].js'
      : isEnvDevelopment && 'static/js/bundle.js';
  // Turn off chunking
  config.optimization = {};

  const miniCssPlugin = config.plugins.find(
      ({ constructor }) => constructor.name === 'MiniCssExtractPlugin'
  );
  if (miniCssPlugin) {
      miniCssPlugin.options.filename = 'static/css/[name].css';
      miniCssPlugin.options.chunkFilename = 'static/css/[name].css';
  }
  return config;
};