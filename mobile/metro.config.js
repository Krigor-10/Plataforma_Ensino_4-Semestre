const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Deixa o Metro observar e resolver o codigo compartilhado com o frontend
// web (shared/api.js e shared/session.js), que fica um nivel acima de
// mobile/ — fora do que o Metro observa por padrao.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

module.exports = config;
