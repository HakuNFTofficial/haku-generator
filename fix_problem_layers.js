const fs = require('fs');
const path = require('path');

// 定义需要替换的问题文件
const problemFiles = [
  'layers/male/clothes2/M_clonthing_B1.png',
  'layers/male/clothes2/M_clonthing_O1.png',
  'layers/male/clothes2/M_clonthing_W1.png',
  'layers/male/hair2/male_hair_B1.png',
  'layers/male/hair2/male_hair_D1.png',
  'layers/male/hair2/male_hair_E1.png'
];

// 定义替换源文件（使用同目录下的其他文件）
const replacementMap = {
  'layers/male/clothes2/M_clonthing_B1.png': 'layers/male/clothes2/M_clonthing_A1.png',
  'layers/male/clothes2/M_clonthing_O1.png': 'layers/male/clothes2/M_clonthing_H1.png',
  'layers/male/clothes2/M_clonthing_W1.png': 'layers/male/clothes2/M_clonthing_F1.png',
  'layers/male/hair2/male_hair_B1.png': 'layers/male/hair2/male_hair_F1.png',
  'layers/male/hair2/male_hair_D1.png': 'layers/male/hair2/male_hair_I1.png',
  'layers/male/hair2/male_hair_E1.png': 'layers/male/hair2/male_hair_L1.png'
};

console.log("开始替换问题图层文件...\n");

// 创建备份目录
const backupDir = 'backup_layers';
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 执行替换
problemFiles.forEach(problemFile => {
  if (fs.existsSync(problemFile)) {
    // 备份原文件
    const backupPath = path.join(backupDir, path.basename(problemFile));
    fs.copyFileSync(problemFile, backupPath);
    console.log(`已备份: ${problemFile} -> ${backupPath}`);
    
    // 获取替换源文件
    const sourceFile = replacementMap[problemFile];
    
    if (fs.existsSync(sourceFile)) {
      // 替换文件
      fs.copyFileSync(sourceFile, problemFile);
      console.log(`已替换: ${problemFile} (使用 ${sourceFile})`);
    } else {
      console.log(`警告: 源文件不存在 ${sourceFile}`);
    }
  } else {
    console.log(`警告: 问题文件不存在 ${problemFile}`);
  }
});

console.log("\n替换完成!");
console.log("备份文件保存在: " + backupDir);
console.log("\n现在您可以重新生成NFT，图层应该会正常显示。");