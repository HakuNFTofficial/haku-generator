const basePath = process.cwd();
const { startCreatingWithConcurrencyControl, buildSetup } = require(`${basePath}/src/main_improved.js`);

(() => {
  buildSetup();
  startCreatingWithConcurrencyControl();
})();
