// 需要从原始main.js导入的函数和变量
const basePath = process.cwd();
const { NETWORK } = require(`${basePath}/constants/network.js`);
const path = require("path");
const fs = require("fs");
const sha1 = require(`${basePath}/node_modules/sha1`);
const { createCanvas, loadImage } = require(`${basePath}/node_modules/canvas`);
const buildDir = `${basePath}/build`;
const layersDir = `${basePath}/layers`;
const {
  format,
  baseUri,
  description,
  background,
  uniqueDnaTorrance,
  layerConfigurations,
  rarityDelimiter,
  shuffleLayerConfigurations,
  debugLogs,
  extraMetadata,
  text,
  namePrefix,
  network,
  solanaMetadata,
  gif,
} = require(`${basePath}/src/config.js`);
const canvas = createCanvas(format.width, format.height);
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = format.smoothing;
var metadataList = [];
var attributesList = [];
var dnaList = new Set();
const DNA_DELIMITER = "-";
const HashlipsGiffer = require(`${basePath}/modules/HashlipsGiffer.js`);

let hashlipsGiffer = null;
let globalEditionCounter = 1;
let globalEditionCounterMeta = 1;

// 从原始main.js复制的必要函数
const buildSetup = () => {
  if (fs.existsSync(buildDir)) {
    fs.rmdirSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir);
  fs.mkdirSync(`${buildDir}/json`);
  fs.mkdirSync(`${buildDir}/images`);
  if (gif.export) {
    fs.mkdirSync(`${buildDir}/gifs`);
  }
};

const getRarityWeight = (_str) => {
  let nameWithoutExtension = _str.slice(0, -4);
  var nameWithoutWeight = Number(
    nameWithoutExtension.split(rarityDelimiter).pop()
  );
  if (isNaN(nameWithoutWeight)) {
    nameWithoutWeight = 1;
  }
  return nameWithoutWeight;
};

const cleanDna = (_str) => {
  const withoutOptions = removeQueryStrings(_str);
  var dna = Number(withoutOptions.split(":").shift());
  return dna;
};

const cleanName = (_str) => {
  let nameWithoutExtension = _str.slice(0, -4);
  var nameWithoutWeight = nameWithoutExtension.split(rarityDelimiter).shift();
  return nameWithoutWeight;
};

const getElements = (path) => {
  return fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .map((i, index) => {
      if (i.includes("-")) {
        throw new Error(`图层文件名不能包含破折号(-)，请修改文件名: ${i}。建议将破折号(-)替换为下划线(_)或其他字符。`);
      }
      return {
        id: index,
        name: cleanName(i),
        filename: i,
        path: `${path}/${i}`,
        weight: getRarityWeight(i),
      };
    });
};

const layersSetup = (layersOrder, gender) => {
  const baseLayersPath = `${layersDir}`;
  
  // 根据性别确定要加载的图层文件夹
  let layerPaths = [];
  if (gender === "male") {
    layerPaths = layersOrder.map(layer => {
      // male 专属图层
      if (layer.name === "body") {
        return `${baseLayersPath}/male/body`;
      } else if (layer.name === "clothes1" || layer.name === "clothes2") {
        // male 有 clothes1 和 clothes2 文件夹
        return `${baseLayersPath}/male/${layer.name}`;
      } else if (layer.name.startsWith("hair")) {
        // male 有 hair1 和 hair2 文件夹
        return `${baseLayersPath}/male/${layer.name}`;
      } 
      // neutral 图层
      else if (fs.existsSync(`${baseLayersPath}/neutral/${layer.name}`)) {
        return `${baseLayersPath}/neutral/${layer.name}`;
      }
      // 如果在 neutral 中找不到，则在 male 文件夹中查找（作为后备）
      else if (fs.existsSync(`${baseLayersPath}/male/${layer.name}`)) {
        return `${baseLayersPath}/male/${layer.name}`;
      }
      // 如果都找不到，返回一个空路径占位
      else {
        return "";
      }
    });
  } else if (gender === "female") {
    layerPaths = layersOrder.map(layer => {
      // female 专属图层
      if (layer.name === "body") {
        return `${baseLayersPath}/female/body`;
      } else if (layer.name === "clothes") {
        return `${baseLayersPath}/female/clothes`;
      } else if (layer.name.startsWith("hair")) {
        // female 有 hair1, hair2, hair3 文件夹
        return `${baseLayersPath}/female/${layer.name}`;
      }
      // neutral 图层
      else if (fs.existsSync(`${baseLayersPath}/neutral/${layer.name}`)) {
        return `${baseLayersPath}/neutral/${layer.name}`;
      }
      // 如果在 neutral 中找不到，则在 female 文件夹中查找（作为后备）
      else if (fs.existsSync(`${baseLayersPath}/female/${layer.name}`)) {
        return `${baseLayersPath}/female/${layer.name}`;
      }
      // 如果都找不到，返回一个空路径占位
      else {
        return "";
      }
    });
  }

  // 加载图层并构建配置对象
  const layers = layerPaths.map((path, index) => {
    // 如果路径为空，返回空元素数组
    if (path === "") {
      return { name: layersOrder[index].name, elements: [] };
    }
    
    const elements = getElements(path);
    return { name: layersOrder[index].name, elements };
  });

  return layers;
};

