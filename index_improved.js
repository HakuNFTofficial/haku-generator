const path = require('path');
const basePath = process.cwd();

// 导入改进版本的函数
const { startCreatingWithConcurrencyControl, buildSetup } = require('./src/main_improved.js');

// 启动NFT生成
(async () => {
  try {
    buildSetup();
    await startCreatingWithConcurrencyControl();
    console.log('NFT生成完成！');
  } catch (error) {
    console.error('生成NFT时出错:', error);
  }
})();