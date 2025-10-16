const basePath = process.cwd();
const { startCreating, buildSetup } = require(`${basePath}/src/main.js`);
const { layerConfigurations } = require(`${basePath}/src/config.js`);
const fs = require('fs');

// 保存原始的startCreating函数
const originalStartCreating = require(`${basePath}/src/main.js`).startCreating;

// 创建一个新的startCreating函数，可以生成特定元素
const startCreatingSpecific = async (targetElement) => {
  console.log(`开始生成包含元素 ${targetElement} 的NFT...`);
  
  // 设置构建目录
  buildSetup();
  
  // 获取male配置
  const maleConfig = layerConfigurations.find(config => config.gender === "male");
  if (!maleConfig) {
    console.log("未找到male配置");
    return;
  }
  
  let found = false;
  let attempts = 0;
  const maxAttempts = 100; // 最多尝试100次
  
  while (!found && attempts < maxAttempts) {
    attempts++;
    console.log(`尝试第 ${attempts} 次生成...`);
    
    // 重新设置构建目录
    buildSetup();
    
    // 调用原始的生成函数
    await originalStartCreating();
    
    // 检查生成的NFT是否包含目标元素
    const metadataPath = `${basePath}/build/json/1.json`;
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // 检查hair1和hair2属性
      const hair1Attribute = metadata.attributes.find(attr => attr.trait_type === "hair1");
      const hair2Attribute = metadata.attributes.find(attr => attr.trait_type === "hair2");
      
      if (hair1Attribute && hair1Attribute.value.includes(targetElement) &&
          hair2Attribute && hair2Attribute.value.includes(targetElement)) {
        found = true;
        console.log(`成功生成包含 ${targetElement} 的NFT!`);
        console.log(`hair1: ${hair1Attribute.value}`);
        console.log(`hair2: ${hair2Attribute.value}`);
        break;
      } else {
        console.log(`生成的NFT不包含目标元素，hair1: ${hair1Attribute ? hair1Attribute.value : 'N/A'}, hair2: ${hair2Attribute ? hair2Attribute.value : 'N/A'}`);
      }
    }
    
    // 等待一段时间再重试
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (!found) {
    console.log(`在 ${maxAttempts} 次尝试后仍未生成包含 ${targetElement} 的NFT`);
  }
};

// 从命令行参数获取目标元素
const targetElement = process.argv[2] || "male_hair_F1";

// 调用函数
startCreatingSpecific(targetElement);