#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const CHECKPOINT_VERSION = 1;
const OPTIMIZE_BATCH_SIZE = 1;
const OPTIMIZE_THREADS = 2;
const VALIDATION_BATCH_SIZE = 64;
const PROGRESS_INTERVAL = 25;

const OPTIMIZE_ARGS = [
  "-o",
  "4",
  "--strip",
  "safe",
  "--threads",
  String(OPTIMIZE_THREADS),
  "--sequential",
];

const VALIDATION_ARGS = [
  "-q",
  "--dry-run",
  "--nx",
  "--nz",
  "--threads",
  "1",
  "--sequential",
];

class OptimizationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OptimizationError";
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...this.details,
    };
  }
}

function listPngFiles(imagesDir) {
  if (!fs.existsSync(imagesDir) || !fs.statSync(imagesDir).isDirectory()) {
    throw new OptimizationError(
      "IMAGES_DIR_MISSING",
      "Generated image directory does not exist",
      {
        imagesDir,
        missingFields: ["imagesDir"],
      }
    );
  }

  const files = fs
    .readdirSync(imagesDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && path.extname(entry.name).toLowerCase() === ".png"
    )
    .map((entry) => path.join(imagesDir, entry.name))
    .sort();

  if (files.length === 0) {
    throw new OptimizationError(
      "NO_PNG_FILES",
      "No PNG files were found to optimize",
      { imagesDir }
    );
  }

  return files;
}

function runChild(spawnSyncFn, binary, args, imagesDir) {
  const result = spawnSyncFn(binary, args, { encoding: "utf8" });

  if (result.error && result.error.code === "ENOENT") {
    throw new OptimizationError(
      "OXIPNG_NOT_FOUND",
      "OxiPNG is not installed or is not on PATH",
      {
        imagesDir,
        missingFields: ["oxipng executable"],
      }
    );
  }

  if (result.error || result.status !== 0) {
    throw new OptimizationError("OXIPNG_FAILED", "OxiPNG failed", {
      imagesDir,
      exitCode: result.status ?? null,
      stderr: String(result.stderr || result.error?.message || "").trim(),
    });
  }

  return result;
}

function sumBytes(files) {
  return files.reduce((total, file) => total + fs.statSync(file).size, 0);
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function defaultCheckpointPath(imagesDir) {
  return `${path.resolve(imagesDir)}.optimize-checkpoint.json`;
}

function fileFingerprint(file) {
  const stat = fs.statSync(file);
  return {
    size: stat.size,
    mtimeMs: stat.mtimeMs,
  };
}

function writeCheckpoint(checkpointPath, checkpoint) {
  const temporaryPath = `${checkpointPath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(checkpoint)}\n`, "utf8");
  fs.renameSync(temporaryPath, checkpointPath);
}

function readCheckpoint(checkpointPath, imagesDir) {
  try {
    return JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
  } catch (error) {
    throw new OptimizationError(
      "CHECKPOINT_INVALID",
      "Optimization checkpoint is unreadable or invalid",
      {
        imagesDir,
        checkpointPath,
        reason: error?.message || String(error),
      }
    );
  }
}

