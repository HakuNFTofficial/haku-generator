const basePath = process.cwd();
const { MODE } = require(`${basePath}/constants/blend_mode.js`);
const { NETWORK } = require(`${basePath}/constants/network.js`);

const network = NETWORK.eth;

// General metadata for Ethereum
const namePrefix = "Your Collection";
const description = "Remember to replace this description";
const baseUri = "ipfs://NewUriToReplace";

const solanaMetadata = {
  symbol: "YC",
  seller_fee_basis_points: 1000, // Define how much % you want from secondary market sales 1000 = 10%
  external_url: "https://www.youtube.com/c/hashlipsnft",
  creators: [
    {
      address: "7fXNuer5sbZtaTEPhtJ5g5gNtuyRoKkvxdjEjEnPN4mC",
      share: 100,
    },
  ],
};

// If Solana is selected, the collection will be automatically numbered starting from 0
// Configure different layers for male and female
const layerConfigurations = [
  // Female configuration
  {
    growEditionSizeTo: 500,
    gender: "female",
    layersOrder: [
      { name: "background", opacity: 1.0 },
      { name: "clothes2", opacity: 1.0 },
      { name: "hoodies2", opacity: 1.0 },
      { name: "hair3", opacity: 1.0 },
      { name: "body", opacity: 1.0 },
      { name: "tattoo", opacity: 1.0 },
      { name: "mouth", opacity: 1.0 },
      { name: "eyes", opacity: 1.0 },
      { name: "glassesleft", opacity: 1.0 },
      { name: "nose", opacity: 1.0 },
      { name: "glassesright", opacity: 1.0 },
      { name: "clothes1", opacity: 1.0 },
      { name: "hoodies1", opacity: 1.0 },
      { name: "hair2", opacity: 1.0 },
      { name: "ear", opacity: 1.0 },
      { name: "gear", opacity: 1.0 },
      { name: "hair1", opacity: 1.0 },
      
    ],
    // Layer group configuration: define groups of layers that are related
    layerGroups: {
      clothes: ["clothes1", "clothes2"],
      hoodies: ["hoodies1", "hoodies2"]
    },
    // Group exclusivity configuration: define which groups are mutually exclusive
    exclusiveGroups: [
      ["clothes", "hoodies"]
    ],
    // Group polling configuration: define the ratio for polling between groups
    groupPolling: {
      "clothes": 1,
      "hoodies": 1
    },
    // Layer association configuration: specify that certain layers must appear together and select images with the same name
    layerAssociations: {
      // hair1 is the main layer, hair2 and hair3 are associated layers
      hair3: {
        hair2: "sameName",
        hair1: "sameName"
      },
      glassesleft: {
        glassesright: "sameName"
      },
      clothes2: {
        clothes1: "sameName"
      },
      hoodies2: {
        hoodies1: "sameName"
      },
      body: {
        nose: "sameName",
        ear: "sameName"
      }
    }
  },
  // Male configuration
  {
    growEditionSizeTo: 500,
    gender: "male",
    layersOrder: [
      { name: "background", opacity: 1.0 },
      { name: "hair2", opacity: 1.0 },
      { name: "clothes2", opacity: 1.0 },
      { name: "hoodies2", opacity: 1.0 },
      { name: "body", opacity: 1.0 },
      { name: "tattoo", opacity: 1.0 },
      { name: "mouth", opacity: 1.0 },
      { name: "eyes", opacity: 1.0 },
      { name: "glassesleft", opacity: 1.0 },
      { name: "nose", opacity: 1.0 },
      { name: "glassesright", opacity: 1.0 },
      { name: "ear", opacity: 1.0 },
      { name: "gear", opacity: 1.0 },
      { name: "hair1", opacity: 1.0 },
      { name: "clothes1", opacity: 1.0 },
      { name: "hoodies1", opacity: 1.0 },
    ],
    // Layer group configuration: define groups of layers that are related
    layerGroups: {
      clothes: ["clothes1", "clothes2"],
      hoodies: ["hoodies1", "hoodies2"]
    },
    // Group exclusivity configuration: define which groups are mutually exclusive
    exclusiveGroups: [
      ["clothes", "hoodies"]
    ],
    // Group polling configuration: define the ratio for polling between groups
    groupPolling: {
      "clothes": 1,
      "hoodies": 1
    },
    // Layer association configuration: specify that certain layers must appear together and select images with the same name
    layerAssociations: {
      // hair1 is the main layer, hair2 is the associated layer
      hair2: {
        hair1: "sameName"
      },
      glassesleft: {
        glassesright: "sameName"
      },
      clothes2: {
        clothes1: "sameName"
      },
      hoodies2: {
        hoodies1: "sameName"
      },
      body: {
        nose: "sameName",
        ear: "sameName"
      }
    }
  },
];

const shuffleLayerConfigurations = false;

const debugLogs = false;

const format = {
  width: 512,
  height: 512,
  smoothing: false,
};

const gif = {
  export: false,
  repeat: 0,
  quality: 100,
  delay: 500,
};

const text = {
  only: false,
  color: "#ffffff",
  size: 20,
  xGap: 40,
  yGap: 40,
  align: "left",
  baseline: "top",
  weight: "regular",
  family: "Courier",
  spacer: " => ",
};

const pixelFormat = {
  ratio: 2 / 128,
};

const background = {
  generate: true,
  brightness: "80%",
  static: false,
  default: "#000000",
};

const extraMetadata = {};

const rarityDelimiter = "#";

const uniqueDnaTorrance = 10000;

const preview = {
  thumbPerRow: 5,
  thumbWidth: 50,
  imageRatio: format.height / format.width,
  imageName: "preview.png",
};

const preview_gif = {
  numberOfImages: 5,
  order: "ASC", // ASC, DESC, MIXED
  repeat: 0,
  quality: 100,
  delay: 500,
  imageName: "preview.gif",
};

module.exports = {
  format,
  baseUri,
  description,
  background,
  uniqueDnaTorrance,
  layerConfigurations,
  rarityDelimiter,
  preview,
  shuffleLayerConfigurations,
  debugLogs,
  extraMetadata,
  pixelFormat,
  text,
  namePrefix,
  network,
  solanaMetadata,
  gif,
  preview_gif,
};
