const basePath = process.cwd();

// Simple CLI arg parsing for --config
// Support formats: --config path/to/config.js or --config=path/to/config.js
const argv = process.argv.slice(2);
let userConfigPath = null;
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg.startsWith("--config=")) {
    userConfigPath = arg.split("=").slice(1).join("=");
    break;
  }
  if (arg === "--config" && i + 1 < argv.length) {
    userConfigPath = argv[i + 1];
    break;
  }
}

if (userConfigPath) {
  // Resolve relative to project root if path is relative
  const path = require("path");
  const resolved = path.isAbsolute(userConfigPath)
    ? userConfigPath
    : path.join(basePath, userConfigPath);
  process.env.NFT_CONFIG = resolved;
  console.log(`Using config: ${resolved}`);
}

const { startCreatingWithConcurrencyControl, buildSetup } = require(`${basePath}/src/main_improved.js`);

(() => {
  buildSetup();
  startCreatingWithConcurrencyControl();
})();
