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

// Image cache to avoid repeated loading of the same images
const imageCache = new Map();
// Cache statistics
let cacheHits = 0;
let cacheMisses = 0;

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
      // If not found anywhere, return an empty path placeholder
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
      // If not found anywhere, return an empty path placeholder
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
    
    const elements = getElements(path);
    return { name: layersOrder[index].name, elements };
  });

  return layers;
};

// Add global variable to track global edition counter
let globalEditionCounter = 1;

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

// Add global variable to track global edition counter
let globalEditionCounterMeta = 1;

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
    compiler: "HashLips Art Engine",
  };
  if (network == NETWORK.sol) {
    tempMetadata = {
      //Added metadata for solana
      name: tempMetadata.name,
      symbol: solanaMetadata.symbol,
      description: tempMetadata.description,
      //Added metadata for solana
      seller_fee_basis_points: solanaMetadata.seller_fee_basis_points,
      image: `${globalEditionCounterMeta}.png`,
      //Added metadata for solana
      external_url: solanaMetadata.external_url,
      edition: globalEditionCounterMeta,
      ...extraMetadata,
      attributes: attributesList,
      properties: {
        files: [
          {
            uri: `${globalEditionCounterMeta}.png`,
            type: "image/png",
          },
        ],
        category: "image",
        creators: solanaMetadata.creators,
      },
    };
  }
  metadataList.push(tempMetadata);
  attributesList = [];
  globalEditionCounterMeta++;
};

const addAttributes = (_element) => {
  let selectedElement = _element.layer.selectedElement;
  // Check if selectedElement exists
  if (!selectedElement) {
    // If selectedElement does not exist, add a default value
    attributesList.push({
      trait_type: _element.layer.name,
      value: "None",
    });
    return;
  }
  
  attributesList.push({
    trait_type: _element.layer.name,
    value: selectedElement.name,
  });
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
      
      // Check cache first
      const cacheKey = _layer.selectedElement.path;
      if (imageCache.has(cacheKey)) {
        cacheHits++;
        if (debugLogs) {
          console.log(`Cache HIT: ${cacheKey} (Total hits: ${cacheHits})`);
        }
        resolve({ layer: _layer, loadedImage: imageCache.get(cacheKey) });
        return;
      }
      
      // Load image from disk
      const image = await loadImage(`${_layer.selectedElement.path}`);
      
      // Store in cache
      imageCache.set(cacheKey, image);
      cacheMisses++;
      if (debugLogs) {
        console.log(`Cache MISS: ${cacheKey} (Total misses: ${cacheMisses}, Cache size: ${imageCache.size})`);
      }
      
      resolve({ layer: _layer, loadedImage: image });
    });
  } catch (error) {
    console.error("Error loading image:", error);
    // Return an empty object instead of throwing an error
    return { layer: _layer, loadedImage: null };
  }
};

/**
 * Clear the image cache
 * Call this function to free up memory when needed
 */
