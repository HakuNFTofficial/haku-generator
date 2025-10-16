const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 性能测试函数
async function runPerformanceTest(scriptPath, testName) {
  console.log(`开始运行 ${testName}...`);
  
  // 记录开始时间
  const startTime = Date.now();
  
  // 运行脚本
  const child = spawn('node', [scriptPath], {
    cwd: path.dirname(scriptPath)
  });
  
  // 收集输出
  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
    // 实时显示进度
    process.stdout.write(data.toString());
  });
  
  child.stderr.on('data', (data) => {
    console.error(`错误: ${data}`);
  });
  
  // 等待脚本完成
  await new Promise((resolve) => {
    child.on('close', (code) => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // 转换为秒
      
      console.log(`\n${testName} 完成:`);
      console.log(`- 退出码: ${code}`);
      console.log(`- 运行时间: ${duration} 秒`);
      
      // 提取生成统计信息
      const successMatch = output.match(/生成完成: 成功 (\d+) 张/);
      const failureMatch = output.match(/生成完成: .*失败 (\d+) 张/);
      
      if (successMatch) {
        console.log(`- 成功生成: ${successMatch[1]} 张`);
      }
      
      if (failureMatch) {
        console.log(`- 失败数量: ${failureMatch[1]} 张`);
      }
      
      resolve({ duration, code, output });
    });
  });
  
  return { duration: (Date.now() - startTime) / 1000 };
}

// 主函数
async function main() {
  try {
    console.log("=== HashLips Art Engine 性能测试 ===\n");
    
    // 清理之前的生成文件
    const buildDir = path.join(__dirname, 'build');
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true });
      console.log("已清理之前的生成文件");
    }
    
    // 创建新的build目录
    fs.mkdirSync(buildDir, { recursive: true });
    
    // 运行改进版本测试
    console.log("\n" + "=".repeat(50));
    const improvedTestResult = await runPerformanceTest(
      path.join(__dirname, 'index.js'),
      '改进版本 (带并发控制和图层关联)'
    );
    
    // 清理生成文件
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true });
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // 运行原始版本测试（如果存在）
    const originalIndexPath = path.join(__dirname, 'index_original.js');
    if (fs.existsSync(originalIndexPath)) {
      console.log("\n" + "=".repeat(50));
      const originalTestResult = await runPerformanceTest(
        originalIndexPath,
        '原始版本'
      );
      
      // 比较结果
      console.log("\n" + "=".repeat(50));
      console.log("性能对比结果:");
      console.log(`- 改进版本运行时间: ${improvedTestResult.duration.toFixed(2)} 秒`);
      
      if (originalTestResult && originalTestResult.duration) {
        console.log(`- 原始版本运行时间: ${originalTestResult.duration.toFixed(2)} 秒`);
        const improvement = ((originalTestResult.duration - improvedTestResult.duration) / originalTestResult.duration * 100).toFixed(2);
        console.log(`- 性能提升: ${improvement > 0 ? '+' : ''}${improvement}%`);
      }
    } else {
      console.log("\n原始版本脚本未找到，跳过对比测试");
    }
    
    console.log("\n=== 测试完成 ===");
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行主函数
main();