const saveImage = (_editionCount) => {
  fs.writeFileSync(
    `${buildDir}/images/${globalEditionCounter}.png`,
    canvas.toBuffer("image/png")
  );
  globalEditionCounter++;
};

const genColor = () => {
  let hue = Math.floor(Math.random() * 360);
  let pastel = `hsl(${hue}, 100%, ${background.brightness})`;
  return pastel;
};

const drawBackground = () => {
  ctx.fillStyle = background.static ? background.default : genColor();
  ctx.fillRect(0, 0, format.width, format.height);
};

const addMetadata = (_dna, _edition, _gender) => {
  let dateTime = Date.now();
  
  // 添加性别属性到attributesList
  attributesList.push({
    trait_type: "gender",
    value: _gender,
  });
  
  let tempMetadata = {
    name: `${namePrefix} #${globalEditionCounterMeta}`,
    description: description,
    image: `${baseUri}/${globalEditionCounterMeta}.png`,
    dna: sha1(_dna),
    edition: globalEditionCounterMeta,
    date: dateTime,
    ...extraMetadata,
    attributes: attributesList,
    compiler: "HashLips Art Engine - modified version",
  };
  
  metadataList.push(tempMetadata);
  attributesList = [];
  globalEditionCounterMeta++;
};

const addAttributes = (_element) => {
  let selectedElement = _element.layer.selectedElement;
  attributesList.push({
    trait_type: _element.layer.name,
    value: selectedElement.name,
  });
};

const drawElement = (_renderObject, _index, _layersLen) => {
  // 如果图像加载失败或selectedElement不存在，跳过绘制
  if (!_renderObject.loadedImage || !_renderObject.layer.selectedElement) {
    console.warn(`Skipping layer ${_renderObject.layer.name} due to missing element or image`);
    addAttributes(_renderObject);
    return;
  }
  
  ctx.globalAlpha = _renderObject.layer.opacity;
  ctx.globalCompositeOperation = _renderObject.layer.blend;
  text.only
    ? addText(
        `${_renderObject.layer.name}${text.spacer}${_renderObject.layer.selectedElement.name}`,
        text.xGap,
        text.yGap * (_index + 1),
        text.size
      )
    : ctx.drawImage(
        _renderObject.loadedImage,
        0,
        0,
        format.width,
        format.height
      );

  addAttributes(_renderObject);
};

const loadLayerImg = async (_layer) => {
  try {
    return new Promise(async (resolve) => {
      // 检查selectedElement是否存在
      if (!_layer.selectedElement) {
        console.warn(`Skipping layer ${_layer.name} due to missing element`);
        resolve({ layer: _layer, loadedImage: null });
        return;
      }
      
      // 检查文件是否存在
      if (!fs.existsSync(_layer.selectedElement.path)) {
        console.error("Image file does not exist:", _layer.selectedElement.path);
        resolve({ layer: _layer, loadedImage: null });
        return;
      }
      
      const image = await loadImage(`${_layer.selectedElement.path}`);
      resolve({ layer: _layer, loadedImage: image });
    });
  } catch (error) {
    console.error("Error loading image:", error);
    // 返回一个空对象而不是抛出错误
    return { layer: _layer, loadedImage: null };
  }
};

const constructLayerToDna = (_dna = "", _layers = []) => {
  const dnaSequence = _dna.split(DNA_DELIMITER);
  let mappedDnaToLayers = _layers.map((layer, index) => {
    // 检查DNA序列中是否存在该索引的元素
    if (dnaSequence[index]) {
      let selectedElement = layer.elements.find(
        (e) => e.id == cleanDna(dnaSequence[index])
      );
      return {
        name: layer.name,
        blend: layer.blend,
        opacity: layer.opacity,
        selectedElement: selectedElement,
      };
    } else {
      // 如果DNA序列中不存在该索引的元素，返回空的selectedElement
      return {
        name: layer.name,
        blend: layer.blend,
        opacity: layer.opacity,
        selectedElement: null,
      };
    }
  });
  return mappedDnaToLayers;
};

