const path = require('path');
const basePath = process.cwd();

// Import improved version functions
const { startCreatingWithConcurrencyControl, buildSetup } = require('./src/main_improved.js');

console.log("=" .repeat(80));
console.log("测试 layerAssociations 修复");
console.log("=" .repeat(80));
console.log("\n将生成 5 个测试图片来验证关联规则是否正确...\n");

// Temporarily modify config to generate only 5 images for testing
const originalConfig = require('./src/config.js');
const testConfig = {
  ...originalConfig,
  layerConfigurations: originalConfig.layerConfigurations.map(config => ({
    ...config,
    growEditionSizeTo: config.gender === 'female' ? 3 : 2  // 3 female + 2 male = 5 total
  }))
};

// Override the config
require.cache[require.resolve('./src/config.js')].exports = testConfig;

// Start NFT generation
(async () => {
  try {
    console.log("清理 build 文件夹...");
    buildSetup();
    
    console.log("开始生成测试图片...\n");
    await startCreatingWithConcurrencyControl();
    
    console.log("\n" + "=".repeat(80));
    console.log("生成完成！现在验证关联规则...\n");
    
    // Verify the results
    const fs = require('fs');
    const associations = {
      "hair3": ["hair2", "hair1"],
      "glassesleft": ["glassesright"],
      "clothes2": ["clothes1"],
      "body": ["nose", "ear"]
    };
    
    let totalChecked = 0;
    let totalViolations = 0;
    
    for (let i = 1; i <= 5; i++) {
      const jsonPath = `${basePath}/build/json/${i}.json`;
      if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const attributes = data.attributes || [];
        
        // Extract attributes to dict
        const attrDict = {};
        attributes.forEach(attr => {
          const traitType = attr.trait_type;
          const value = attr.value;
          if (!attrDict[traitType]) {
            attrDict[traitType] = value;
          }
        });
        
        console.log(`\n【Edition #${i}】`);
        let violations = [];
        
        // Check each association rule
        for (const [mainLayer, associatedLayers] of Object.entries(associations)) {
          if (attrDict[mainLayer]) {
            const mainValue = attrDict[mainLayer].split('.')[0];
            
            for (const assocLayer of associatedLayers) {
              if (attrDict[assocLayer]) {
                const assocValue = attrDict[assocLayer].split('.')[0];
                
                if (mainValue !== assocValue) {
                  violations.push({
                    rule: `${mainLayer} → ${assocLayer}`,
                    main: `${mainLayer}=${mainValue}`,
                    assoc: `${assocLayer}=${assocValue}`
                  });
                  totalViolations++;
                }
              }
            }
          }
        }
        
        totalChecked++;
        
        if (violations.length > 0) {
          console.log(`  ❌ 违反关联规则 (${violations.length}处):`);
          violations.forEach(v => {
            console.log(`     • ${v.rule}: ${v.main} ≠ ${v.assoc}`);
          });
        } else {
          console.log(`  ✅ 所有关联规则正确！`);
        }
      }
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("验证结果");
    console.log("=".repeat(80));
    console.log(`检查了 ${totalChecked} 个文件`);
    console.log(`违反规则: ${totalViolations} 处`);
    
    if (totalViolations === 0) {
      console.log("\n🎉 成功！所有关联规则都正确执行！");
    } else {
      console.log("\n⚠️  仍有违规，需要进一步检查代码...");
    }
    console.log("=".repeat(80));
    
  } catch (error) {
    console.error('生成测试NFT时出错:', error);
    process.exit(1);
  }
})();
