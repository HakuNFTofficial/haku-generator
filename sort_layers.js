const fs = require('fs');
const path = require('path');

// Define source and target directories
const layersDir = './layers';
const maleDir = path.join(layersDir, 'male');
const femaleDir = path.join(layersDir, 'female');
const neutralDir = path.join(layersDir, 'neutral');
const commonDir = path.join(layersDir, 'common');

// Create necessary directories
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

createDirIfNotExists(maleDir);
createDirIfNotExists(femaleDir);
createDirIfNotExists(neutralDir);
createDirIfNotExists(commonDir);

// Define layer classification rules
const layerClassifications = {
  male: [
    'malebody', 'maleclothes', 'malehair1', 'malehair2', 'malehair3',
    'maleeyes', 'malemouth', 'malenose', 'maleear'
  ],
  female: [
    'femalebody', 'femaleclothes', 'femalehair1', 'femalehair2', 'femalehair3',
    'femaleeyes', 'femalemouth', 'femalenose', 'femaleear'
  ],
  neutral: [
    'background', 'glassesleft', 'glassesright', 'fattoo', 'earring'
  ],
  common: [
    'eyes', 'mouth', 'nose', 'ear'
  ]
};

// Get all layer folders
const layerFolders = fs.readdirSync(layersDir).filter(file => 
  fs.statSync(path.join(layersDir, file)).isDirectory() &&
  !['male', 'female', 'neutral', 'common'].includes(file)
);

// Move folders to corresponding gender directories
layerFolders.forEach(folder => {
  const folderPath = path.join(layersDir, folder);
  
  // Skip the directories we just created
  if (['male', 'female', 'neutral', 'common'].includes(folder)) {
    return;
  }
  
  // Classify according to rules
  let targetDir = neutralDir; // Default to neutral directory
  
  if (layerClassifications.male.includes(folder)) {
    targetDir = path.join(maleDir, folder.replace('male', ''));
  } else if (layerClassifications.female.includes(folder)) {
    targetDir = path.join(femaleDir, folder.replace('female', ''));
  } else if (layerClassifications.neutral.includes(folder)) {
    targetDir = path.join(neutralDir, folder);
  } else if (layerClassifications.common.includes(folder)) {
    targetDir = path.join(commonDir, folder);
  }
  
  // If target directory exists and is not empty, delete it first
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    if (files.length > 0) {
      console.warn(`Warning: Target directory ${targetDir} is not empty. Skipping move for ${folder}.`);
      return;
    }
  }
  
  // Create target directory and move folder
  createDirIfNotExists(path.dirname(targetDir));
  fs.renameSync(folderPath, targetDir);
  console.log(`Moved ${folder} to ${targetDir}`);
});

console.log('Layer organization completed!');