const filterDNAOptions = (_dna) => {
  const dnaItems = _dna.split(DNA_DELIMITER);
  const filteredDNA = dnaItems.filter((element) => {
    const query = /(\?.*$)/;
    const querystring = query.exec(element);
    if (!querystring) {
      return true;
    }
    const options = querystring[1].split("&").reduce((r, setting) => {
      const keyPairs = setting.split("=");
      return { ...r, [keyPairs[0]]: keyPairs[1] };
    }, []);

    return options.bypassDNA;
  });

  return filteredDNA.join(DNA_DELIMITER);
};

const removeQueryStrings = (_dna) => {
  const query = /(\?.*$)/;
  return _dna.replace(query, "");
};

const isDnaUnique = (_DnaList = new Set(), _dna = "") => {
  const _filteredDNA = filterDNAOptions(_dna);
  return !_DnaList.has(_filteredDNA);
};

const createDna = (_layers, _layerConfig = null) => {
  let randNum = [];
  _layers.forEach((layer) => {
    const elements = layer.elements;
    var totalWeight = 0;
    elements.forEach((element) => {
      totalWeight += element.weight;
    });
    // number between 0 - totalWeight
    let random = Math.floor(Math.random() * totalWeight);
    for (var i = 0; i < elements.length; i++) {
      // subtract the current weight from the random weight until we reach a sub zero value.
      random -= elements[i].weight;
      if (random < 0) {
        return randNum.push(
          `${elements[i].id}:${elements[i].filename}${
            layer.bypassDNA ? "?bypassDNA=true" : ""
          }`
        );
      }
    }
  });
  
  // 应用图层关联规则（如果提供了图层配置）
  let dnaStr = randNum.join(DNA_DELIMITER);
  if (_layerConfig && _layerConfig.layerAssociations) {
    try {
      dnaStr = applyLayerAssociations(dnaStr, _layerConfig);
    } catch (error) {
      console.error("图层关联处理失败:", error.message);
      throw error; // 重新抛出异常，终止NFT生成
    }
  }
  
  return dnaStr;
};

const writeMetaData = (_data) => {
  fs.writeFileSync(`${buildDir}/json/_metadata.json`, _data);
};

const saveMetaDataSingleFile = (_editionCount) => {
  let metadata = metadataList.find((meta) => meta.edition == _editionCount);
  debugLogs
    ? console.log(
        `Writing metadata for ${_editionCount}: ${JSON.stringify(metadata)}`
      )
    : null;
  fs.writeFileSync(
    `${buildDir}/json/${globalEditionCounterJSON}.json`,
    JSON.stringify(metadata, null, 2)
  );
  globalEditionCounterJSON++;
};

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

