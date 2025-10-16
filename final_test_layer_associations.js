// 最终测试脚本验证整个系统中的图层关联必填项机制
const fs = require('fs');
const path = require('path');

// 模拟DNA分隔符
const DNA_DELIMITER = "-";

/**
 * 应用图层关联规则的函数（必填项）
 * @param {string} dnaStr - DNA字符串
 * @param {Object} layerConfig - 图层配置
 * @returns {string} 更新后的DNA字符串
 * @throws {Error} 当找不到同名元素时抛出异常
 */
const applyLayerAssociations = (dnaStr, layerConfig) => {
  // 检查是否存在图层关联配置
  if (!layerConfig.layerAssociations) {
    console.warn("警告: 图层关联配置缺失");
    return dnaStr;
  }

  // 将DNA字符串分割为数组
  let dnaSequence = dnaStr.split(DNA_DELIMITER);
  
  // 获取图层关联配置
  const associations = layerConfig.layerAssociations;
  
  // 遍历每个关联规则
  Object.keys(associations).forEach(mainLayerName => {
    // 查找主图层在layersOrder中的索引
    const mainLayerIndex = layerConfig.layersOrder.findIndex(layer => layer.name === mainLayerName);
    
    // 检查主图层是否存在
    if (mainLayerIndex === -1) {
      throw new Error(`致命错误: 在layersOrder中找不到主图层 "${mainLayerName}"`);
    }
    
    // 检查DNA序列中是否存在主图层元素
    if (!dnaSequence[mainLayerIndex]) {
      throw new Error(`致命错误: DNA序列中缺少主图层 "${mainLayerName}" 的元素`);
    }
    
    // 获取主图层的元素名称（从DNA序列中）
    const mainLayerElement = dnaSequence[mainLayerIndex].split(":")[0];
    console.log(`主图层 "${mainLayerName}" 的元素: ${mainLayerElement}`);
    
    // 遍历所有关联图层
    Object.keys(associations[mainLayerName]).forEach(associatedLayerName => {
      // 检查关联类型是否为sameName
      if (associations[mainLayerName][associatedLayerName] === "sameName") {
        // 查找关联图层在layersOrder中的索引
        const associatedLayerIndex = layerConfig.layersOrder.findIndex(layer => layer.name === associatedLayerName);
        
        // 检查关联图层是否存在
        if (associatedLayerIndex === -1) {
          throw new Error(`致命错误: 在layersOrder中找不到关联图层 "${associatedLayerName}"`);
        }
        
        // 检查DNA序列中是否存在关联图层元素
        if (!dnaSequence[associatedLayerIndex]) {
          throw new Error(`致命错误: DNA序列中缺少关联图层 "${associatedLayerName}" 的元素`);
        }
        
        // 构造新的DNA元素字符串（元素名:层级）
        const layerParts = dnaSequence[associatedLayerIndex].split(":");
        if (layerParts.length >= 2) {
          const layerLevel = layerParts[1];
          const oldElementName = layerParts[0];
          
          // 检查关联图层元素是否与主图层元素同名
          if (oldElementName !== mainLayerElement) {
            console.log(`关联图层 "${associatedLayerName}" 的元素 "${oldElementName}" 与主图层 "${mainLayerName}" 的元素 "${mainLayerElement}" 不匹配，正在更新...`);
            dnaSequence[associatedLayerIndex] = `${mainLayerElement}:${layerLevel}`;
            console.log(`已将关联图层 "${associatedLayerName}" 的元素更新为: ${mainLayerElement}`);
          } else {
            console.log(`关联图层 "${associatedLayerName}" 的元素 "${oldElementName}" 与主图层 "${mainLayerName}" 的元素 "${mainLayerElement}" 已匹配，无需更新`);
          }
        } else {
          throw new Error(`致命错误: 关联图层 "${associatedLayerName}" 的DNA格式不正确`);
        }
      }
    });
  });
  
  // 重新组合DNA字符串
  const updatedDnaStr = dnaSequence.join(DNA_DELIMITER);
  console.log(`图层关联处理完成，更新后的DNA: ${updatedDnaStr}`);
  return updatedDnaStr;
};

