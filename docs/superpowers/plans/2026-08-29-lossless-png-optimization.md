# Lossless PNG Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, rerunnable `npm run optimize` command that losslessly optimizes generated PNGs with OxiPNG before IPFS upload, plus a combined `npm run generate:optimized` command.

**Architecture:** A repository-owned CommonJS orchestration module will validate `build/images`, verify the external OxiPNG binary, invoke it in bounded batches with strict lossless options, validate the resulting files, and emit machine-readable JSON. Node's built-in test runner will exercise the module through injected process and image-decoding functions so error paths are deterministic without requiring OxiPNG on the test host.

**Tech Stack:** Node.js 22, CommonJS, `node:test`, existing `canvas` dependency, OxiPNG CLI.

---

## File Structure

- Create `scripts/optimize-pngs.js`: CLI entry point plus testable optimizer orchestration and structured error types.
- Create `test/optimize-pngs.test.js`: behavior tests for validation, OxiPNG invocation, integrity checks, summaries, and reruns.
- Modify `package.json`: expose `test`, `optimize`, and `generate:optimized` commands.
- Create `docs/png-optimization.md`: installation, command usage, IPFS ordering, expected results, and recovery guidance.

### Task 1: Input and OxiPNG Failure Contract

**Files:**
- Create: `test/optimize-pngs.test.js`
- Create: `scripts/optimize-pngs.js`

- [ ] **Step 1: Write failing validation tests**

Create helpers that make isolated directories and fake `spawnSync` results, then add these tests:

```js
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

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "haku-optimize-"));

async function makeFixtureDirectory(t) {
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
    (error) => error instanceof OptimizationError && error.code === "IMAGES_DIR_MISSING"
  );
});

test("empty image directory fails explicitly", async (t) => {
  const imagesDir = makeTempDir();
  t.after(() => fs.rmSync(imagesDir, { recursive: true, force: true }));

  await assert.rejects(
    runOptimization({ imagesDir }),
    (error) => error instanceof OptimizationError && error.code === "NO_PNG_FILES"
  );
});

test("missing OxiPNG fails without a fallback", async (t) => {
  const imagesDir = await makeFixtureDirectory(t);
  const spawnSyncFn = () => ({
    error: Object.assign(new Error("spawn oxipng ENOENT"), { code: "ENOENT" }),
  });

  await assert.rejects(
    runOptimization({ imagesDir, spawnSyncFn }),
    (error) => error instanceof OptimizationError && error.code === "OXIPNG_NOT_FOUND"
  );
});

test("OxiPNG process failures include exit details", async (t) => {
  const imagesDir = await makeFixtureDirectory(t);
  const spawnSyncFn = makeSpawnSequence([
    { status: 0, stdout: "oxipng 9.1.5\n", stderr: "" },
    { status: 7, stdout: "", stderr: "cannot optimize image" },
  ]);

  await assert.rejects(
    runOptimization({ imagesDir, spawnSyncFn }),
    (error) =>
      error.code === "OXIPNG_FAILED" &&
      error.details.exitCode === 7 &&
      error.details.stderr === "cannot optimize image"
  );
});
```

- [ ] **Step 2: Run the tests and confirm the missing module failure**

Run: `node --test test/optimize-pngs.test.js`

Expected: FAIL because `../scripts/optimize-pngs` does not exist.

- [ ] **Step 3: Implement the validation and structured error foundation**

Create `scripts/optimize-pngs.js` with:

```js
#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { loadImage } = require("canvas");

class OptimizationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OptimizationError";
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return { code: this.code, message: this.message, ...this.details };
  }
}

function listPngFiles(imagesDir) {
  if (!fs.existsSync(imagesDir) || !fs.statSync(imagesDir).isDirectory()) {
    throw new OptimizationError("IMAGES_DIR_MISSING", "Generated image directory does not exist", {
      imagesDir,
      missingFields: ["imagesDir"],
    });
  }

  const files = fs.readdirSync(imagesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".png")
    .map((entry) => path.join(imagesDir, entry.name))
    .sort();

  if (files.length === 0) {
    throw new OptimizationError("NO_PNG_FILES", "No PNG files were found to optimize", { imagesDir });
  }
  return files;
}

function runChild(spawnSyncFn, binary, args, imagesDir) {
  const result = spawnSyncFn(binary, args, { encoding: "utf8" });
  if (result.error && result.error.code === "ENOENT") {
    throw new OptimizationError("OXIPNG_NOT_FOUND", "OxiPNG is not installed or is not on PATH", {
      imagesDir,
      missingFields: ["oxipng executable"],
    });
  }
  return result;
}
```