function assertCheckpointCompatible({
  checkpoint,
  checkpointPath,
  imagesDir,
  originalNames,
  oxipngBin,
  oxipngVersion,
}) {
  const missingFields = [];
  if (
    !checkpoint.completedFiles ||
    typeof checkpoint.completedFiles !== "object" ||
    Array.isArray(checkpoint.completedFiles)
  ) {
    missingFields.push("completedFiles");
  }
  if (!Number.isSafeInteger(checkpoint.beforeBytes) || checkpoint.beforeBytes < 0) {
    missingFields.push("beforeBytes");
  }
  if (missingFields.length > 0) {
    throw new OptimizationError(
      "CHECKPOINT_INVALID",
      "Optimization checkpoint is missing required progress data",
      {
        imagesDir,
        checkpointPath,
        missingFields,
      }
    );
  }

  const expected = {
    version: CHECKPOINT_VERSION,
    imagesDir: path.resolve(imagesDir),
    oxipngBin,
    oxipngVersion,
    optimizeArgs: OPTIMIZE_ARGS,
    files: originalNames,
  };
  const mismatchedFields = Object.entries(expected)
    .filter(([field, value]) =>
      JSON.stringify(checkpoint[field]) !== JSON.stringify(value)
    )
    .map(([field]) => field);

  if (mismatchedFields.length > 0) {
    throw new OptimizationError(
      "CHECKPOINT_MISMATCH",
      "Optimization checkpoint does not match the current collection or settings",
      {
        imagesDir,
        checkpointPath,
        mismatchedFields,
      }
    );
  }

  const failedFiles = Object.entries(checkpoint.completedFiles || {})
    .filter(([name, fingerprint]) => {
      const file = path.join(imagesDir, name);
      if (!fs.existsSync(file)) {
        return true;
      }
      return JSON.stringify(fileFingerprint(file)) !== JSON.stringify(fingerprint);
    })
    .map(([name]) => name);

  if (failedFiles.length > 0) {
    throw new OptimizationError(
      "CHECKPOINT_FILE_CHANGED",
      "A completed PNG changed after it was checkpointed",
      {
        imagesDir,
        checkpointPath,
        failedFiles,
      }
    );
  }
}

function childFailed(result) {
  return Boolean(result.error) || result.status !== 0;
}

function runValidationProcess(spawnSyncFn, oxipngBin, files) {
  return spawnSyncFn(
    oxipngBin,
    [...VALIDATION_ARGS, ...files],
    { encoding: "utf8" }
  );
}

async function validatePngFiles({
  files,
  imagesDir,
  oxipngBin,
  spawnSyncFn,
}) {
  for (const batch of chunk(files, VALIDATION_BATCH_SIZE)) {
    const result = runValidationProcess(spawnSyncFn, oxipngBin, batch);
    if (!childFailed(result)) {
      continue;
    }

    if (result.error?.code === "ENOENT") {
      throw new OptimizationError(
        "OXIPNG_NOT_FOUND",
        "OxiPNG is not installed or is not on PATH",
        {
          imagesDir,
          missingFields: ["oxipng executable"],
        }
      );
    }

    const failedFiles = [];
    for (const file of batch) {
      const singleResult = runValidationProcess(
        spawnSyncFn,
        oxipngBin,
        [file]
      );
      if (childFailed(singleResult)) {
        failedFiles.push(path.basename(file));
      }
    }

    if (failedFiles.length > 0) {
      throw new OptimizationError(
        "OUTPUT_INVALID_PNG",
        "One or more PNG outputs are unreadable",
        {
          imagesDir,
          failedFiles,
        }
      );
    }

    throw new OptimizationError(
      "OXIPNG_FAILED",
      "OxiPNG validation failed",
      {
        imagesDir,
        phase: "validation",
        exitCode: result.status ?? null,
        stderr: String(result.stderr || result.error?.message || "").trim(),
      }
    );
  }
}

