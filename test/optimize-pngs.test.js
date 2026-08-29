const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createCanvas } = require("canvas");

const {
  OptimizationError,
  runOptimization,
} = require("../scripts/optimize-pngs");

const makeTempDir = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "haku-optimize-"));

function makeFixtureDirectory(t) {
  const imagesDir = makeTempDir();
  t.after(() => fs.rmSync(imagesDir, { recursive: true, force: true }));

  const canvas = createCanvas(2, 2);
  const context = canvas.getContext("2d");
  const pixels = context.createImageData(2, 2);
  pixels.data.set([
    255, 0, 0, 255,
    0, 255, 0, 128,
    12, 34, 56, 0,
    0, 0, 255, 255,
  ]);
  context.putImageData(pixels, 0, 0);
  fs.writeFileSync(path.join(imagesDir, "1.png"), canvas.toBuffer("image/png"));
  return imagesDir;
}

function makeSpawnSequence(results) {
  let index = 0;
  return () => results[index++];
}

test("missing image directory fails explicitly", async (t) => {
  const root = makeTempDir();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  await assert.rejects(
    runOptimization({ imagesDir: path.join(root, "missing") }),
    (error) =>
      error instanceof OptimizationError &&
      error.code === "IMAGES_DIR_MISSING" &&
      error.details.imagesDir === path.join(root, "missing")
  );
});

test("empty image directory fails explicitly", async (t) => {
  const imagesDir = makeTempDir();
  t.after(() => fs.rmSync(imagesDir, { recursive: true, force: true }));

  await assert.rejects(
    runOptimization({ imagesDir }),
    (error) =>
      error instanceof OptimizationError && error.code === "NO_PNG_FILES"
  );
});

test("missing OxiPNG fails without a fallback", async (t) => {
  const imagesDir = makeFixtureDirectory(t);
  const spawnSyncFn = () => ({
    error: Object.assign(new Error("spawn oxipng ENOENT"), { code: "ENOENT" }),
  });

  await assert.rejects(
    runOptimization({ imagesDir, spawnSyncFn }),
    (error) =>
      error instanceof OptimizationError &&
      error.code === "OXIPNG_NOT_FOUND" &&
      error.details.missingFields.includes("oxipng executable")
  );
});

test("OxiPNG process failures include exit details", async (t) => {
  const imagesDir = makeFixtureDirectory(t);
  const spawnSyncFn = makeSpawnSequence([
    { status: 0, stdout: "oxipng 9.1.5\n", stderr: "" },
    { status: 7, stdout: "", stderr: "cannot optimize image" },
  ]);

  await assert.rejects(
    runOptimization({ imagesDir, spawnSyncFn }),
    (error) =>
      error instanceof OptimizationError &&
      error.code === "OXIPNG_FAILED" &&
      error.details.exitCode === 7 &&
      error.details.stderr === "cannot optimize image"
  );
});