// 应用图层关联规则的函数
/**
 * 应用图层关联规则（必填项）
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

// 添加缺失的addText函数
const addText = (_sig, x, y, size) => {
  ctx.fillStyle = text.color;
  ctx.font = `${size}px ${text.family}`;
  ctx.textBaseline = text.baseline;
  ctx.fillText(_sig, x, y);
};

// 配置参数
const CONCURRENT_LIMIT = 5; // 并发生成图片的数量限制
const BATCH_SIZE = 10; // 每批处理的图片数量
const MEMORY_CHECK_INTERVAL = 20; // 每生成20张图片检查一次内存

// 内存检查函数
function checkMemoryUsage() {
  const used = process.memoryUsage();
  console.log(`内存使用情况: 
    RSS: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB
    HeapTotal: ${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB
    HeapUsed: ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB
    External: ${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`);
  
  // 如果内存使用超过1GB，触发垃圾回收
  if (used.heapUsed > 1024 * 1024 * 1024) {
    console.log("内存使用过高，触发垃圾回收...");
    if (global.gc) {
      global.gc();
    }
  }
}

// 带并发控制的图片生成函数
async function createNFTWithConcurrencyControl(
  layers, 
  layerConfig, 
  editionCount, 
  abstractedIndexes,
  gender
) {
  let newDna = createDna(layers, layerConfig);
  if (!isDnaUnique(dnaList, newDna)) {
    return { success: false, reason: "DNA exists!" };
  }
  
  try {
    let results = constructLayerToDna(newDna, layers);
    let loadedElements = [];

    // 并发加载图层，但限制并发数
    for (let i = 0; i < results.length; i += CONCURRENT_LIMIT) {
      const batch = results.slice(i, i + CONCURRENT_LIMIT);
      const batchPromises = batch.map(layer => loadLayerImg(layer));
      const batchResults = await Promise.all(batchPromises);
      loadedElements.push(...batchResults);
    }

    // 渲染图片
    debugLogs ? console.log("Clearing canvas") : null;
    ctx.clearRect(0, 0, format.width, format.height);
    
    if (gif.export) {
      hashlipsGiffer = new HashlipsGiffer(
        canvas,
        ctx,
        `${buildDir}/gifs/${abstractedIndexes[0]}.gif`,
        gif.repeat,
        gif.quality,
        gif.delay
      );
      hashlipsGiffer.start();
    }
    
    if (background.generate) {
      drawBackground();
    }
    
    // 使用loadedElements而不是renderObjectArray
    loadedElements.forEach((renderObject, index) => {
      drawElement(
        renderObject,
        index,
        layerConfig.layersOrder.length
      );
      if (gif.export) {
        hashlipsGiffer.add();
      }
    });
    
    if (gif.export) {
      hashlipsGiffer.stop();
    }
    
    saveImage(abstractedIndexes[0]);
    addMetadata(newDna, abstractedIndexes[0], gender);
    saveMetaDataSingleFile(globalEditionCounterMeta - 1);
    
    console.log(
      `Created edition: ${abstractedIndexes[0]}, with DNA: ${sha1(newDna)}`
    );
    
    dnaList.add(filterDNAOptions(newDna));
    
    return { success: true, edition: abstractedIndexes[0] };
  } catch (error) {
    console.error("生成NFT时出错:", error);
    return { success: false, reason: error.message };
  }
}

// 批量处理NFT生成
async function batchCreateNFTs(
  layers, 
  layerConfig, 
  editionCount, 
  abstractedIndexes,
  gender
) {
  const batches = [];
  
  // 将任务分成批次
  for (let i = 0; i < abstractedIndexes.length; i += BATCH_SIZE) {
    batches.push(abstractedIndexes.slice(i, i + BATCH_SIZE));
  }
  
  let successCount = 0;
  let failCount = 0;
  
  // 顺序处理每个批次
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`处理批次 ${batchIndex + 1}/${batches.length}，包含 ${batch.length} 张图片`);
    
    // 并发处理批次内的图片
    const batchPromises = batch.map(async (edition, index) => {
      const result = await createNFTWithConcurrencyControl(
        layers, 
        layerConfig, 
        editionCount + index, 
        [edition],
        gender
      );
      
      return result;
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // 统计结果
    batchResults.forEach(result => {
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        console.log(`生成失败: ${result.reason}`);
      }
    });
    
    // 每个批次完成后检查内存
    if (batchIndex % MEMORY_CHECK_INTERVAL === 0) {
      checkMemoryUsage();
    }
    
    // 短暂暂停，让系统有机会回收资源
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { successCount, failCount };
}

// 修改后的startCreating函数
const startCreatingWithConcurrencyControl = async () => {
  let layerConfigIndex = 0;
  let failedCount = 0;
  
  // 重置全局计数器
  globalEditionCounterMeta = 1;
  globalEditionCounterJSON = 1;
  
  // 清空metadataList和dnaList
  metadataList = [];
  dnaList.clear();
  
  // 启用垃圾回收（如果可用）
  if (global.gc) {
    console.log("启用垃圾回收");
  }
  
  while (layerConfigIndex < layerConfigurations.length) {
    // 为每个配置生成独立的abstractedIndexes数组
    let abstractedIndexes = [];
    for (
      let i = network == NETWORK.sol ? 0 : 1;
      i <= layerConfigurations[layerConfigIndex].growEditionSizeTo;
      i++
    ) {
      abstractedIndexes.push(i);
    }
    
    if (shuffleLayerConfigurations) {
      abstractedIndexes = shuffle(abstractedIndexes);
    }
    
    // 使用配置中指定的性别
    const gender = layerConfigurations[layerConfigIndex].gender || (Math.random() > 0.5 ? "male" : "female");
    
    // 根据性别加载对应的图层配置
    const layers = layersSetup(
      layerConfigurations[layerConfigIndex].layersOrder, gender
    );
    
    debugLogs
      ? console.log("Editions left to create: ", abstractedIndexes)
      : null;
      
    console.log(`开始生成 ${layerConfigurations[layerConfigIndex].growEditionSizeTo} 张 ${gender} NFT图片`);
    
    // 使用批量处理函数
    const result = await batchCreateNFTs(
      layers, 
      layerConfigurations[layerConfigIndex], 
      1, 
      abstractedIndexes,
      gender
    );
    
    console.log(`生成完成: 成功 ${result.successCount} 张, 失败 ${result.failCount} 张`);
    
    layerConfigIndex++;
  }
  
  writeMetaData(JSON.stringify(metadataList, null, 2));
  console.log("所有NFT生成完成!");
};
// 导出函数
module.exports = {
  startCreatingWithConcurrencyControl,
  buildSetup,
  checkMemoryUsage
};