#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

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

async function runOptimization({
  imagesDir,
  oxipngBin = "oxipng",
  spawnSyncFn = spawnSync,
}) {
  const files = listPngFiles(imagesDir);
  const versionResult = runChild(
    spawnSyncFn,
    oxipngBin,
    ["--version"],
    imagesDir
  );

  runChild(
    spawnSyncFn,
    oxipngBin,
    ["-o", "4", "--strip", "safe", ...files],
    imagesDir
  );

  return {
    status: "ok",
    imagesDir,
    oxipngVersion: String(versionResult.stdout || "").trim(),
  };
}

module.exports = {
  OptimizationError,
  runOptimization,
};
