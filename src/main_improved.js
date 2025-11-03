// Functions and variables that need to be imported from the original main.js
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

const getElements = (path) => {
  return fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .map((i, index) => {
      if (i.includes("-")) {
        throw new Error(`Layer filename cannot contain hyphens (-), please modify filename: ${i}. It is recommended to replace hyphens (-) with underscores (_) or other characters.`);
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

  // Load layers and build configuration objects
  const layers = layerPaths.map((path, index) => {
    // If path is empty, return empty elements array
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
  
  // Add gender attribute to attributesList
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
      // Check if this layer is marked as "none" (should be skipped)
      if (dnaSequence[index] === "none:none") {
        return {
          name: layer.name,
          blend: layer.blend,
          opacity: layer.opacity,
          selectedElement: null,
        };
      }
      
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

// Helper function to select a group based on polling ratio
const selectGroupByPolling = (groupPolling) => {
  if (!groupPolling || Object.keys(groupPolling).length === 0) {
    return null;
  }
  
  // Create an array of groups with their respective weights
  const groups = [];
  Object.keys(groupPolling).forEach(groupName => {
    const weight = groupPolling[groupName];
    if (weight > 0) {
      groups.push({ name: groupName, weight });
    }
  });
  
  if (groups.length === 0) {
    return null;
  }
  
  // Calculate total weight
  const totalWeight = groups.reduce((sum, group) => sum + group.weight, 0);
  
  // Select a random group based on weight
  let random = Math.floor(Math.random() * totalWeight);
  for (const group of groups) {
    random -= group.weight;
    if (random < 0) {
      return group.name;
    }
  }
  
  // Fallback to first group if something goes wrong
  return groups[0].name;
};

// Helper function to get all layers in a group
const getLayersInGroup = (groupName, layerGroups, layersOrder) => {
  if (!layerGroups || !layerGroups[groupName]) {
    return [];
  }
  
  const groupLayerNames = layerGroups[groupName];
  return layersOrder.filter(layer => groupLayerNames.includes(layer.name));
};

// Helper function to get all layers not in excluded groups
const getLayersNotInExcludedGroups = (excludedGroups, layerGroups, layers) => {
  if (!excludedGroups || excludedGroups.length === 0) {
    return layers;
  }
  
  // Get all layer names in excluded groups
  const excludedLayerNames = new Set();
  excludedGroups.forEach(groupName => {
    if (layerGroups && layerGroups[groupName]) {
      layerGroups[groupName].forEach(layerName => {
        excludedLayerNames.add(layerName);
      });
    }
  });
  
  // Filter out excluded layers
  return layers.filter(layer => !excludedLayerNames.has(layer.name));
};

const createDna = (_layers, _layerConfig = null) => {
  let randNum = [];
  
  // Get layer configuration
  const layerGroups = _layerConfig && _layerConfig.layerGroups || {};
  const exclusiveGroups = _layerConfig && _layerConfig.exclusiveGroups || [];
  const groupPolling = _layerConfig && _layerConfig.groupPolling || {};
  const layersOrder = _layerConfig && _layerConfig.layersOrder || [];
  
  // Process group selection
  const selectedGroups = new Set();
  const excludedGroups = new Set();
  
  // Handle exclusive groups
  exclusiveGroups.forEach(groupSet => {
    // Select one group from each exclusive set based on polling ratio
    const availableGroups = groupSet.filter(group => !excludedGroups.has(group));
    if (availableGroups.length === 0) {
      return;
    }
    
    // Create a subset of groupPolling for available groups
    const availablePolling = {};
    availableGroups.forEach(group => {
      if (groupPolling[group] !== undefined) {
        availablePolling[group] = groupPolling[group];
      } else {
        // Default to 1 if group not in polling config
        availablePolling[group] = 1;
      }
    });
    
    const selectedGroup = selectGroupByPolling(availablePolling);
    if (selectedGroup) {
      selectedGroups.add(selectedGroup);
      
      // Exclude all other groups in this exclusive set
      groupSet.forEach(group => {
        if (group !== selectedGroup) {
          excludedGroups.add(group);
        }
      });
    }
  });
  
  // Add any non-exclusive groups that are in polling config
  Object.keys(groupPolling).forEach(group => {
    if (!excludedGroups.has(group) && !selectedGroups.has(group)) {
      // Check if this group is part of any exclusive set
      const isExclusive = exclusiveGroups.some(groupSet => groupSet.includes(group));
      if (!isExclusive) {
        selectedGroups.add(group);
      }
    }
  });
  
  // Filter layers to exclude those in excluded groups
  const filteredLayers = getLayersNotInExcludedGroups(Array.from(excludedGroups), layerGroups, _layers);
  
  // Process each filtered layer
  filteredLayers.forEach((layer, index) => {
    const elements = layer.elements;
    
    // Check if this layer is in any group
    let layerInGroup = false;
    let layerGroup = null;
    
    Object.keys(layerGroups).forEach(groupName => {
      if (layerGroups[groupName].includes(layer.name)) {
        layerInGroup = true;
        layerGroup = groupName;
      }
    });
    
    // If layer is in a group, check if the group is selected
    if (layerInGroup) {
      if (!selectedGroups.has(layerGroup)) {
        // Skip this layer if its group is not selected
        randNum.push("none:none");
        return;
      }
    }
    
    // If layer is not skipped, select an element normally
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
      dnaStr = applyLayerAssociations(dnaStr, _layerConfig);
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

// Function to apply layer association rules
/**
 * Apply layer association rules (mandatory)
 * @param {string} dnaStr - DNA string
 * @param {Object} layerConfig - Layer configuration
 * @returns {string} Updated DNA string
 * @throws {Error} Throws an exception when matching elements are not found
 */
const applyLayerAssociations = (dnaStr, layerConfig) => {
  // Check if layer association configuration exists
  if (!layerConfig.layerAssociations) {
    console.warn("Warning: Layer association configuration is missing");
    return dnaStr;
  }

  // Split DNA string into an array
  let dnaSequence = dnaStr.split(DNA_DELIMITER);
  
  // Get layer association configuration
  const associations = layerConfig.layerAssociations;
  
  // Iterate through each association rule
  Object.keys(associations).forEach(mainLayerName => {
    // Find the index of the main layer in layersOrder
    const mainLayerIndex = layerConfig.layersOrder.findIndex(layer => layer.name === mainLayerName);
    
    // Check if the main layer exists
    if (mainLayerIndex === -1) {
      throw new Error(`Fatal error: Main layer "${mainLayerName}" not found in layersOrder`);
    }
    
    // Check if the main layer element exists in the DNA sequence
    if (!dnaSequence[mainLayerIndex]) {
      throw new Error(`Fatal error: Missing element for main layer "${mainLayerName}" in DNA sequence`);
    }
    
    // Get the element name of the main layer (from DNA sequence)
    const mainLayerElement = dnaSequence[mainLayerIndex].split(":")[0];
    
    // Skip association if main layer is marked as "none" (skipped)
    if (mainLayerElement === "none") {
      console.log(`Skipping association for main layer "${mainLayerName}" because it's marked as none`);
      return;
    }
    
    console.log(`Element of main layer "${mainLayerName}": ${mainLayerElement}`);
    
    // Iterate through all associated layers
    Object.keys(associations[mainLayerName]).forEach(associatedLayerName => {
      // Check if the association type is sameName
      if (associations[mainLayerName][associatedLayerName] === "sameName") {
        // Find the index of the associated layer in layersOrder
        const associatedLayerIndex = layerConfig.layersOrder.findIndex(layer => layer.name === associatedLayerName);
        
        // Check if the associated layer exists
        if (associatedLayerIndex === -1) {
          throw new Error(`Fatal error: Associated layer "${associatedLayerName}" not found in layersOrder`);
        }
        
        // Check if the associated layer element exists in the DNA sequence
        if (!dnaSequence[associatedLayerIndex]) {
          throw new Error(`Fatal error: Missing element for associated layer "${associatedLayerName}" in DNA sequence`);
        }
        
        // Skip associated layer if it's marked as "none" (skipped)
        const associatedLayerElement = dnaSequence[associatedLayerIndex].split(":")[0];
        if (associatedLayerElement === "none") {
          console.log(`Skipping associated layer "${associatedLayerName}" because it's marked as none`);
          return;
        }
        
        // Construct new DNA element string (element_name:layer_level)
          const layerParts = dnaSequence[associatedLayerIndex].split(":");
          if (layerParts.length >= 2) {
            const layerLevel = layerParts[1];
            const oldElementName = layerParts[0];
            
            // Check if the associated layer element has the same name as the main layer element
            if (oldElementName !== mainLayerElement) {
              console.log(`Element "${oldElementName}" of associated layer "${associatedLayerName}" does not match element "${mainLayerElement}" of main layer "${mainLayerName}", updating...`);
              dnaSequence[associatedLayerIndex] = `${mainLayerElement}:${layerLevel}`;
              console.log(`Updated element of associated layer "${associatedLayerName}" to: ${mainLayerElement}`);
            } else {
              console.log(`Element "${oldElementName}" of associated layer "${associatedLayerName}" already matches element "${mainLayerElement}" of main layer "${mainLayerName}", no update needed`);
            }
          } else {
            throw new Error(`Fatal error: Incorrect DNA format for associated layer "${associatedLayerName}"`);
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
    saveMetaDataSingleFile(globalEditionCounterMeta - 1);
    
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
  
  // Reset global counters
  globalEditionCounterMeta = 1;
  globalEditionCounterJSON = 1;
  
  // Clear metadataList and dnaList
  metadataList = [];
  dnaList.clear();
  
  // Enable garbage collection (if available)
  if (global.gc) {
    console.log("Enabling garbage collection");
  }
  
  while (layerConfigIndex < layerConfigurations.length) {
    // Generate independent abstractedIndexes array for each configuration
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
    
    // Use gender specified in configuration
    const gender = layerConfigurations[layerConfigIndex].gender || (Math.random() > 0.5 ? "male" : "female");
    
    // Load corresponding layer configuration based on gender
    const layers = layersSetup(
      layerConfigurations[layerConfigIndex].layersOrder, gender
    );
    
    debugLogs
      ? console.log("Editions left to create: ", abstractedIndexes)
      : null;
      
    console.log(`Starting generation of ${layerConfigurations[layerConfigIndex].growEditionSizeTo} ${gender} NFT images`);
    
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
  createDna,
  applyLayerAssociations
};