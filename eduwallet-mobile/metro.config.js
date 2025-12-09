// eduwallet-mobile/metro.config.js
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, ".."); // repo root

/** @type {import('metro-config').ConfigT} */
const config = getDefaultConfig(projectRoot);

// 1) Allow Metro to watch the whole repo
config.watchFolders = [workspaceRoot];

// 2) Make an alias "shared" that points to ../shared
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  shared: path.resolve(workspaceRoot, "shared"),
};

module.exports = config;