/**
 * 模拟createDna函数
 * @param {Array} layers - 图层数组
 * @param {Object} layerConfig - 图层配置
 * @returns {string} DNA字符串
 */
const createDna = (layers, layerConfig = null) => {
  let randNum = [];
  layers.forEach((layer) => {
    // 随机选择一个元素
    const randomIndex = Math.floor(Math.random() * layer.elements.length);
    const element = layer.elements[randomIndex];
    randNum.push(`${element.id}:${element.filename}`);
  });
  
  // 应用图层关联规则（如果提供了图层配置）
  let dnaStr = randNum.join(DNA_DELIMITER);
  console.log(`生成的原始DNA: ${dnaStr}`);
  
  if (layerConfig && layerConfig.layerAssociations) {
    try {
      dnaStr = applyLayerAssociations(dnaStr, layerConfig);
    } catch (error) {
      console.error("图层关联处理失败:", error.message);
      throw error; // 重新抛出异常，终止NFT生成
    }
  }
  
  return dnaStr;
};

/**
 * 模拟NFT生成函数
 * @param {Object} layerConfig - 图层配置
 */
const generateNFT = (layerConfig) => {
  console.log(`\n开始生成NFT...`);
  
  // 模拟图层数据
  const layers = layerConfig.layersOrder.map(layer => {
    return {
      name: layer.name,
      elements: [
        { id: `${layer.name}_1`, filename: "file1" },
        { id: `${layer.name}_2`, filename: "file2" },
        { id: `${layer.name}_3`, filename: "file3" }
      ]
    };
  });
  
  try {
    const dna = createDna(layers, layerConfig);
    console.log(`NFT DNA: ${dna}`);
    console.log("NFT生成成功!\n");
    return true;
  } catch (error) {
    console.error("NFT生成失败:", error.message);
    console.log("按要求终止运行\n");
    return false;
  }
};

// 测试用例1: 正常情况 - 所有图层都存在且需要更新
console.log("=== 测试用例1: 正常情况 ===");
const validLayerConfig = {
  layersOrder: [
    { name: "background" },
    { name: "body" },
    { name: "clothes" },
    { name: "hair" }
  ],
  layerAssociations: {
    body: {
      clothes: "sameName"
    }
  }
};

generateNFT(validLayerConfig);

// 测试用例2: 主图层不存在（应该抛出异常并终止运行）
console.log("=== 测试用例2: 主图层不存在 ===");
const invalidLayerConfig1 = {
  layersOrder: [
    { name: "background" },
    { name: "body" },
    { name: "clothes" },
    { name: "hair" }
  ],
  layerAssociations: {
    nonExistentLayer: {  // 不存在的图层
      clothes: "sameName"
    }
  }
};

generateNFT(invalidLayerConfig1);

// 测试用例3: 关联图层不存在（应该抛出异常并终止运行）
console.log("=== 测试用例3: 关联图层不存在 ===");
const invalidLayerConfig2 = {
  layersOrder: [
    { name: "background" },
    { name: "body" },
    { name: "clothes" },
    { name: "hair" }
  ],
  layerAssociations: {
    body: {
      nonExistentLayer: "sameName"  // 不存在的关联图层
    }
  }
};

generateNFT(invalidLayerConfig2);

// 测试用例4: DNA序列中缺少元素（应该抛出异常并终止运行）
console.log("=== 测试用例4: DNA序列中缺少元素 ===");
const invalidLayerConfig3 = {
  layersOrder: [
    { name: "background" },
    { name: "body" }
    // 缺少clothes和hair图层，但关联配置中引用了clothes
  ],
  layerAssociations: {
    body: {
      clothes: "sameName"
    }
  }
};

generateNFT(invalidLayerConfig3);

console.log("所有测试完成!");