async function runOptimization({
  imagesDir,
  oxipngBin = "oxipng",
  spawnSyncFn = spawnSync,
  nowFn = Date.now,
  checkpointPath = defaultCheckpointPath(imagesDir),
  onProgress = () => {},
}) {
  const files = listPngFiles(imagesDir);
  const originalNames = files.map((file) => path.basename(file));
  const startedAt = nowFn();

  const versionResult = runChild(
    spawnSyncFn,
    oxipngBin,
    ["--version"],
    imagesDir
  );
  const oxipngVersion = String(versionResult.stdout || "").trim();

  let checkpoint;
  if (fs.existsSync(checkpointPath)) {
    checkpoint = readCheckpoint(checkpointPath, imagesDir);
    assertCheckpointCompatible({
      checkpoint,
      checkpointPath,
      imagesDir,
      originalNames,
      oxipngBin,
      oxipngVersion,
    });
  } else {
    checkpoint = {
      version: CHECKPOINT_VERSION,
      imagesDir: path.resolve(imagesDir),
      oxipngBin,
      oxipngVersion,
      optimizeArgs: OPTIMIZE_ARGS,
      files: originalNames,
      beforeBytes: sumBytes(files),
      completedFiles: {},
    };
    writeCheckpoint(checkpointPath, checkpoint);
  }

  const resumedImageCount = Object.keys(checkpoint.completedFiles).length;
  const pendingFiles = files.filter(
    (file) => !checkpoint.completedFiles[path.basename(file)]
  );
  let optimizedImageCount = 0;

  for (const batch of chunk(pendingFiles, OPTIMIZE_BATCH_SIZE)) {
    runChild(
      spawnSyncFn,
      oxipngBin,
      [...OPTIMIZE_ARGS, ...batch],
      imagesDir
    );

    for (const file of batch) {
      if (!fs.existsSync(file)) {
        throw new OptimizationError(
          "OUTPUT_COUNT_MISMATCH",
          "PNG output names or count changed during optimization",
          {
            imagesDir,
            expectedCount: files.length,
            actualCount: files.length - 1,
            failedFiles: [path.basename(file)],
          }
        );
      }
      checkpoint.completedFiles[path.basename(file)] = fileFingerprint(file);
      optimizedImageCount += 1;
    }
    writeCheckpoint(checkpointPath, checkpoint);

    const completedCount = resumedImageCount + optimizedImageCount;
    if (
      completedCount === files.length ||
      completedCount % PROGRESS_INTERVAL === 0
    ) {
      onProgress({
        status: "running",
        completedCount,
        imageCount: files.length,
        checkpointPath,
      });
    }
  }

  const outputFiles = listPngFiles(imagesDir);
  const outputNames = outputFiles.map((file) => path.basename(file));
  const failedFiles = originalNames
    .filter((name) => !outputNames.includes(name))
    .concat(outputNames.filter((name) => !originalNames.includes(name)));

  if (
    outputFiles.length !== files.length ||
    failedFiles.length > 0
  ) {
    throw new OptimizationError(
      "OUTPUT_COUNT_MISMATCH",
      "PNG output names or count changed during optimization",
      {
        imagesDir,
        expectedCount: files.length,
        actualCount: outputFiles.length,
        failedFiles,
      }
    );
  }

  await validatePngFiles({
    files: outputFiles,
    imagesDir,
    oxipngBin,
    spawnSyncFn,
  });

  const afterBytes = sumBytes(outputFiles);
  const beforeBytes = checkpoint.beforeBytes;
  const savedBytes = beforeBytes - afterBytes;
  const savedPercent =
    beforeBytes === 0
      ? 0
      : Number(((savedBytes / beforeBytes) * 100).toFixed(2));

  const summary = {
    status: "ok",
    imagesDir,
    oxipngVersion,
    imageCount: outputFiles.length,
    beforeBytes,
    afterBytes,
    savedBytes,
    savedPercent,
    optimizedImageCount,
    resumedImageCount,
    durationMs: nowFn() - startedAt,
  };

  fs.rmSync(checkpointPath, { force: true });
  return summary;
}

async function runCli({
  imagesDir = path.resolve(__dirname, "..", "build", "images"),
  runOptimizationFn = runOptimization,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const summary = await runOptimizationFn({
      imagesDir,
      onProgress: (progress) => {
        stderr.write(`${JSON.stringify(progress)}\n`);
      },
    });
    stdout.write(`${JSON.stringify(summary)}\n`);
    return 0;
  } catch (error) {
    const structuredError =
      error instanceof OptimizationError
        ? error.toJSON()
        : {
            code: "UNEXPECTED_ERROR",
            message: error?.message || String(error),
            imagesDir,
          };
    stderr.write(`${JSON.stringify(structuredError)}\n`);
    return 1;
  }
}

if (require.main === module) {
  runCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}

module.exports = {
  OptimizationError,
  runCli,
  runOptimization,
};
