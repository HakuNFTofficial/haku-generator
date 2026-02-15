// Functions and variables that need to be imported from the original main.js
const basePath = process.cwd();
const { NETWORK } = require(`${basePath}/constants/network.js`);
const path = require("path");
const fs = require("fs");
const sha1 = require(`${basePath}/node_modules/sha1`);
// Prefer node-canvas; if it fails to load due to native deps, fallback to skia-canvas
let createCanvas, loadImage;
try {
  const canvasLib = require(`${basePath}/node_modules/canvas`);
  createCanvas = canvasLib.createCanvas;
  loadImage = canvasLib.loadImage;
} catch (err) {
  try {
    const skia = require(`${basePath}/node_modules/skia-canvas`);
    createCanvas = typeof skia.createCanvas === "function" ? skia.createCanvas : (w, h) => new skia.Canvas(w, h);
    loadImage = skia.loadImage;
    console.warn("node-canvas 加载失败，已回退到 skia-canvas");
  } catch (fallbackErr) {
    throw err; // 保持原始错误，提示用户修复 node-canvas
  }
}
const buildDir = `${basePath}/build`;
const layersDir = `${basePath}/layers`;
// Allow overriding config via environment variable NFT_CONFIG
const configPath = process.env.NFT_CONFIG || `${basePath}/src/config.js`;
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
} = require(configPath);
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
let globalEditionCounterJSON = 1;

// Necessary functions copied from the original main.js
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