Add `runOptimization` with input enumeration, `oxipng --version`, and `OXIPNG_FAILED` propagation. Export the class and function; keep CLI execution behind `require.main === module`.

- [ ] **Step 4: Run the focused tests**

Run: `node --test test/optimize-pngs.test.js`

Expected: PASS for the four validation and external-process cases.

- [ ] **Step 5: Commit the failure contract**

```bash
git add scripts/optimize-pngs.js test/optimize-pngs.test.js
git commit -m "test: define PNG optimizer failure contract"
```

### Task 2: Lossless Optimization, Output Validation, and Summary

**Files:**
- Modify: `test/optimize-pngs.test.js`
- Modify: `scripts/optimize-pngs.js`

- [ ] **Step 1: Add failing successful-run and integrity tests**

Use `canvas.createCanvas()` to write fixtures containing opaque and transparent pixels. Add tests that capture every spawn call and assert:

```js
assert.deepEqual(calls[0].args, ["--version"]);
assert.deepEqual(calls[1].args.slice(0, 4), ["-o", "4", "--strip", "safe"]);
assert.equal(calls[1].args.includes("--alpha"), false);
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
```

Also cover:

```js
test("a missing output file fails with OUTPUT_COUNT_MISMATCH", async () => {});
test("an unreadable output fails with OUTPUT_INVALID_PNG", async () => {});
test("optimization is safe to rerun", async () => {});
```

The success test must hash decoded RGBA data before and after with `canvas.getImageData()` and assert equal hashes, dimensions, and filenames.

- [ ] **Step 2: Run tests and confirm the new assertions fail**

Run: `node --test test/optimize-pngs.test.js`

Expected: FAIL because optimization batching, validation, and the complete summary are not implemented.

- [ ] **Step 3: Implement bounded batches and post-run validation**

Add these focused helpers to `scripts/optimize-pngs.js`:

```js
const BATCH_SIZE = 128;

const sumBytes = (files) => files.reduce((total, file) => total + fs.statSync(file).size, 0);

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function validatePngFiles(files, imagesDir, loadImageFn = loadImage) {
  const invalidFiles = [];
  for (const file of files) {
    try {
      const image = await loadImageFn(file);
      if (!image.width || !image.height) invalidFiles.push(path.basename(file));
    } catch {
      invalidFiles.push(path.basename(file));
    }
  }
  if (invalidFiles.length > 0) {
    throw new OptimizationError("OUTPUT_INVALID_PNG", "One or more PNG outputs are unreadable", {
      imagesDir,
      failedFiles: invalidFiles,
    });
  }
}
```

Complete `runOptimization` so it:

1. records the original sorted basenames and byte total;
2. validates all inputs;
3. executes each batch as `oxipng -o 4 --strip safe <absolute files...>`;
4. enumerates outputs again and compares exact basenames;
5. validates all outputs;
6. returns counts, byte totals, savings, duration, and version.

Do not add `--alpha`, format conversion, alternate paths, or another optimizer.

- [ ] **Step 4: Run all optimizer tests**

Run: `node --test test/optimize-pngs.test.js`

Expected: all tests PASS, including the second run and decoded-pixel hashes.

- [ ] **Step 5: Commit optimizer behavior**

```bash
git add scripts/optimize-pngs.js test/optimize-pngs.test.js
git commit -m "feat: add lossless PNG optimization command"
```

### Task 3: CLI JSON Output and npm Commands

**Files:**
- Modify: `test/optimize-pngs.test.js`
- Modify: `scripts/optimize-pngs.js`
- Modify: `package.json`

- [ ] **Step 1: Add failing CLI and package-script tests**

Add a package manifest test:

```js
test("package scripts preserve generation and add ordered optimization", () => {
  const packageJson = require("../package.json");
  assert.equal(packageJson.scripts.generate, "node index.js");
  assert.equal(packageJson.scripts.optimize, "node scripts/optimize-pngs.js");
  assert.equal(packageJson.scripts["generate:optimized"], "npm run generate && npm run optimize");
  assert.equal(packageJson.scripts.test, "node --test test/*.test.js");
});
```

Test `runCli()` with injected output writers so a successful run writes one JSON summary to stdout, while a failure writes one structured JSON error to stderr, sets a nonzero exit code, and includes `imagesDir`.

