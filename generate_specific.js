const basePath = process.cwd();
const { startCreating, buildSetup } = require(`${basePath}/src/main.js`);
const { layerConfigurations } = require(`${basePath}/src/config.js`);
const fs = require('fs');

// Save the original startCreating function
const originalStartCreating = require(`${basePath}/src/main.js`).startCreating;

// Create a new startCreating function that can generate specific elements
const startCreatingSpecific = async (targetElement) => {
  console.log(`Starting to generate NFT containing element ${targetElement}...`);
  
  // Set up build directory
  buildSetup();
  
  // Get male configuration
  const maleConfig = layerConfigurations.find(config => config.gender === "male");
  if (!maleConfig) {
    console.log("Male configuration not found");
    return;
  }
  
  let found = false;
  let attempts = 0;
  const maxAttempts = 100; // Maximum 100 attempts
  
  while (!found && attempts < maxAttempts) {
    attempts++;
    console.log(`Attempt ${attempts} to generate...`);
    
    // Reset build directory
    buildSetup();
    
    // Call the original generation function
    await originalStartCreating();
    
    // Check if the generated NFT contains the target element
    const metadataPath = `${basePath}/build/json/1.json`;
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // Check hair1 and hair2 attributes
      const hair1Attribute = metadata.attributes.find(attr => attr.trait_type === "hair1");
      const hair2Attribute = metadata.attributes.find(attr => attr.trait_type === "hair2");
      
      if (hair1Attribute && hair1Attribute.value.includes(targetElement) &&
          hair2Attribute && hair2Attribute.value.includes(targetElement)) {
        found = true;
        console.log(`Successfully generated NFT containing ${targetElement}!`);
        console.log(`hair1: ${hair1Attribute.value}`);
        console.log(`hair2: ${hair2Attribute.value}`);
        break;
      } else {
        console.log(`Generated NFT does not contain target element, hair1: ${hair1Attribute ? hair1Attribute.value : 'N/A'}, hair2: ${hair2Attribute ? hair2Attribute.value : 'N/A'}`);
      }
    }
    
    // Wait for a while before retrying
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (!found) {
    console.log(`Failed to generate NFT containing ${targetElement} after ${maxAttempts} attempts`);
  }
};

// Get target element from command line arguments
const targetElement = process.argv[2] || "male_hair_F1";

// Call the function
startCreatingSpecific(targetElement);