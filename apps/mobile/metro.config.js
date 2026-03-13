const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const monorepoRoot = path.resolve(__dirname, "../..");

const config = getDefaultConfig(__dirname);

// Watch the monorepo packages directory so NativewindUI components resolve
config.watchFolders = [monorepoRoot];

// Ensure node_modules resolve from the app and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