- [ ] **Step 2: Run tests and confirm package/CLI failures**

Run: `node --test test/optimize-pngs.test.js`

Expected: FAIL because the npm scripts and injectable CLI wrapper do not yet exist.

- [ ] **Step 3: Implement `runCli` and package scripts**

Add to `scripts/optimize-pngs.js`:

```js
async function runCli({ stdout = process.stdout, stderr = process.stderr } = {}) {
  const imagesDir = path.resolve(__dirname, "..", "build", "images");
  try {
    const summary = await runOptimization({ imagesDir });
    stdout.write(`${JSON.stringify(summary)}\n`);
    return 0;
  } catch (error) {
    const structured = error instanceof OptimizationError
      ? error.toJSON()
      : { code: "UNEXPECTED_ERROR", message: error.message, imagesDir };
    stderr.write(`${JSON.stringify(structured)}\n`);
    return 1;
  }
}

if (require.main === module) {
  runCli().then((exitCode) => { process.exitCode = exitCode; });
}
```

Modify `package.json` scripts to include:

```json
"test": "node --test test/*.test.js",
"optimize": "node scripts/optimize-pngs.js",
"generate:optimized": "npm run generate && npm run optimize"
```

- [ ] **Step 4: Verify tests and short-circuit semantics**

Run: `npm test`

Expected: all tests PASS. The exact `&&` manifest assertion proves optimization cannot start after a failed generation command.

- [ ] **Step 5: Commit CLI integration**

```bash
git add package.json scripts/optimize-pngs.js test/optimize-pngs.test.js
git commit -m "feat: expose optimized generation workflow"
```

### Task 4: Operator Documentation

**Files:**
- Create: `docs/png-optimization.md`

- [ ] **Step 1: Write the operator guide**

Document these exact commands and constraints:

```markdown
# PNG Optimization

Install OxiPNG once on macOS with `brew install oxipng`, or with Rust using
`cargo install oxipng`. Verify it with `oxipng --version`.

Run generation and optimization separately:

    npm run generate
    npm run optimize

Or run the ordered combined command:

    npm run generate:optimized

Always optimize before uploading images to IPFS. Optimization changes PNG bytes
and therefore changes the image folder CID, even though decoded pixels do not
change. Then write `ipfs://<images-folder-CID>/<token>.png` into the JSON metadata
and upload the metadata folder. The contract token URI points to the JSON folder,
not directly to the image folder.
```

Explain that OxiPNG is mandatory, failures are JSON records, rerunning is safe, and expected savings may be modest because Canvas already applies lossless PNG compression.

- [ ] **Step 2: Check the documentation against package scripts**

Run: `rg -n "npm run (generate|optimize|generate:optimized)|IPFS|oxipng" docs/png-optimization.md package.json`

Expected: all three commands, the OxiPNG requirement, and pre-IPFS order are present and match the manifest.

- [ ] **Step 3: Commit documentation**

```bash
git add docs/png-optimization.md
git commit -m "docs: explain pre-IPFS PNG optimization"
```

### Task 5: Final Verification and Delivery

**Files:**
- Verify all modified files.

- [ ] **Step 1: Install repository dependencies without changing declared versions**

Run: `npm ci`

Expected: exit code 0 and no tracked manifest or lockfile changes.

- [ ] **Step 2: Run the automated suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 3: Exercise the real missing-tool path if OxiPNG is unavailable**

Run: `PATH=/usr/bin:/bin npm run optimize`

Expected: exit code nonzero and one JSON record with `code` equal to `OXIPNG_NOT_FOUND` (assuming `build/images` contains a fixture during this check; otherwise exercise the exported runner in the automated test).

- [ ] **Step 4: Perform repository hygiene checks**

Run: `git diff --check && git status --short && git log --oneline origin/main..HEAD`

Expected: no whitespace errors, only intended files changed, and all feature commits are listed.

- [ ] **Step 5: Synchronize with the latest main and reverify**

Run: `git fetch origin main && git merge --no-edit origin/main && npm test`

Expected: merge succeeds and all tests PASS.

- [ ] **Step 6: Push and create a pull request**

```bash
git push -u origin feat/png-lossless-optimization
gh pr create --base main --head feat/png-lossless-optimization \
  --title "Add lossless PNG optimization workflow" \
  --body "Adds a strict OxiPNG post-generation step, structured validation, tests, and pre-IPFS usage documentation."
```

Expected: branch is pushed and GitHub returns a pull request URL.
