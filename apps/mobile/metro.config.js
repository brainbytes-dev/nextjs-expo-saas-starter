const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Find the monorepo root — two directories up from apps/mobile
const monorepoRoot = path.resolve(__dirname, "../..");

const config = getDefaultConfig(__dirname);

// Tell Metro to look for modules in both the app's own node_modules
// AND the root node_modules (where hoisted dependencies live)
config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Block Metro from trying to bundle the other app in the monorepo
config.resolver.disableHierarchicalLookup = false;

module.exports = withNativeWind(config, {
  input: "./global.css",
  outputDir: "./.expo/nativewind",
});
