// @see https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("pdf");

// Vitest/vite-node temp dirs under node_modules can disappear while Metro is
// watching and crash the dev server (ENOENT). Ignore them for resolution.
const viteNodeTrash = /[/\\]node_modules[/\\]\.vite-node-[^/\\]+[/\\].*/;
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  viteNodeTrash,
];

module.exports = config;
