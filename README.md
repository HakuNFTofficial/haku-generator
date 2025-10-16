# HashLips Art Engine 改进版本

这个项目是基于 HashLips Art Engine 的改进版本，专门优化了大量 NFT 生成时的并发问题，并支持基于性别的图层搭配系统。

## 特性

1. **并发控制**：限制同时加载的图片数量，避免内存峰值过高
2. **批量处理**：将大量任务分成小批次，提高资源利用率
3. **内存监控**：定期检查内存使用，必要时触发垃圾回收
4. **错误处理**：更好的错误处理和恢复机制
5. **进度反馈**：提供详细的批次进度信息
6. **性别区分图层**：支持 male/female/neutral 图层分类
7. **图层关联规则**：支持指定图层间的关联关系

## 使用方法

### 1. 安装依赖
```bash
npm install
```

### 2. 配置图层
将你的图层文件按照性别分类放入 `layers` 文件夹中：
- `layers/male/` - 男性图层
- `layers/female/` - 女性图层
- `layers/neutral/` - 中性图层（男女通用）

### 3. 配置生成参数
编辑 `src/config.js` 文件来配置你的 NFT 生成参数：
- `layerConfigurations`：定义图层配置和生成数量（支持按性别分别配置）
- `layerAssociations`：定义图层关联规则（可选，确保关联图层选择相同名称的文件）

### 4. 生成 NFT
```bash
# 使用改进版本（推荐用于大量NFT生成）
node index.js

# 或者使用原始版本（适用于少量NFT）
node index_original.js
```

## 性能对比

运行以下命令查看性能对比分析：
```bash
node performance_test.js
```

## 文件说明

- `index.js` - 主入口文件，使用改进版本
- `index_original.js` - 原始版本入口文件
- `index_improved.js` - 改进版本入口文件
- `src/main.js` - 原始主逻辑文件
- `src/main_improved.js` - 改进版主逻辑文件
- `src/config.js` - 配置文件
- `performance_test.js` - 性能测试脚本

## 配置参数说明

在 `src/main_improved.js` 中可以调整以下参数：
- `CONCURRENT_LIMIT`：并发加载图片的数量限制（默认5）
- `BATCH_SIZE`：每批处理的NFT数量（默认10）
- `MEMORY_CHECK_INTERVAL`：内存检查间隔（默认每5批检查一次）

## 生产环境建议

1. 对于少量NFT（<100），原始版本足够
2. 对于大量NFT（>100），建议使用改进版本
3. 如果系统内存有限（<4GB），必须使用改进版本
4. 可以根据系统配置调整CONCURRENT_LIMIT和BATCH_SIZE参数
5. 在生产环境中，建议启用Node.js的垃圾回收标志：
   ```bash
   node --expose-gc index.js
   ```

## 故障排除

### 问题图层文件处理
如果遇到图层文件问题，可以运行：
```bash
node fix_problem_layers.js
```

### 恢复原始图层文件
如果需要恢复原始图层文件：
```bash
node restore_original_layers.js
```

## 图层结构

```
layers/
├── male/                    # 男性专属图层
│   ├── body/                # 男性身体
│   ├── clothes1/            # 男性服装1
│   ├── clothes2/            # 男性服装2
│   ├── eyes/                # 眼睛
│   ├── hair1/               # 男性发型1
│   ├── hair2/               # 男性发型2
│   ├── mouth/               # 嘴巴
│   └── nose/                # 鼻子
├── female/                  # 女性专属图层
│   ├── body/                # 女性身体
│   ├── clothes1/            # 女性服装1
│   ├── clothes2/            # 女性服装2
│   ├── eyes/                # 眼睛
│   ├── hair1/               # 女性发型1
│   ├── hair2/               # 女性发型2
│   ├── hair3/               # 女性发型3
│   ├── mouth/               # 嘴巴
│   └── nose/                # 鼻子
└── neutral/                 # 中性图层（男女通用）
    ├── background/          # 背景
    ├── ear/                 # 耳朵
    ├── gear/                # 装备
    ├── glassesleft/         # 左眼镜
    ├── glassesright/        # 右眼镜
    └── tattoo/              # 纹身
```

## 工作原理

系统通过以下方式实现性别区分和图层关联：

1. 在 `layerConfigurations` 中为 male 和 female 分别配置图层
2. 根据配置的性别调用修改后的 `layersSetup` 函数
3. `layersSetup` 函数根据性别加载对应的图层文件夹
4. 生成 DNA 时只会在同性别的图层间进行选择
5. 通过 `layerAssociations` 确保关联图层选择相同名称的文件

## 稀有度设置

稀有度设置方法与原版相同，在文件名中添加 `#权重值` 即可，例如：
- `Common Element#100.png` (常见元素)
- `Rare Element#5.png` (稀有元素)
- `Epic Element#1.png` (史诗元素)