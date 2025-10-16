const fs = require('fs');
const path = require('path');

// 定义需要恢复的文件
const filesToRestore = [
  'M_clonthing_B1.png',
  'M_clonthing_O1.png',
  'M_clonthing_W1.png',
  'male_hair_B1.png',
  'male_hair_D1.png',
  'male_hair_E1.png'
];

console.log("开始恢复原始图层文件...\n");

// 恢复文件
filesToRestore.forEach(filename => {
  const backupPath = path.join('backup_layers', filename);
  
  if (fs.existsSync(backupPath)) {
    // 确定目标路径
    let targetPath;
    if (filename.startsWith('M_')) {
      targetPath = path.join('layers/male/clothes2', filename);
    } else {
      targetPath = path.join('layers/male/hair2', filename);
    }
    
    // 恢复文件
    fs.copyFileSync(backupPath, targetPath);
    console.log(`已恢复: ${targetPath}`);
  } else {
    console.log(`警告: 备份文件不存在 ${backupPath}`);
  }
});

console.log("\n恢复完成!");