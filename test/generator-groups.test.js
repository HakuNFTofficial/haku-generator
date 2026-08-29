const assert = require('node:assert/strict');
const test = require('node:test');
const { createDna, applyLayerAssociations } = require('../src/main_improved.js');

const makeLayer = (name, filenames = ['style_a.png', 'style_b.png']) => ({
  name,
  elements: filenames.map((filename, id) => ({
    id,
    name: filename.replace(/\.png$/, ''),
    filename,
    weight: 1,
  })),
  opacity: 1,
  blend: 'source-over',
});

const withRandom = (value, callback) => {
  const originalRandom = Math.random;
  const originalLog = console.log;
  try {
    Math.random = () => value;
    console.log = () => {};
    return callback();
  } finally {
    Math.random = originalRandom;
    console.log = originalLog;
  }
};

const groupedLayers = [
  makeLayer('background', ['background_a.png', 'background_b.png']),
  makeLayer('clothes2'),
  makeLayer('hoodie2', ['hood_a.png', 'hood_b.png']),
  makeLayer('clothes1'),
  makeLayer('hoodie1', ['hood_a.png', 'hood_b.png']),
];

const createGroupedConfig = (groupPolling) => ({
  layersOrder: groupedLayers.map(({ name }) => ({ name })),
  layerGroups: {
    clothes: ['clothes1', 'clothes2'],
    hoodies: ['hoodie1', 'hoodie2'],
  },
  exclusiveGroups: [['clothes', 'hoodies']],
  groupPolling,
  layerAssociations: {
    clothes2: { clothes1: 'sameName' },
    hoodie2: { hoodie1: 'sameName' },
  },
});

test('exclusive groups retain DNA positions and layer associations', () => {
  withRandom(0, () => {
    const clothesDna = createDna(groupedLayers, createGroupedConfig({ clothes: 1, hoodies: 0 })).split('-');
    assert.equal(clothesDna.length, groupedLayers.length);
    assert.notEqual(clothesDna[1], 'none:none');
    assert.equal(clothesDna[2], 'none:none');
    assert.equal(clothesDna[3], clothesDna[1]);
    assert.equal(clothesDna[4], 'none:none');

    const hoodiesDna = createDna(groupedLayers, createGroupedConfig({ clothes: 0, hoodies: 1 })).split('-');
    assert.equal(hoodiesDna.length, groupedLayers.length);
    assert.equal(hoodiesDna[1], 'none:none');
    assert.notEqual(hoodiesDna[2], 'none:none');
    assert.equal(hoodiesDna[3], 'none:none');
    assert.equal(hoodiesDna[4], hoodiesDna[2]);
  });
});

test('fractional polling weights select across the full weighted range', () => {
  const layers = [makeLayer('first', ['first.png']), makeLayer('second', ['second.png'])];
  const config = {
    layerGroups: { first: ['first'], second: ['second'] },
    exclusiveGroups: [['first', 'second']],
    groupPolling: { first: 0.5, second: 0.5 },
  };

  withRandom(0.75, () => {
    assert.deepEqual(createDna(layers, config).split('-'), ['none:none', '0:second.png']);
  });
});

test('exclusive groups reject polling configurations without positive weight', () => {
  const layers = [makeLayer('first', ['first.png']), makeLayer('second', ['second.png'])];
  const config = {
    layerGroups: { first: ['first'], second: ['second'] },
    exclusiveGroups: [['first', 'second']],
    groupPolling: { first: 0, second: 0 },
  };

  withRandom(0, () => {
    assert.throws(() => createDna(layers, config), /\[GROUP_POLLING_INVALID\]/);
  });
});

test('exclusive groups require an explicit polling weight for every group', () => {
  const layers = [makeLayer('first', ['first.png']), makeLayer('second', ['second.png'])];
  const config = {
    layerGroups: { first: ['first'], second: ['second'] },
    exclusiveGroups: [['first', 'second']],
    groupPolling: { first: 1 },
  };

  withRandom(0, () => {
    assert.throws(
      () => createDna(layers, config),
      /\[GROUP_POLLING_MISSING\].*missingGroup=second/,
    );
  });
});

test('associations resolve the target layer element by name, not source id', () => {
  const layers = [
    makeLayer('main', ['red.png']),
    makeLayer('linked', ['blue.png', 'red.png']),
  ];

  withRandom(0, () => {
    assert.equal(
      applyLayerAssociations(
        '0:red.png-0:blue.png',
        { layerAssociations: { main: { linked: 'sameName' } } },
        layers,
      ),
      '0:red.png-1:red.png',
    );
  });
});

test('associations fail explicitly when the target layer has no matching element', () => {
  const layers = [makeLayer('main', ['red.png']), makeLayer('linked', ['blue.png'])];

  withRandom(0, () => {
    assert.throws(
      () => applyLayerAssociations(
        '0:red.png-0:blue.png',
        { layerAssociations: { main: { linked: 'sameName' } } },
        layers,
      ),
      /\[LAYER_ASSOCIATION_TARGET_MISSING\].*mainLayer=main.*associatedLayer=linked.*element=red/,
    );
  });
});

test('associations fail explicitly when the configured source layer is absent', () => {
  const layers = [makeLayer('other', ['other.png'])];

  withRandom(0, () => {
    assert.throws(
      () => applyLayerAssociations(
        '0:other.png',
        { layerAssociations: { main: { linked: 'sameName' } } },
        layers,
      ),
      /\[LAYER_ASSOCIATION_SOURCE_LAYER_MISSING\].*mainLayer=main/,
    );
  });
});

test('associations fail explicitly when the configured target layer is absent', () => {
  const layers = [makeLayer('main', ['red.png'])];

  withRandom(0, () => {
    assert.throws(
      () => applyLayerAssociations(
        '0:red.png',
        { layerAssociations: { main: { linked: 'sameName' } } },
        layers,
      ),
      /\[LAYER_ASSOCIATION_TARGET_LAYER_MISSING\].*mainLayer=main.*associatedLayer=linked/,
    );
  });
});
