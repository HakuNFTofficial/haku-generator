const fs = require('fs');
const path = require('path');

// Define files that need to be restored
const filesToRestore = [
  'M_clonthing_B1.png',
  'M_clonthing_O1.png',
  'M_clonthing_W1.png',
  'male_hair_B1.png',
  'male_hair_D1.png',
  'male_hair_E1.png'
];

console.log("Starting to restore original layer files...\n");

// Restore files
filesToRestore.forEach(filename => {
  const backupPath = path.join('backup_layers', filename);
  
  if (fs.existsSync(backupPath)) {
    // Determine target path
    let targetPath;
    if (filename.startsWith('M_')) {
      targetPath = path.join('layers/male/clothes2', filename);
    } else {
      targetPath = path.join('layers/male/hair2', filename);
    }
    
    // Restore file
    fs.copyFileSync(backupPath, targetPath);
    console.log(`Restored: ${targetPath}`);
  } else {
    console.log(`Warning: Backup file does not exist ${backupPath}`);
  }
});

console.log("\nRestoration completed!");