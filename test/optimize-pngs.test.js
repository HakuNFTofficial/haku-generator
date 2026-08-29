const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { createCanvas, loadImage } = require("canvas");

const {
  OptimizationError,
  runCli,
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

  const secondCanvas = createCanvas(3, 1);
  const secondContext = secondCanvas.getContext("2d");
  secondContext.fillStyle = "#abcdef";
  secondContext.fillRect(0, 0, 3, 1);
  fs.writeFileSync(
    path.join(imagesDir, "2.PNG"),
    secondCanvas.toBuffer("image/png")
  );
  return imagesDir;
}

function makeSpawnSequence(results) {
  let index = 0;
  return () => results[index++];
}

function listNames(imagesDir) {
  return fs
    .readdirSync(imagesDir)
    .filter((name) => path.extname(name).toLowerCase() === ".png")
    .sort();
}

function totalBytes(imagesDir) {
  return listNames(imagesDir).reduce(
    (total, name) => total + fs.statSync(path.join(imagesDir, name)).size,
    0
  );
}

async function decodedImageRecord(file) {
  const image = await loadImage(file);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const rgba = context.getImageData(0, 0, image.width, image.height).data;
  return {
    width: image.width,
    height: image.height,
    rgbaHash: createHash("sha256").update(rgba).digest("hex"),
  };
}

