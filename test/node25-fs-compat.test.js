const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

function listJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listJavaScriptFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith(".js") ? [entryPath] : [];
  });
}

test("generator sources avoid recursive rmdirSync removed by Node 25", () => {
  const sourceFiles = ["src", "utils"].flatMap((directory) =>
    listJavaScriptFiles(path.join(projectRoot, directory))
  );

  const incompatibleFiles = sourceFiles
    .filter((file) => /\bfs\.rmdirSync\s*\(/.test(fs.readFileSync(file, "utf8")))
    .map((file) => path.relative(projectRoot, file));

  assert.deepEqual(incompatibleFiles, []);
});

test("rmSync recursively removes a non-empty directory on the active Node runtime", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "haku-generator-rm-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const nested = path.join(root, "nested");
  fs.mkdirSync(nested);
  fs.writeFileSync(path.join(nested, "image.png"), "test");

  fs.rmSync(root, { recursive: true, force: true });

  assert.equal(fs.existsSync(root), false);
});