const getElements = (path, excludeSuffix = null) => {
  return fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    // Filter out files with the specified suffix if provided
    .filter((item) => {
      if (excludeSuffix) {
        // Handle multiple exclusion rules
        if (typeof excludeSuffix === 'object' && !Array.isArray(excludeSuffix)) {
          // Extract layer name from path (last part of the path)
          const pathParts = path.split('/');
          const layerName = pathParts[pathParts.length - 1];
          
          // Check for specific layer rule first
          if (excludeSuffix[layerName]) {
            // Use regex pattern to match: suffix + # + number + .png
            const suffix = excludeSuffix[layerName];
            const pattern = new RegExp(`${suffix}#\\d+\\.png$`);
            return !pattern.test(item);
          }
          // Check for default rule
          else if (excludeSuffix["*"]) {
            // Use regex pattern to match: suffix + # + number + .png
            const suffix = excludeSuffix["*"];
            const pattern = new RegExp(`${suffix}#\\d+\\.png$`);
            return !pattern.test(item);
          }
        }
        // If excludeSuffix is a string (backward compatibility)
        else if (typeof excludeSuffix === 'string') {
          // Use regex pattern to match: suffix + # + number + .png
          const pattern = new RegExp(`${excludeSuffix}#\\d+\\.png$`);
          return !pattern.test(item);
        }
        // If excludeSuffix is an array of suffixes to exclude
        else if (Array.isArray(excludeSuffix)) {
          return !excludeSuffix.some(suffix => {
            // Use regex pattern to match: suffix + # + number + .png
            const pattern = new RegExp(`${suffix}#\\d+\\.png$`);
            return pattern.test(item);
          });
        }
      }
      return true;
    })
    .map((i, index) => {
      if (i.includes("-")) {
        throw new Error(`Layer filenames cannot contain hyphens (-), please modify the filename: ${i}. It is recommended to replace hyphens (-) with underscores (_) or other characters.`);
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

const layersSetup = (layersOrder, gender, excludeSuffix = null) => {
  const baseLayersPath = `${layersDir}`;
  
  // Determine layer folders to load based on gender
  let layerPaths = [];
  if (gender === "male") {
    layerPaths = layersOrder.map(layer => {
      // male exclusive layers
      if (layer.name === "body") {
        return `${baseLayersPath}/male/body`;
      } else if (layer.name === "clothes1" || layer.name === "clothes2") {
        // male has clothes1 and clothes2 folders
        return `${baseLayersPath}/male/${layer.name}`;
      } else if (layer.name.startsWith("hair")) {
        // male has hair1 and hair2 folders
        return `${baseLayersPath}/male/${layer.name}`;
      } 
      // neutral layers
      else if (fs.existsSync(`${baseLayersPath}/neutral/${layer.name}`)) {
        return `${baseLayersPath}/neutral/${layer.name}`;
      }
      // If not found in neutral, look in male folder (as fallback)
      else if (fs.existsSync(`${baseLayersPath}/male/${layer.name}`)) {
        return `${baseLayersPath}/male/${layer.name}`;
      }
      // If not found in either, return an empty path placeholder
      else {
        return "";
      }
    });
  } else if (gender === "female") {
    layerPaths = layersOrder.map(layer => {
      // female exclusive layers
      if (layer.name === "body") {
        return `${baseLayersPath}/female/body`;
      } else if (layer.name === "clothes") {
        return `${baseLayersPath}/female/clothes`;
      } else if (layer.name.startsWith("hair")) {
        // female has hair1, hair2, hair3 folders
        return `${baseLayersPath}/female/${layer.name}`;
      }
      // neutral layers
      else if (fs.existsSync(`${baseLayersPath}/neutral/${layer.name}`)) {
        return `${baseLayersPath}/neutral/${layer.name}`;
      }
      // If not found in neutral, look in female folder (as fallback)
      else if (fs.existsSync(`${baseLayersPath}/female/${layer.name}`)) {
        return `${baseLayersPath}/female/${layer.name}`;
      }
      // If not found in either, return an empty path placeholder
      else {
        return "";
      }
    });
  }

  // Load layers and build configuration object
  const layers = layerPaths.map((path, index) => {
    // If path is empty, return empty elements array
    if (path === "") {
      return { name: layersOrder[index].name, elements: [] };
    }
    
    const elements = getElements(path, excludeSuffix);
    return { name: layersOrder[index].name, elements };
  });

  // Filter out layers with no elements to avoid DNA sequence index mismatch
  const filteredLayers = layers.filter(layer => {
    if (!layer.elements || layer.elements.length === 0) {
      console.log(`Filtering out layer "${layer.name}" - no elements found`);
      return false;
    }
    return true;
  });

  return filteredLayers;
};

const saveImage = (_editionCount) => {
  // Use the edition number as the image filename to ensure consistency
  fs.writeFileSync(
    `${buildDir}/images/${_editionCount}.png`,
    canvas.toBuffer("image/png")
  );
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
  
  // Add gender attribute to attributesList
  attributesList.push({
    trait_type: "gender",
    value: _gender,
  });
  
  let tempMetadata = {
    name: `${namePrefix} #${_edition}`,
    description: description,
    image: `${baseUri}/${_edition}.png`,
    dna: sha1(_dna),
    edition: _edition,
    date: dateTime,
    ...extraMetadata,
    attributes: attributesList,
    compiler: "HashLips Art Engine - modified version",
  };
  
  metadataList.push(tempMetadata);
  attributesList = [];
};

const addAttributes = (_element) => {
  let selectedElement = _element.layer.selectedElement;
  attributesList.push({
    trait_type: _element.layer.name,
    value: selectedElement.name,
  });
};

const drawElement = (_renderObject, _index, _layersLen) => {
  // Skip drawing if image loading fails or selectedElement does not exist
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
      // Check if selectedElement exists
      if (!_layer.selectedElement) {
        console.warn(`Skipping layer ${_layer.name} due to missing element`);
        resolve({ layer: _layer, loadedImage: null });
        return;
      }
      
      // Check if file exists
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
    // Return an empty object instead of throwing an error
    return { layer: _layer, loadedImage: null };
  }
};

const constructLayerToDna = (_dna = "", _layers = []) => {
  const dnaSequence = _dna.split(DNA_DELIMITER);
  let mappedDnaToLayers = _layers.map((layer, index) => {
    // Check if an element exists at this index in the DNA sequence
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
      // If no element exists at this index in the DNA sequence, return empty selectedElement
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
    
    // Note: Empty layers are already filtered out in layersSetup
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
  
  // Apply layer association rules (if layer configuration is provided)
  let dnaStr = randNum.join(DNA_DELIMITER);
  if (_layerConfig && _layerConfig.layerAssociations) {
    try {
      // Pass actual layers array to enable name-based mapping
      dnaStr = applyLayerAssociations(dnaStr, _layerConfig, _layers);
    } catch (error) {
      console.error("Layer association processing failed:", error.message);
      throw error; // Re-throw exception to terminate NFT generation
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
  // Use the edition number as the JSON filename to ensure consistency
  fs.writeFileSync(
    `${buildDir}/json/${_editionCount}.json`,
    JSON.stringify(metadata, null, 2)
  );
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

// Function to apply layer association rules
/**
 * Apply layer association rules using name-based mapping
 * @param {string} dnaStr - DNA string
 * @param {Object} layerConfig - Layer configuration
 * @param {Array} actualLayers - Actual layers array (filtered)
 * @returns {string} Updated DNA string
 * @throws {Error} Throws an exception when matching elements are not found
 */
const applyLayerAssociations = (dnaStr, layerConfig, actualLayers) => {
  // Check if layer association configuration exists
  if (!layerConfig.layerAssociations) {
    console.warn("Warning: Layer association configuration is missing");
    return dnaStr;
  }

  // Split DNA string into an array
  let dnaSequence = dnaStr.split(DNA_DELIMITER);
  
  // Build name-to-index mapping for actual layers
  // This solves the index mismatch issue when layers are filtered
  const layerNameToIndex = {};
  actualLayers.forEach((layer, index) => {
    layerNameToIndex[layer.name] = index;
  });
  
  debugLogs && console.log(`Layer name mapping:`, layerNameToIndex);
  
  // Get layer association configuration
  const associations = layerConfig.layerAssociations;
  
  // Iterate through each association rule
  Object.keys(associations).forEach(mainLayerName => {
    // Use name-based mapping instead of layersOrder index
    const mainLayerIndex = layerNameToIndex[mainLayerName];
    
    // Check if the main layer exists in actual layers
    if (mainLayerIndex === undefined) {
      console.log(`Main layer "${mainLayerName}" not found in actual layers (may be filtered out), skipping association`);
      return;
    }
    
    // Check if the main layer element exists in the DNA sequence
    if (!dnaSequence[mainLayerIndex]) {
      console.log(`Main layer "${mainLayerName}" has no element in DNA sequence, skipping association`);
      return;
    }
    
    // Get the element id and filename of the main layer (from DNA sequence)
    const mainLayerParts = dnaSequence[mainLayerIndex].split(":");
    const mainLayerElement = mainLayerParts[0]; // id
    const mainLayerFilename = mainLayerParts[1]; // filename
    console.log(`Element of main layer "${mainLayerName}": id=${mainLayerElement}, filename=${mainLayerFilename}`);
    
    // Iterate through all associated layers
    Object.keys(associations[mainLayerName]).forEach(associatedLayerName => {
      // Check if the association type is sameName
      if (associations[mainLayerName][associatedLayerName] === "sameName") {
        // Use name-based mapping for associated layer
        const associatedLayerIndex = layerNameToIndex[associatedLayerName];
        
        // Check if the associated layer exists in actual layers
        if (associatedLayerIndex === undefined) {
          console.log(`Associated layer "${associatedLayerName}" not found in actual layers (may be filtered out), skipping`);
          return;
        }
        
        // Check if the associated layer element exists in the DNA sequence
        if (!dnaSequence[associatedLayerIndex]) {
          console.log(`Associated layer "${associatedLayerName}" has no element in DNA sequence, skipping`);
          return;
        }
        
        // Construct new DNA element string using BOTH id and filename from main layer
          const associatedLayerParts = dnaSequence[associatedLayerIndex].split(":");
          if (associatedLayerParts.length >= 2) {
            const oldElementId = associatedLayerParts[0];
            const oldElementFilename = associatedLayerParts[1];
            
            // Check if the associated layer element matches the main layer element
            // For sameName association, both id and filename should match
            if (oldElementId !== mainLayerElement || oldElementFilename !== mainLayerFilename) {
              console.log(`Updating associated layer "${associatedLayerName}": ${oldElementId}:${oldElementFilename} → ${mainLayerElement}:${mainLayerFilename}`);
              // Use BOTH id and filename from main layer
              dnaSequence[associatedLayerIndex] = `${mainLayerElement}:${mainLayerFilename}`;
              console.log(`✓ Updated successfully`);
            } else {
              console.log(`Associated layer "${associatedLayerName}" already matches main layer "${mainLayerName}", no update needed`);
            }
          } else {
            console.warn(`Warning: Incorrect DNA format for associated layer "${associatedLayerName}", skipping`);
            return;
          }
        }
      });
    });
    
    // Re-combine DNA string
    const updatedDnaStr = dnaSequence.join(DNA_DELIMITER);
    console.log(`Layer association processing completed, updated DNA: ${updatedDnaStr}`);
    return updatedDnaStr;
  };
  
  // Add missing addText function
  const addText = (_sig, x, y, size) => {
    ctx.fillStyle = text.color;
    ctx.font = `${size}px ${text.family}`;
    ctx.textBaseline = text.baseline;
    ctx.fillText(_sig, x, y);
  };
  
  // Configuration parameters
  const CONCURRENT_LIMIT = 5; // Limit on concurrent image generation
  const BATCH_SIZE = 10; // Number of images processed per batch
  const MEMORY_CHECK_INTERVAL = 20; // Check memory usage every 20 images generated
  
  // Memory check function
  function checkMemoryUsage() {
    const used = process.memoryUsage();
    console.log(`Memory usage: 
      RSS: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB
      HeapTotal: ${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB
      HeapUsed: ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB
      External: ${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`);
    
    // Trigger garbage collection if memory usage exceeds 1GB
    if (used.heapUsed > 1024 * 1024 * 1024) {
      console.log("High memory usage, triggering garbage collection...");
      if (global.gc) {
        global.gc();
      }
    }
  }

// Image generation function with concurrency control
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

    // Concurrently load layers, but limit concurrency
    for (let i = 0; i < results.length; i += CONCURRENT_LIMIT) {
      const batch = results.slice(i, i + CONCURRENT_LIMIT);
      const batchPromises = batch.map(layer => loadLayerImg(layer));
      const batchResults = await Promise.all(batchPromises);
      loadedElements.push(...batchResults);
    }

    // Render image
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
    
    // Use loadedElements instead of renderObjectArray
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
    saveMetaDataSingleFile(abstractedIndexes[0]);
    
    console.log(
      `Created edition: ${abstractedIndexes[0]}, with DNA: ${sha1(newDna)}`
    );
    
    dnaList.add(filterDNAOptions(newDna));
    
    return { success: true, edition: abstractedIndexes[0] };
  } catch (error) {
    console.error("Error generating NFT:", error);
    return { success: false, reason: error.message };
  }
}

// Batch process NFT generation
async function batchCreateNFTs(
  layers, 
  layerConfig, 
  editionCount, 
  abstractedIndexes,
  gender
) {
  const batches = [];
  
  // Divide tasks into batches
  for (let i = 0; i < abstractedIndexes.length; i += BATCH_SIZE) {
    batches.push(abstractedIndexes.slice(i, i + BATCH_SIZE));
  }
  
  let successCount = 0;
  let failCount = 0;
  
  // Process each batch sequentially
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length}, containing ${batch.length} images`);
    
    // Concurrently process images within the batch
    const batchPromises = batch.map(async (edition, index) => {
      // Retry mechanism: try up to uniqueDnaTorrance times
      let retryCount = 0;
      let result = null;
      
      while (retryCount < uniqueDnaTorrance) {
        result = await createNFTWithConcurrencyControl(
          layers, 
          layerConfig, 
          editionCount + index, 
          [edition],
          gender
        );
        
        // If successful, break out of retry loop
        if (result.success) {
          break;
        }
        
        retryCount++;
        
        // Log retry attempts for DNA conflicts
        if (result.reason === "DNA exists!" && retryCount < uniqueDnaTorrance) {
          console.log(`Edition ${edition} - DNA conflict, retrying (${retryCount}/${uniqueDnaTorrance})...`);
        }
      }
      
      // If still failed after all retries
      if (!result.success) {
        console.error(`Edition ${edition} - Failed after ${retryCount} retries: ${result.reason}`);
      }
      
      return result;
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Statistics results
    batchResults.forEach(result => {
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        console.log(`Generation failed: ${result.reason}`);
      }
    });
    
    // Check memory after each batch completion
    if (batchIndex % MEMORY_CHECK_INTERVAL === 0) {
      checkMemoryUsage();
    }
    
    // Brief pause to allow the system to reclaim resources
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { successCount, failCount };
}

// Modified startCreating function
const startCreatingWithConcurrencyControl = async () => {
  let layerConfigIndex = 0;
  let failedCount = 0;
  let editionOffset = 0; // Track cumulative edition offset
  
  // Clear metadataList and dnaList
  metadataList = [];
  dnaList.clear();
  
  // Enable garbage collection (if available)
  if (global.gc) {
    console.log("Enabling garbage collection");
  }
  
  while (layerConfigIndex < layerConfigurations.length) {
    // Calculate the starting edition number for this configuration
    const startEdition = editionOffset + (network == NETWORK.sol ? 0 : 1);
    const endEdition = editionOffset + layerConfigurations[layerConfigIndex].growEditionSizeTo;
    
    // Generate edition indexes for this configuration
    let abstractedIndexes = [];
    for (let i = startEdition; i <= endEdition; i++) {
      abstractedIndexes.push(i);
    }
    
    // Update offset for next configuration
    editionOffset = endEdition;
    
    if (shuffleLayerConfigurations) {
      abstractedIndexes = shuffle(abstractedIndexes);
    }
    
    // Use gender specified in configuration
    const gender = layerConfigurations[layerConfigIndex].gender || (Math.random() > 0.5 ? "male" : "female");
    
    // Load corresponding layer configuration based on gender
    const layers = layersSetup(
      layerConfigurations[layerConfigIndex].layersOrder, gender, layerConfigurations[layerConfigIndex].excludeSuffixes || layerConfigurations[layerConfigIndex].excludeSuffix
    );
    
    debugLogs
      ? console.log("Editions left to create: ", abstractedIndexes)
      : null;
      
    console.log(`Starting generation of ${layerConfigurations[layerConfigIndex].growEditionSizeTo} ${gender} NFT images (editions ${startEdition}-${endEdition})`);
    
    // Use batch processing function
    const result = await batchCreateNFTs(
      layers, 
      layerConfigurations[layerConfigIndex], 
      1, 
      abstractedIndexes,
      gender
    );
    
    console.log(`Generation completed: Successfully generated ${result.successCount} images, failed ${result.failCount} images`);
    
    layerConfigIndex++;
  }
  
  writeMetaData(JSON.stringify(metadataList, null, 2));
  console.log("All NFT generation completed!");
};
// Export functions
module.exports = {
  startCreatingWithConcurrencyControl,
  buildSetup,
  checkMemoryUsage,
  getElements
};