async function snapshotImages(imagesDir) {
  const entries = await Promise.all(
    listNames(imagesDir).map(async (name) => [
      name,
      await decodedImageRecord(path.join(imagesDir, name)),
    ])
  );
  return Object.fromEntries(entries);
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

test("OxiPNG availability is checked before decoding the collection", async (t) => {
  const imagesDir = makeFixtureDirectory(t);
  let decodeCalls = 0;
  const spawnSyncFn = () => ({
    error: Object.assign(new Error("spawn oxipng ENOENT"), { code: "ENOENT" }),
  });

  await assert.rejects(
    runOptimization({
      imagesDir,
      spawnSyncFn,
      loadImageFn: async () => {
        decodeCalls += 1;
        return { width: 1, height: 1 };
      },
    }),
    (error) => error.code === "OXIPNG_NOT_FOUND"
  );
  assert.equal(decodeCalls, 0);
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

test("successful optimization uses strict lossless options and reports savings", async (t) => {
  const imagesDir = makeFixtureDirectory(t);
  const beforeSnapshot = await snapshotImages(imagesDir);
  const beforeBytes = totalBytes(imagesDir);
  const calls = [];
  const spawnSyncFn = (binary, args, options) => {
    calls.push({ binary, args, options });
    return args[0] === "--version"
      ? { status: 0, stdout: "oxipng 9.1.5\n", stderr: "" }
      : { status: 0, stdout: "", stderr: "" };
  };
  const times = [100, 125];

  const summary = await runOptimization({
    imagesDir,
    spawnSyncFn,
    nowFn: () => times.shift(),
  });

  assert.deepEqual(calls[0].args, ["--version"]);
  assert.deepEqual(calls[1].args.slice(0, 4), [
    "-o",
    "4",
    "--strip",
    "safe",
  ]);
  assert.equal(calls[1].args.includes("--alpha"), false);
  assert.deepEqual(calls[1].args.slice(4), [
    path.join(imagesDir, "1.png"),
    path.join(imagesDir, "2.PNG"),
  ]);
  assert.deepEqual(await snapshotImages(imagesDir), beforeSnapshot);
  assert.deepEqual(summary, {
    status: "ok",
    imagesDir,
    oxipngVersion: "oxipng 9.1.5",
    imageCount: 2,
    beforeBytes,
    afterBytes: beforeBytes,
    savedBytes: 0,
    savedPercent: 0,
    durationMs: 25,
  });
});

test("a missing output file fails with OUTPUT_COUNT_MISMATCH", async (t) => {
  const imagesDir = makeFixtureDirectory(t);
  let callCount = 0;
  const spawnSyncFn = () => {
    callCount += 1;
    if (callCount === 2) {
      fs.unlinkSync(path.join(imagesDir, "1.png"));
    }
    return callCount === 1
      ? { status: 0, stdout: "oxipng 9.1.5\n", stderr: "" }
      : { status: 0, stdout: "", stderr: "" };
  };

  await assert.rejects(
    runOptimization({ imagesDir, spawnSyncFn }),
    (error) =>
      error instanceof OptimizationError &&
      error.code === "OUTPUT_COUNT_MISMATCH" &&
      error.details.failedFiles.includes("1.png")
  );
});

test("an unreadable output fails with OUTPUT_INVALID_PNG", async (t) => {
  const imagesDir = makeFixtureDirectory(t);
  let callCount = 0;
  const spawnSyncFn = () => {
    callCount += 1;
    if (callCount === 2) {
      fs.writeFileSync(path.join(imagesDir, "1.png"), "not a png");
    }
    return callCount === 1
      ? { status: 0, stdout: "oxipng 9.1.5\n", stderr: "" }
      : { status: 0, stdout: "", stderr: "" };
  };

  await assert.rejects(
    runOptimization({ imagesDir, spawnSyncFn }),
    (error) =>
      error instanceof OptimizationError &&
      error.code === "OUTPUT_INVALID_PNG" &&
      error.details.failedFiles.includes("1.png")
  );
});

test("optimization is safe to rerun", async (t) => {
  const imagesDir = makeFixtureDirectory(t);
  const beforeSnapshot = await snapshotImages(imagesDir);
  const spawnSyncFn = (_binary, args) =>
    args[0] === "--version"
      ? { status: 0, stdout: "oxipng 9.1.5\n", stderr: "" }
      : { status: 0, stdout: "", stderr: "" };

  await runOptimization({ imagesDir, spawnSyncFn });
  await runOptimization({ imagesDir, spawnSyncFn });

  assert.deepEqual(await snapshotImages(imagesDir), beforeSnapshot);
});

test("large collections use memory-conscious OxiPNG batches", async (t) => {
  const imagesDir = makeFixtureDirectory(t);
  const source = path.join(imagesDir, "1.png");
  for (let edition = 3; edition <= 17; edition += 1) {
    fs.copyFileSync(source, path.join(imagesDir, `${edition}.png`));
  }
  const calls = [];
  const spawnSyncFn = (_binary, args) => {
    calls.push(args);
    return args[0] === "--version"
      ? { status: 0, stdout: "oxipng 9.1.5\n", stderr: "" }
      : { status: 0, stdout: "", stderr: "" };
  };

  await runOptimization({
    imagesDir,
    spawnSyncFn,
    loadImageFn: async () => ({ width: 1, height: 1 }),
  });

  const optimizeCalls = calls.slice(1);
  assert.equal(optimizeCalls.length, 3);
  assert.equal(
    optimizeCalls.every((args) => args.slice(4).length <= 8),
    true
  );
  assert.equal(
    optimizeCalls.reduce((count, args) => count + args.slice(4).length, 0),
    17
  );
});

test("package scripts preserve generation and add ordered optimization", () => {
  const packageJson = require("../package.json");

  assert.equal(packageJson.scripts.generate, "node index.js");
  assert.equal(
    packageJson.scripts.optimize,
    "node scripts/optimize-pngs.js"
  );
  assert.equal(
    packageJson.scripts["generate:optimized"],
    "npm run generate && npm run optimize"
  );
  assert.equal(packageJson.scripts.test, "node --test test/*.test.js");
});

test("CLI writes a successful summary as one JSON record", async () => {
  const imagesDir = "/repo/build/images";
  const summary = {
    status: "ok",
    imagesDir,
    imageCount: 2,
  };
  const stdoutWrites = [];
  const stderrWrites = [];

  const exitCode = await runCli({
    imagesDir,
    runOptimizationFn: async (options) => {
      assert.equal(options.imagesDir, imagesDir);
      return summary;
    },
    stdout: { write: (value) => stdoutWrites.push(value) },
    stderr: { write: (value) => stderrWrites.push(value) },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(stdoutWrites, [`${JSON.stringify(summary)}\n`]);
  assert.deepEqual(stderrWrites, []);
});

test("CLI writes a structured failure as one JSON record", async () => {
  const imagesDir = "/repo/build/images";
  const stdoutWrites = [];
  const stderrWrites = [];

  const exitCode = await runCli({
    imagesDir,
    runOptimizationFn: async () => {
      throw new OptimizationError(
        "OXIPNG_NOT_FOUND",
        "OxiPNG is not installed or is not on PATH",
        {
          imagesDir,
          missingFields: ["oxipng executable"],
        }
      );
    },
    stdout: { write: (value) => stdoutWrites.push(value) },
    stderr: { write: (value) => stderrWrites.push(value) },
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(stdoutWrites, []);
  assert.deepEqual(JSON.parse(stderrWrites[0]), {
    code: "OXIPNG_NOT_FOUND",
    message: "OxiPNG is not installed or is not on PATH",
    imagesDir,
    missingFields: ["oxipng executable"],
  });
  assert.equal(stderrWrites.length, 1);
});
