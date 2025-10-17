# Improved Version of HashLips Art Engine

This project is an improved version based on the HashLips Art Engine, specifically optimizing the concurrent issues during the generation of a large number of NFTs, and supporting a layer-matching system based on gender.

## Characteristics

1. Concurrency control: Limit the number of images loaded simultaneously to prevent excessive memory usage.
2. **Batch Processing**: Divide a large number of tasks into smaller batches to enhance resource utilization.
3. **Memory Monitoring**: Regularly check memory usage and trigger garbage collection when necessary.
4. **Error Handling**: Better error handling and recovery mechanisms
5. **Progress Update**: Provide detailed information on the progress of each batch.
6.**Gender Segmentation Layer**: Supports classification into male/female/neutral layers
7. **Layer Association Rules**: Supports specifying the association relationships between layers

## 1. Usage

1. Install dependencies
```bash
npm install
```

### 2. Configuration layer
Sort your layer files by gender and place them in the "layers" folder:
- `layers/male/` - Male
- `layers/female/` - Famale
- `layers/neutral/` - Neutral Layer（Suitable for Both Men and Women）

### 3. Configuration generation parameters
Edit the `src/config.js` file to configure the parameters for generating your NFTs:
- `layerConfigurations`：Define layer configuration and generate quantity (support configuration by gender separately)
- `layerAssociations`：Define layer association rules (optional, ensure that the associated layers select the same-named files)

### 4. Generate NFT
```bash
# Use the improved version (recommended for generating a large number of NFTs)
node index.js

# Or use the original version (suitable for a small number of NFTs)
node index_original.js
```

## performance comparison

Run the following command to view the performance comparison analysis:
```bash
node performance_test.js
```

## declaration

- `index.js` - Main entry file, using the improved version
- `index_original.js` - Original version entry file
- `index_improved.js` - Improved version entry file
- `src/main.js` - Original main logic file
- `src/main_improved.js` - Improved moderator logic file
- `src/config.js` - configuration files
- `performance_test.js` - Performance testing script

## Configuration Parameter Explanation

在 `src/main_improved.js` The following parameters can be adjusted：
- `CONCURRENT_LIMIT`：Limit on the number of concurrent image loading (default: 5)
- `BATCH_SIZE`：The number of NFTs processed in each batch (default is 10)
- `MEMORY_CHECK_INTERVAL`：Memory check interval (default: check once every 5 batches)

## Production environment recommendations

1. If the system memory is limited (less than 4GB), the improved version must be used.
2. The parameters CONCURRENT_LIMIT and BATCH_SIZE can be adjusted according to the system configuration.
3. In the production environment, it is recommended to enable the garbage collection flag of Node.js:
   ```bash
   node --expose-gc index.js
   ```

## Troubleshooting

### Processing of problem layer files
If you encounter any problems with the layer files, you can run：
```bash
node fix_problem_layers.js
```

### Restore the original layer file
If you need to restore the original layer file：
```bash
node restore_original_layers.js
```


## principle

The system achieves gender distinction and layer association through the following methods:

1. The `layersSetup` function loads the corresponding layer folders based on the gender.
2. When generating DNA, selection will only occur between layers of the same gender.
3. Ensure that the associated layers select the files with the same name through `layerAssociations`

## Rarity setting

The rarity setting method is the same as the original version. Just add `#weight value` to the file name, Such as:
- `Common Element#100.png` (Common)
- `Rare Element#5.png` (rare)
- `Epic Element#1.png` (epic)
