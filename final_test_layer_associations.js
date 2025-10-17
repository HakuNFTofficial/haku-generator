// Final test script to validate the mandatory layer association mechanism throughout the system
const fs = require('fs');
const path = require('path');

// Simulated DNA delimiter
const DNA_DELIMITER = "-";

/**
 * Function to apply layer association rules (mandatory)
 * @param {string} dnaStr - DNA string
 * @param {Object} layerConfig - Layer configuration
 * @returns {string} Updated DNA string
 * @throws {Error} Throws an exception when a matching element is not found
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
    
    // Get the main layer's element name (from DNA sequence)
    const mainLayerElement = dnaSequence[mainLayerIndex].split(":")[0];
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

/**
 * Simulate createDna function
 * @param {Array} layers - Array of layers
 * @param {Object} layerConfig - Layer configuration
 * @returns {string} DNA string
 */
const createDna = (layers, layerConfig = null) => {
  let randNum = [];
  layers.forEach((layer) => {
    // Randomly select an element
    const randomIndex = Math.floor(Math.random() * layer.elements.length);
    const element = layer.elements[randomIndex];
    randNum.push(`${element.id}:${element.filename}`);
  });
  
  // Apply layer association rules (if layer configuration is provided)
  let dnaStr = randNum.join(DNA_DELIMITER);
  console.log(`Generated raw DNA: ${dnaStr}`);
  
  if (layerConfig && layerConfig.layerAssociations) {
    try {
      dnaStr = applyLayerAssociations(dnaStr, layerConfig);
    } catch (error) {
      console.error("Layer association processing failed:", error.message);
      throw error; // Re-throw exception to terminate NFT generation
    }
  }
  
  return dnaStr;
};

/**
 * Simulate NFT generation function
 * @param {Object} layerConfig - Layer configuration
 */
const generateNFT = (layerConfig) => {
  console.log(`\nStarting NFT generation...`);
  
  // Simulate layer data
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
    console.log("NFT generated successfully!\n");
    return true;
  } catch (error) {
    console.error("NFT generation failed:", error.message);
    console.log("Terminating as required\n");
    return false;
  }
};

// Test Case 1: Normal case - All layers exist and need updating
console.log("=== Test Case 1: Normal Case ===");
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

// Test Case 2: Main layer does not exist (should throw an exception and terminate)
console.log("=== Test Case 2: Main Layer Does Not Exist ===");
const invalidLayerConfig1 = {
  layersOrder: [
    { name: "background" },
    { name: "body" },
    { name: "clothes" },
    { name: "hair" }
  ],
  layerAssociations: {
    nonExistentLayer: {  // Non-existent layer
      clothes: "sameName"
    }
  }
};

generateNFT(invalidLayerConfig1);

// Test Case 3: Associated layer does not exist (should throw an exception and terminate)
console.log("=== Test Case 3: Associated Layer Does Not Exist ===");
const invalidLayerConfig2 = {
  layersOrder: [
    { name: "background" },
    { name: "body" },
    { name: "clothes" },
    { name: "hair" }
  ],
  layerAssociations: {
    body: {
      nonExistentLayer: "sameName"  // Non-existent associated layer
    }
  }
};

generateNFT(invalidLayerConfig2);

// Test Case 4: Missing element in DNA sequence (should throw an exception and terminate)
console.log("=== Test Case 4: Missing Element in DNA Sequence ===");
const invalidLayerConfig3 = {
  layersOrder: [
    { name: "background" },
    { name: "body" }
    // Missing clothes and hair layers, but clothes is referenced in association config
  ],
  layerAssociations: {
    body: {
      clothes: "sameName"
    }
  }
};

generateNFT(invalidLayerConfig3);

console.log("All tests completed!");