const webpack = require("webpack");

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer"),
    process: require.resolve("process"),
    vm: false,
  };

  config.resolve.alias = {
    ...config.resolve.alias,
    "process/browser": require.resolve("process"),
    "process/browser.js": require.resolve("process"),
  };

  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process",
    }),
  ];

  config.ignoreWarnings = [/Failed to parse source map/];

  return config;
};
