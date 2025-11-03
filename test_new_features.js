const { layerConfigurations } = require('./src/config.js');
const { createDna, applyLayerAssociations } = require('./src/main_improved.js');

// Mock layer setup for testing
const mockLayers = [
  // Background layer
  {
    name: "background",
    elements: [
      { id: 1, filename: "background1.png", weight: 1 },
      { id: 2, filename: "background2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  // Clothes layers
  {
    name: "clothes1",
    elements: [
      { id: 1, filename: "clothes1_1.png", weight: 1 },
      { id: 2, filename: "clothes1_2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  {
    name: "clothes2",
    elements: [
      { id: 1, filename: "clothes2_1.png", weight: 1 },
      { id: 2, filename: "clothes2_2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  // Hoodies layers
  {
    name: "hoodies1",
    elements: [
      { id: 1, filename: "hoodies1_1.png", weight: 1 },
      { id: 2, filename: "hoodies1_2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  {
    name: "hoodies2",
    elements: [
      { id: 1, filename: "hoodies2_1.png", weight: 1 },
      { id: 2, filename: "hoodies2_2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  // Hair layers
  {
    name: "hair1",
    elements: [
      { id: 1, filename: "hair1_1.png", weight: 1 },
      { id: 2, filename: "hair1_2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  {
    name: "hair2",
    elements: [
      { id: 1, filename: "hair2_1.png", weight: 1 },
      { id: 2, filename: "hair2_2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  {
    name: "hair3",
    elements: [
      { id: 1, filename: "hair3_1.png", weight: 1 },
      { id: 2, filename: "hair3_2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  // Body and facial features
  {
    name: "body",
    elements: [
      { id: 1, filename: "body1.png", weight: 1 },
      { id: 2, filename: "body2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  {
    name: "nose",
    elements: [
      { id: 1, filename: "nose1.png", weight: 1 },
      { id: 2, filename: "nose2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  {
    name: "ear",
    elements: [
      { id: 1, filename: "ear1.png", weight: 1 },
      { id: 2, filename: "ear2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  {
    name: "mouth",
    elements: [
      { id: 1, filename: "mouth1.png", weight: 1 },
      { id: 2, filename: "mouth2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  {
    name: "eyes",
    elements: [
      { id: 1, filename: "eyes1.png", weight: 1 },
      { id: 2, filename: "eyes2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  // Glasses layers
  {
    name: "glassesleft",
    elements: [
      { id: 1, filename: "glassesleft1.png", weight: 1 },
      { id: 2, filename: "glassesleft2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  },
  {
    name: "glassesright",
    elements: [
      { id: 1, filename: "glassesright1.png", weight: 1 },
      { id: 2, filename: "glassesright2.png", weight: 1 }
    ],
    opacity: 1.0,
    blend: "source-over"
  }
];

// Test function
const runTests = () => {
  console.log("=== Testing new features ===\n");
  
  // Test female configuration
  const femaleConfig = layerConfigurations.find(config => config.gender === "female");
  
  if (!femaleConfig) {
    console.error("Female configuration not found");
    return;
  }
  
  console.log("Testing female configuration...");
  console.log("Layer groups:", femaleConfig.layerGroups);
  console.log("Exclusive groups:", femaleConfig.exclusiveGroups);
  console.log("Group polling:", femaleConfig.groupPolling);
  
  // Test DNA generation with groups
  console.log("\n=== Testing DNA generation ===");
  
  const groupCounts = {
    clothes: 0,
    hoodies: 0
  };
  
  // Generate multiple DNAs to test polling
  for (let i = 0; i < 10; i++) {
    try {
      const dna = createDna(mockLayers, femaleConfig);
      console.log(`DNA ${i+1}:`, dna);
      
      // Check which groups are included
      const dnaParts = dna.split("-");
      
      // Check clothes group
      const clothes1Index = femaleConfig.layersOrder.findIndex(layer => layer.name === "clothes1");
      const clothes2Index = femaleConfig.layersOrder.findIndex(layer => layer.name === "clothes2");
      
      const hasClothes = clothes1Index >= 0 && dnaParts[clothes1Index] !== "none:none" && 
                        clothes2Index >= 0 && dnaParts[clothes2Index] !== "none:none";
      
      // Check hoodies group
      const hoodies1Index = femaleConfig.layersOrder.findIndex(layer => layer.name === "hoodies1");
      const hoodies2Index = femaleConfig.layersOrder.findIndex(layer => layer.name === "hoodies2");
      
      const hasHoodies = hoodies1Index >= 0 && dnaParts[hoodies1Index] !== "none:none" && 
                        hoodies2Index >= 0 && dnaParts[hoodies2Index] !== "none:none";
      
      // Check mutual exclusivity
      if (hasClothes && hasHoodies) {
        console.error("❌ ERROR: Both clothes and hoodies groups are present (should be mutually exclusive)");
      } else if (hasClothes) {
        console.log("✅ Clothes group selected");
        groupCounts.clothes++;
        
        // Check if clothes1 and clothes2 have the same element
        if (clothes1Index >= 0 && clothes2Index >= 0) {
          const clothes1Element = dnaParts[clothes1Index].split(":")[0];
          const clothes2Element = dnaParts[clothes2Index].split(":")[0];
          
          if (clothes1Element === clothes2Element) {
            console.log("✅ clothes1 and clothes2 have the same element");
          } else {
            console.error("❌ ERROR: clothes1 and clothes2 have different elements");
          }
        }
      } else if (hasHoodies) {
        console.log("✅ Hoodies group selected");
        groupCounts.hoodies++;
        
        // Check if hoodies1 and hoodies2 have the same element
        if (hoodies1Index >= 0 && hoodies2Index >= 0) {
          const hoodies1Element = dnaParts[hoodies1Index].split(":")[0];
          const hoodies2Element = dnaParts[hoodies2Index].split(":")[0];
          
          if (hoodies1Element === hoodies2Element) {
            console.log("✅ hoodies1 and hoodies2 have the same element");
          } else {
            console.error("❌ ERROR: hoodies1 and hoodies2 have different elements");
          }
        }
      } else {
        console.error("❌ ERROR: No group selected");
      }
      
    } catch (error) {
      console.error("Error generating DNA:", error.message);
    }
    
    console.log("---");
  }
  
  // Test polling ratio
  console.log("\n=== Testing polling ratio ===");
  console.log("Clothes group selected:", groupCounts.clothes, "times");
  console.log("Hoodies group selected:", groupCounts.hoodies, "times");
  
  // The ratio should be approximately 1:1
  const ratio = groupCounts.clothes / groupCounts.hoodies;
  if (ratio > 0.5 && ratio < 2) {
    console.log("✅ Polling ratio is approximately 1:1");
  } else {
    console.error("❌ ERROR: Polling ratio is not 1:1");
  }
  
  console.log("\n=== All tests completed ===");
};

// Run the tests
runTests();