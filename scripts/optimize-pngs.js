#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { loadImage } = require("canvas");

const BATCH_SIZE = 128;

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

async function validatePngFiles(
  files,
  imagesDir,
  loadImageFn = loadImage
) {
  const invalidFiles = [];

  for (const file of files) {
    try {
      const image = await loadImageFn(file);
      if (!image.width || !image.height) {
        invalidFiles.push(path.basename(file));
      }
    } catch {
      invalidFiles.push(path.basename(file));
    }
  }

  if (invalidFiles.length > 0) {
    throw new OptimizationError(
      "OUTPUT_INVALID_PNG",
      "One or more PNG outputs are unreadable",
      {
        imagesDir,
        failedFiles: invalidFiles,
      }
    );
  }
}

async function runOptimization({
  imagesDir,
  oxipngBin = "oxipng",
  spawnSyncFn = spawnSync,
  loadImageFn = loadImage,
  nowFn = Date.now,
}) {
  const files = listPngFiles(imagesDir);
  const originalNames = files.map((file) => path.basename(file));
  const beforeBytes = sumBytes(files);
  const startedAt = nowFn();

  const versionResult = runChild(
    spawnSyncFn,
    oxipngBin,
    ["--version"],
    imagesDir
  );

  for (const batch of chunk(files, BATCH_SIZE)) {
    runChild(
      spawnSyncFn,
      oxipngBin,
      ["-o", "4", "--strip", "safe", ...batch],
      imagesDir
    );
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

  await validatePngFiles(outputFiles, imagesDir, loadImageFn);

  const afterBytes = sumBytes(outputFiles);
  const savedBytes = beforeBytes - afterBytes;
  const savedPercent =
    beforeBytes === 0
      ? 0
      : Number(((savedBytes / beforeBytes) * 100).toFixed(2));

  return {
    status: "ok",
    imagesDir,
    oxipngVersion: String(versionResult.stdout || "").trim(),
    imageCount: outputFiles.length,
    beforeBytes,
    afterBytes,
    savedBytes,
    savedPercent,
    durationMs: nowFn() - startedAt,
  };
}

async function runCli({
  imagesDir = path.resolve(__dirname, "..", "build", "images"),
  runOptimizationFn = runOptimization,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const summary = await runOptimizationFn({ imagesDir });
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
