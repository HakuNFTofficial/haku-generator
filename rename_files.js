const fs = require('fs');
const path = require('path');

// Function to rename files with dashes to use underscores instead
function renameFilesWithDashes(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively process subdirectories
      renameFilesWithDashes(filePath);
    } else if (file.includes('-')) {
      // Rename file by replacing dashes with underscores
      const newFileName = file.replace(/-/g, '_');
      const newFilePath = path.join(dir, newFileName);
      
      console.log(`Renaming: ${filePath} -> ${newFilePath}`);
      fs.renameSync(filePath, newFilePath);
    }
  });
}

// Process the layers directory
const layersDir = path.join(__dirname, 'layers');
renameFilesWithDashes(layersDir);

console.log('File renaming complete!');