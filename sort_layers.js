const fs = require('fs');
const path = require('path');

// 定义源目录和目标目录
const layersDir = './layers';
const maleDir = path.join(layersDir, 'male');
const femaleDir = path.join(layersDir, 'female');
const neutralDir = path.join(layersDir, 'neutral');
const commonDir = path.join(layersDir, 'common');

// 创建必要的目录
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

createDirIfNotExists(maleDir);
createDirIfNotExists(femaleDir);
createDirIfNotExists(neutralDir);
createDirIfNotExists(commonDir);

// 定义图层分类规则
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

// 获取所有图层文件夹
const layerFolders = fs.readdirSync(layersDir).filter(file => 
  fs.statSync(path.join(layersDir, file)).isDirectory() &&
  !['male', 'female', 'neutral', 'common'].includes(file)
);

// 移动文件夹到对应的性别目录
layerFolders.forEach(folder => {
  const folderPath = path.join(layersDir, folder);
  
  // 跳过我们刚刚创建的目录
  if (['male', 'female', 'neutral', 'common'].includes(folder)) {
    return;
  }
  
  // 根据规则分类
  let targetDir = neutralDir; // 默认放到中性目录
  
  if (layerClassifications.male.includes(folder)) {
    targetDir = path.join(maleDir, folder.replace('male', ''));
  } else if (layerClassifications.female.includes(folder)) {
    targetDir = path.join(femaleDir, folder.replace('female', ''));
  } else if (layerClassifications.neutral.includes(folder)) {
    targetDir = path.join(neutralDir, folder);
  } else if (layerClassifications.common.includes(folder)) {
    targetDir = path.join(commonDir, folder);
  }
  
  // 如果目标目录已存在且不是空目录，则先删除它
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    if (files.length > 0) {
      console.warn(`Warning: Target directory ${targetDir} is not empty. Skipping move for ${folder}.`);
      return;
    }
  }
  
  // 创建目标目录并移动文件夹
  createDirIfNotExists(path.dirname(targetDir));
  fs.renameSync(folderPath, targetDir);
  console.log(`Moved ${folder} to ${targetDir}`);
});

console.log('图层整理完成！');