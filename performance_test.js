const { performance } = require('perf_hooks');
const { checkMemoryUsage } = require('./src/main_improved.js');

// 测试函数
async function runPerformanceTest() {
  console.log("=== NFT生成性能分析 ===\n");
  
  // 检查当前内存使用
  console.log("初始内存使用:");
  checkMemoryUsage();
  
  console.log("\n--- 原始版本分析 ---");
  console.log("1. 图片加载: 使用Promise.all()并发加载所有图层");
  console.log("2. 图片生成: 串行处理，一个接一个生成NFT");
  console.log("3. 内存管理: 无主动内存管理，依赖系统垃圾回收");
  console.log("4. 错误处理: 基本错误处理，失败可能导致整个流程中断");
  console.log("5. 进度反馈: 基本的进度信息");
  
  console.log("\n--- 改进版本分析 ---");
  console.log("1. 图片加载: 限制并发数量(CONCURRENT_LIMIT)，避免内存峰值");
  console.log("2. 图片生成: 批量处理(BATCH_SIZE)，提高资源利用率");
  console.log("3. 内存管理: 定期检查内存，必要时触发垃圾回收");
  console.log("4. 错误处理: 更好的错误处理，单个失败不影响整体");
  console.log("5. 进度反馈: 详细的批次进度信息");
  
  console.log("\n=== 并发问题分析 ===");
  console.log("1. 内存压力: 同时加载多个图层图片会占用大量内存");
  console.log("2. 文件系统压力: 大量并发读写操作可能导致文件系统瓶颈");
  console.log("3. CPU密集型任务: 图片合成是CPU密集型操作，Node.js单线程可能成为瓶颈");
  console.log("4. 事件循环阻塞: 长时间运行的图片处理可能阻塞事件循环");
  
  console.log("\n=== 改进版本的优势 ===");
  console.log("1. 并发控制: 限制同时加载的图片数量，避免内存峰值过高");
  console.log("2. 批量处理: 将大量任务分成小批次，提高资源利用率");
  console.log("3. 内存监控: 定期检查内存使用，必要时触发垃圾回收");
  console.log("4. 错误处理: 更好的错误处理和恢复机制");
  console.log("5. 进度反馈: 提供更详细的进度信息");
  
  console.log("\n=== 使用建议 ===");
  console.log("1. 对于少量NFT（<100），原始版本足够");
  console.log("2. 对于大量NFT（>100），建议使用改进版本");
  console.log("3. 如果系统内存有限（<4GB），必须使用改进版本");
  console.log("4. 可以根据系统配置调整CONCURRENT_LIMIT和BATCH_SIZE参数");
  console.log("5. 在生产环境中，建议启用Node.js的垃圾回收标志: node --expose-gc index.js");
  
  console.log("\n=== 实际使用方法 ===");
  console.log("1. 使用原始版本: node index.js");
  console.log("2. 使用改进版本: 需要修改index.js，将startCreating替换为startCreatingWithConcurrencyControl");
}

// 运行测试
runPerformanceTest().catch(console.error);