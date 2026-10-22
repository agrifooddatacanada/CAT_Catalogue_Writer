// config-overrides.js
const webpack = require("webpack");

module.exports = {
  webpack: function override(config) {
    // Fallbacks for Node core modules and process/browser
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      process: require.resolve("process/browser"),
      zlib: require.resolve("browserify-zlib"),
      stream: require.resolve("stream-browserify"),
      util: require.resolve("util"),
      buffer: require.resolve("buffer"),
      assert: require.resolve("assert"),
    };

    // Fix fullySpecified ESM imports like 'process/browser'
    config.module = config.module || {};
    config.module.rules = (config.module.rules || []).concat({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    // Inject globals
    config.plugins = (config.plugins || []).concat(
      new webpack.ProvidePlugin({
        process: "process/browser",
        Buffer: ["buffer", "Buffer"],
      })
    );

    return config;
  },

  devServer: function (configFunction) {
    return function (proxy, allowedHost) {
      const config = configFunction(proxy, allowedHost);

      const onBefore = config.onBeforeSetupMiddleware;
      const onAfter = config.onAfterSetupMiddleware;

      config.setupMiddlewares = (middlewares, devServer) => {
        if (typeof onBefore === "function") {
          onBefore(devServer);
        }
        if (typeof onAfter === "function") {
          onAfter(devServer);
        }
        return middlewares;
      };

      delete config.onBeforeSetupMiddleware;
      delete config.onAfterSetupMiddleware;

      return config;
    };
  },
};
