const test = require("node:test");
const assert = require("node:assert/strict");

test("default NFT output is 3000 by 3000 pixels", () => {
  const { format } = require("../src/config.js");

  assert.deepEqual(
    { width: format.width, height: format.height },
    { width: 3000, height: 3000 }
  );
});

test("default collection generates 150 female and 250 male hoodie NFTs", () => {
  const { layerConfigurations } = require("../src/config.js");

  assert.deepEqual(
    layerConfigurations.map(({ gender, growEditionSizeTo }) => ({
      gender,
      growEditionSizeTo,
    })),
    [
      { gender: "female", growEditionSizeTo: 150 },
      { gender: "male", growEditionSizeTo: 250 },
    ]
  );

  for (const configuration of layerConfigurations) {
    const layerNames = configuration.layersOrder.map(({ name }) => name);

    assert.equal(layerNames.includes("clothes1"), false);
    assert.equal(layerNames.includes("clothes2"), false);
    assert.equal(layerNames.includes("hoodie1"), true);
    assert.equal(layerNames.includes("hoodie2"), true);
    assert.deepEqual(configuration.excludeSuffixes, { "*": "_nohoodie" });
    assert.equal(configuration.layerAssociations.clothes2, undefined);
    assert.deepEqual(configuration.layerAssociations.hoodie2, {
      hoodie1: "sameName",
    });
  }
});
