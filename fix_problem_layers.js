const fs = require('fs');
const path = require('path');

// Define problem files that need to be replaced
const problemFiles = [
  'layers/male/clothes2/M_clonthing_B1.png',
  'layers/male/clothes2/M_clonthing_O1.png',
  'layers/male/clothes2/M_clonthing_W1.png',
  'layers/male/hair2/male_hair_B1.png',
  'layers/male/hair2/male_hair_D1.png',
  'layers/male/hair2/male_hair_E1.png'
];

// Define replacement source files (using other files in the same directory)
const replacementMap = {
  'layers/male/clothes2/M_clonthing_B1.png': 'layers/male/clothes2/M_clonthing_A1.png',
  'layers/male/clothes2/M_clonthing_O1.png': 'layers/male/clothes2/M_clonthing_H1.png',
  'layers/male/clothes2/M_clonthing_W1.png': 'layers/male/clothes2/M_clonthing_F1.png',
  'layers/male/hair2/male_hair_B1.png': 'layers/male/hair2/male_hair_F1.png',
  'layers/male/hair2/male_hair_D1.png': 'layers/male/hair2/male_hair_I1.png',
  'layers/male/hair2/male_hair_E1.png': 'layers/male/hair2/male_hair_L1.png'
};

console.log("Starting to replace problem layer files...\n");

// Create backup directory
const backupDir = 'backup_layers';
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Execute replacement
problemFiles.forEach(problemFile => {
  if (fs.existsSync(problemFile)) {
    // Backup original file
    const backupPath = path.join(backupDir, path.basename(problemFile));
    fs.copyFileSync(problemFile, backupPath);
    console.log(`Backed up: ${problemFile} -> ${backupPath}`);
    
    // Get replacement source file
    const sourceFile = replacementMap[problemFile];
    
    if (fs.existsSync(sourceFile)) {
      // Replace file
      fs.copyFileSync(sourceFile, problemFile);
      console.log(`Replaced: ${problemFile} (using ${sourceFile})`);
    } else {
      console.log(`Warning: Source file does not exist ${sourceFile}`);
    }
  } else {
    console.log(`Warning: Problem file does not exist ${problemFile}`);
  }
});

console.log("\nReplacement completed!");
console.log("Backup files saved in: " + backupDir);
console.log("\nYou can now regenerate the NFT, and the layers should display correctly.");