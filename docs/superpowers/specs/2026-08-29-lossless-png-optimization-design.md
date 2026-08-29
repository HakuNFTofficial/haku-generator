# Lossless PNG Optimization Design

Date: 2026-08-29
Status: Approved for planning

## Objective

Add an explicit, repeatable post-generation command that losslessly optimizes every generated PNG before the collection is uploaded to IPFS. Preserve the existing generation command and image pixels while reducing storage and transfer size when further compression is available.

## Context

The generator currently writes each image with:

```js
canvas.toBuffer("image/png")
```

The installed `canvas` implementation already defaults to ZLIB compression level 6 and all PNG filters, so generated files are already losslessly compressed. The proposed optimizer is a second pass and should be expected to deliver incremental savings rather than the roughly 97% raw-to-PNG reduction observed in low-entropy cartoon artwork.

A representative competitor PNG measured 2,900 by 2,900 pixels, 8-bit RGBA, and 795,485 bytes. A separate lossless recompression produced a 784,286-byte file with zero decoded pixel differences, an additional reduction of about 1.4%. Collection-specific results must be measured from generated samples rather than inferred from dimensions alone.

## User Workflow

Keep the existing command unchanged:

```bash
npm run generate
```

Add a separately rerunnable optimization command:

```bash
npm run optimize
```

Add a convenience command that runs both steps in the required order:

```bash
npm run generate:optimized
```

The publication order is mandatory:

```text
generate -> optimize -> validate -> upload images to IPFS -> rewrite metadata image URIs -> upload metadata
```

PNG optimization changes file bytes and therefore changes IPFS CIDs even when decoded pixels are identical. Optimization must never run after the corresponding image CIDs have been published.

## Chosen Approach

Use OxiPNG as an external, purpose-built, multithreaded, lossless PNG optimizer. `npm run optimize` will invoke a repository-owned Node.js orchestration script, which will validate inputs, call OxiPNG, and report a structured summary.

Use these OxiPNG settings:

```text
-o 4 --strip safe
```

Do not use `--alpha`. OxiPNG documents that option as technically lossy because it may change RGB values underneath fully transparent pixels. The project requirement is strict decoded-RGBA preservation.

The optimizer is a required executable, not an optional enhancement. The command must fail explicitly if OxiPNG is unavailable; it must not silently substitute ImageMagick, Canvas re-encoding, lossy quantization, or another codec. Installation requirements and supported version must be documented.

## Components

### Package scripts

`package.json` will expose:

- `optimize`: run the optimizer orchestration script against `build/images`.
- `generate:optimized`: run `generate`, then `optimize`; optimization only starts if generation exits successfully.
- A test command for the new optimizer behavior, without changing the semantics of existing generation scripts.

### Optimizer orchestration

Create `scripts/optimize-pngs.js` with one responsibility: safely optimize the generated PNG collection.

It will:

1. Resolve `build/images` relative to the repository root, not the caller's current directory.
2. Require the directory to exist.
3. Enumerate regular files with a `.png` extension.
4. Reject an empty image directory.
5. Record image count and total bytes before optimization.
6. Verify that the `oxipng` executable is callable and expose its version in the run summary.
7. Execute OxiPNG with optimization level 4 and safe metadata stripping, without `--alpha`.
8. Record image count and total bytes after optimization.
9. Confirm that no expected PNG disappeared and that every output remains a readable PNG.
10. Print counts, byte totals, saved bytes, percentage saved, duration, and OxiPNG version.

OxiPNG may optimize files in place. A partially completed run is safe to rerun because every completed file remains a valid, pixel-equivalent PNG and already-optimized files are valid inputs.

### Error reporting

Failures must exit nonzero and print a structured, actionable record containing:

- `code`
- `message`
- `imagesDir`
- `missingFields` or failed file names when applicable
- the relevant child-process exit code and stderr for OxiPNG failures

Required error codes include:

- `IMAGES_DIR_MISSING`
- `NO_PNG_FILES`
- `OXIPNG_NOT_FOUND`
- `OXIPNG_FAILED`
- `OUTPUT_COUNT_MISMATCH`
- `OUTPUT_INVALID_PNG`

No fallback behavior may guess paths, operate on a different directory, change image format, or substitute another optimizer.

## Integrity and Metadata Rules

- Decoded RGBA pixels must remain identical.
- Width and height must remain identical.
- File names must remain identical.
- JSON metadata files must not be edited by the optimizer.
- DNA, attributes, editions, and ordering must not change.
- PNG byte hashes and IPFS CIDs are expected to change when optimization saves bytes.
- The optimizer must finish successfully before the IPFS upload workflow starts.

## Verification

Automated tests will use generated fixture PNGs that include opaque pixels, partial transparency, and fully transparent pixels with nonzero hidden RGB values.

Tests will verify:

1. Missing `build/images` fails with `IMAGES_DIR_MISSING`.
2. An empty directory fails with `NO_PNG_FILES`.
3. Missing OxiPNG fails with `OXIPNG_NOT_FOUND`.
4. A simulated optimizer failure is propagated as `OXIPNG_FAILED`.
5. Successful optimization preserves names, dimensions, and decoded RGBA hashes.
6. The summary reports correct before/after counts and byte totals.
7. Re-running optimization succeeds and preserves decoded pixels.
8. `generate:optimized` does not optimize if generation fails.

A manual release check will run the command against a 50-to-100-image sample at the intended final dimensions and record average bytes per image, compression savings, throughput, and projected full-collection storage before committing to a 10,000-image run.

## Documentation

The project documentation will state:

- one-time OxiPNG installation and version verification;
- the two-step and combined npm commands;
- the mandatory pre-IPFS ordering;
- expected incremental rather than dramatic post-processing savings;
- how to interpret the summary and recover by rerunning after a failure.

## Non-goals

- Lossy palette reduction or PNG-8 conversion.
- JPEG, WebP, AVIF, or other output formats.
- Resizing or changing the configured canvas dimensions.
- Automatically uploading optimized files to IPFS.
- Updating JSON image URIs or contract metadata.
- Optimizing layer source assets.
