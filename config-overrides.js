// config-overrides.js
const fs = require("fs");
const path = require("path");
const webpack = require("webpack");

function buildSchemaIndex() {
  const readDirSchemas = (relativeDir, filePrefix) => {
    const absDir = path.resolve(__dirname, relativeDir);
    if (!fs.existsSync(absDir)) return [];
    return fs
      .readdirSync(absDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        try {
          const raw = fs.readFileSync(path.join(absDir, file), "utf8");
          const data = JSON.parse(raw);
          return {
            name: data?.oca_bundle?.bundle?.overlays?.meta?.[0]?.name || null,
            said: data?.d || null,
            filePath: `${filePrefix}${file}`,
          };
        } catch (err) {
          console.warn(`Failed to index schema ${file}:`, err.message);
          return null;
        }
      })
      .filter(Boolean);
  };

  return {
    visible: readDirSchemas("public/schemas", "./schemas/"),
    hidden: readDirSchemas("public/schemas/hidden", "./schemas/hidden/"),
  };
}

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

    // Inject lightweight schema metadata index so schemas can be fetched lazily on demand
    const schemaIndex = buildSchemaIndex();

    // Inject globals
    config.plugins = (config.plugins || []).concat(
      new webpack.ProvidePlugin({
        process: "process/browser",
        Buffer: ["buffer", "Buffer"],
      }),
      new webpack.DefinePlugin({
        __SCHEMA_INDEX__: JSON.stringify(schemaIndex),
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

  jest: function (config) {
    config.moduleNameMapper = {
      ...(config.moduleNameMapper || {}),
      "^react-router/dom$": path.join(
        __dirname,
        "node_modules/react-router/dist/development/dom-export.js"
      ),
      "^react-router$": path.join(
        __dirname,
        "node_modules/react-router/dist/development/index.js"
      ),
      "^react-router-dom$": path.join(
        __dirname,
        "node_modules/react-router-dom/dist/index.js"
      ),
    };
    config.transformIgnorePatterns = [
      "[/\\\\]node_modules[/\\\\](?!date-fns[/\\\\]).+\\.(js|jsx|mjs|cjs|ts|tsx)$",
      "^.+\\.module\\.(css|sass|scss)$",
    ];
    return config;
  },
};
