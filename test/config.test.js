const test = require("node:test");
const assert = require("node:assert/strict");

test("default NFT output is 3000 by 3000 pixels", () => {
  const { format } = require("../src/config.js");

  assert.deepEqual(
    { width: format.width, height: format.height },
    { width: 3000, height: 3000 }
  );
});