const clearImageCache = () => {
  const size = imageCache.size;
  imageCache.clear();
  console.log(`Image cache cleared. Removed ${size} cached images.`);
  // Reset statistics
  cacheHits = 0;
  cacheMisses = 0;
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics object
 */
const getCacheStats = () => {
  return {
    size: imageCache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: cacheHits + cacheMisses > 0 ? ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(2) + '%' : '0%'
  };
};

const addText = (_sig, x, y, size) => {
  ctx.fillStyle = text.color;
  ctx.font = `${text.weight} ${size}pt ${text.family}`;
  ctx.textBaseline = text.baseline;
  ctx.textAlign = text.align;
  ctx.fillText(_sig, x, y);
};

const drawElement = (_renderObject, _index, _layersLen) => {
  // Skip drawing if image loading failed or selectedElement does not exist
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

/**
 * In some cases a DNA string may contain optional query parameters for options
 * such as bypassing the DNA isUnique check, this function filters out those
 * items without modifying the stored DNA.
 *
 * @param {String} _dna New DNA string
 * @param {Array} _layersOrder Optional - Array of layer order config
 * @returns new DNA string with any items that should be filtered, removed.
 */
const filterDNAOptions = (_dna, _layersOrder = []) => {
  const dnaItems = _dna.split(DNA_DELIMITER);
  const filteredDNA = dnaItems.filter((element, index) => {
    // Check if this layer should be bypassed in DNA (from config)
    if (_layersOrder.length > 0 && _layersOrder[index] && _layersOrder[index].bypassDNA) {
      return false;
    }
    
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

/**
 * Cleaning function for DNA strings. When DNA strings include an option, it
 * is added to the filename with a ?setting=value query string. It needs to be
 * removed to properly access the file name before Drawing.
 *
 * @param {String} _dna The entire newDNA string
 * @returns Cleaned DNA string without querystring parameters.
 */
const removeQueryStrings = (_dna) => {
  const query = /(\?.*$)/;
  return _dna.replace(query, "");
};

const isDnaUnique = (_DnaList = new Set(), _dna = "", _layersOrder = []) => {
  const _filteredDNA = filterDNAOptions(_dna, _layersOrder);
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

// Add global variable to track global edition counter
let globalEditionCounterJSON = 1;

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

const startCreating = async () => {
  let layerConfigIndex = 0;
  let failedCount = 0;
  // Reset global counters
  globalEditionCounterMeta = 1;
  globalEditionCounterJSON = 1;
  // Clear metadataList and dnaList
  metadataList = [];
  dnaList.clear();
  // Clear image cache
  imageCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
  
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
    
    // Reset editionCount for each configuration
    let editionCount = 1;
    
    // Use gender specified in configuration
    const gender = layerConfigurations[layerConfigIndex].gender || (Math.random() > 0.5 ? "male" : "female");
    
    // Load layer configuration based on gender
    const layers = layersSetup(
      layerConfigurations[layerConfigIndex].layersOrder, gender
    );
    
    debugLogs
      ? console.log("Editions left to create: ", abstractedIndexes)
      : null;
      
    while (
      editionCount <= layerConfigurations[layerConfigIndex].growEditionSizeTo
    ) {
      let newDna = createDna(layers, layerConfigurations[layerConfigIndex]);
      if (isDnaUnique(dnaList, newDna, layerConfigurations[layerConfigIndex].layersOrder)) {
        let results = constructLayerToDna(newDna, layers);
        let loadedElements = [];

        results.forEach((layer) => {
          loadedElements.push(loadLayerImg(layer));
        });

        await Promise.all(loadedElements).then((renderObjectArray) => {
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
          renderObjectArray.forEach((renderObject, index) => {
            drawElement(
              renderObject,
              index,
              layerConfigurations[layerConfigIndex].layersOrder.length
            );
            if (gif.export) {
              hashlipsGiffer.add();
            }
          });
          if (gif.export) {
            hashlipsGiffer.stop();
          }
          debugLogs
            ? console.log("Editions left to create: ", abstractedIndexes)
            : null;
          saveImage(abstractedIndexes[0]);
          addMetadata(newDna, abstractedIndexes[0], gender);
          saveMetaDataSingleFile(globalEditionCounterMeta - 1);
          console.log(
            `Created edition: ${abstractedIndexes[0]}, with DNA: ${sha1(
              newDna
            )}`
          );
        });
        dnaList.add(filterDNAOptions(newDna, layerConfigurations[layerConfigIndex].layersOrder));
        editionCount++;
        abstractedIndexes.shift();
      } else {
        console.log("DNA exists!");
        failedCount++;
        if (failedCount >= uniqueDnaTorrance) {
          console.log(
            `You need more layers or elements to grow your edition to ${layerConfigurations[layerConfigIndex].growEditionSizeTo} artworks!`
          );
          process.exit();
        }
      }
    }
    layerConfigIndex++;
  }
  writeMetaData(JSON.stringify(metadataList, null, 2));
  
  // Print cache statistics
  const stats = getCacheStats();
  console.log("\n=== Image Cache Statistics ===");
  console.log(`Cache size: ${stats.size} images`);
  console.log(`Cache hits: ${stats.hits}`);
  console.log(`Cache misses: ${stats.misses}`);
  console.log(`Cache hit rate: ${stats.hitRate}`);
  console.log("==============================\n");
};

module.exports = { startCreating, buildSetup, getElements, clearImageCache, getCacheStats };

/**
 * Apply layer association rules
 * @param {string} dnaStr - DNA string
 * @param {Object} layerConfig - Layer configuration
 * @returns {string} Updated DNA string
 */
const applyLayerAssociations = (dnaStr, layerConfig) => {
  // Check if layer association configuration exists
  if (!layerConfig.layerAssociations) {
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
    
    // If the main layer is found and the element exists in the DNA sequence
    if (mainLayerIndex !== -1 && dnaSequence[mainLayerIndex]) {
      // Get the element name of the main layer (from the DNA sequence)
      const mainLayerElement = dnaSequence[mainLayerIndex].split(":")[0];
      
      // Iterate through all associated layers
      Object.keys(associations[mainLayerName]).forEach(associatedLayerName => {
        // Check if the association type is sameName
        if (associations[mainLayerName][associatedLayerName] === "sameName") {
          // Find the index of the associated layer in layersOrder
          const associatedLayerIndex = layerConfig.layersOrder.findIndex(layer => layer.name === associatedLayerName);
          
          // If the associated layer is found and the element exists in the DNA sequence
          if (associatedLayerIndex !== -1 && dnaSequence[associatedLayerIndex]) {
            // Construct a new DNA element string (elementName:layerLevel)
            const layerParts = dnaSequence[associatedLayerIndex].split(":");
            if (layerParts.length >= 2) {
              const layerLevel = layerParts[1];
              dnaSequence[associatedLayerIndex] = `${mainLayerElement}:${layerLevel}`;
            }
          }
        }
      });
    }
  });
  
  // Recombine the DNA string
  return dnaSequence.join(DNA_DELIMITER);
};
