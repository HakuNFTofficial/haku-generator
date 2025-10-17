const path = require('path');
const basePath = process.cwd();

// Import improved version functions
const { startCreatingWithConcurrencyControl, buildSetup } = require('./src/main_improved.js');

// Start NFT generation
(async () => {
  try {
    buildSetup();
    await startCreatingWithConcurrencyControl();
    console.log('NFT generation completed!');
  } catch (error) {
    console.error('Error generating NFT:', error);
  }
})();