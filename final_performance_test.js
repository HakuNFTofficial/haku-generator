const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Performance test function
async function runPerformanceTest(scriptPath, testName) {
  console.log(`Starting ${testName}...`);
  
  // Record start time
  const startTime = Date.now();
  
  // Run script
  const child = spawn('node', [scriptPath], {
    cwd: path.dirname(scriptPath)
  });
  
  // Collect output
  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
    // Display progress in real-time
    process.stdout.write(data.toString());
  });
  
  child.stderr.on('data', (data) => {
    console.error(`Error: ${data}`);
  });
  
  // Wait for script to complete
  await new Promise((resolve) => {
    child.on('close', (code) => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds
      
      console.log(`\n${testName} completed:`);
      console.log(`- Exit code: ${code}`);
      console.log(`- Running time: ${duration} seconds`);
      
      // Extract generation statistics
      const successMatch = output.match(/Generation completed: Successfully generated (\d+) images/);
      const failureMatch = output.match(/Generation completed: .*Failed (\d+) images/);
      
      if (successMatch) {
        console.log(`- Successfully generated: ${successMatch[1]} images`);
      }
      
      if (failureMatch) {
        console.log(`- Failed count: ${failureMatch[1]} images`);
      }
      
      resolve({ duration, code, output });
    });
  });
  
  return { duration: (Date.now() - startTime) / 1000 };
}

// Main function
async function main() {
  try {
    console.log("=== HashLips Art Engine Performance Test ===\n");
    
    // Clean up previous generation files
    const buildDir = path.join(__dirname, 'build');
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true });
      console.log("Previous generation files cleaned up");
    }
    
    // Create new build directory
    fs.mkdirSync(buildDir, { recursive: true });
    
    // Run improved version test
    console.log("\n" + "=".repeat(50));
    const improvedTestResult = await runPerformanceTest(
      path.join(__dirname, 'index.js'),
      'Improved version (with concurrency control and layer association)'
    );
    
    // Clean up generated files
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true });
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // Run original version test (if exists)
    const originalIndexPath = path.join(__dirname, 'index_original.js');
    if (fs.existsSync(originalIndexPath)) {
      console.log("\n" + "=".repeat(50));
      const originalTestResult = await runPerformanceTest(
        originalIndexPath,
        'Original version'
      );
      
      // Compare results
      console.log("\n" + "=".repeat(50));
      console.log("Performance comparison results:");
      console.log(`- Improved version running time: ${improvedTestResult.duration.toFixed(2)} seconds`);
      
      if (originalTestResult && originalTestResult.duration) {
        console.log(`- Original version running time: ${originalTestResult.duration.toFixed(2)} seconds`);
        const improvement = ((originalTestResult.duration - improvedTestResult.duration) / originalTestResult.duration * 100).toFixed(2);
        console.log(`- Performance improvement: ${improvement > 0 ? '+' : ''}${improvement}%`);
      }
    } else {
      console.log("\nOriginal version script not found, skipping comparison test");
    }
    
    console.log("\n=== Test completed ===");
  } catch (error) {
    console.error('Error occurred during testing:', error);
  }
}

// Run main function
main();