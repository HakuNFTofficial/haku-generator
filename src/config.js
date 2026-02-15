const basePath = process.cwd();
const { MODE } = require(`${basePath}/constants/blend_mode.js`);
const { NETWORK } = require(`${basePath}/constants/network.js`);

const network = NETWORK.eth;

// General metadata for Ethereum
const namePrefix = "Haku";
const description = "Remember to replace this description";
const baseUri = "ipfs://QmUdbbshUthth1hk2Nr1YD2GmwpNY61aFG3kShRs9fDJCJ";

const solanaMetadata = {
  symbol: "Haku",
  seller_fee_basis_points: 10000, // Define how much % you want from secondary market sales 1000 = 10%
  external_url: "https://www.hakupump.club/",
  creators: [
    {
      address: "0xd693a84a55fd1cba3e1b5d82571b4cfe1af14510",
      share: 100,
    },
  ],
};

// If Solana is selected, the collection will be automatically numbered starting from 0
// Configure different layers for male and female
const layerConfigurations = [
  // Female configuration
  {
    growEditionSizeTo: 200,
    gender: "female",
    excludeSuffixes: {
      //"*": "_nohoodie",  // Apply to all layers by default
      // _nohoodie need exclude: close2 and close1
      // Different rules can be added for specific layers
      // "specificLayer": "_special"
    },
    layersOrder: [
      { name: "background", opacity: 1.0, bypassDNA: true },
      { name: "clothes2", opacity: 1.0 },
     // { name: "hoodie2", opacity: 1.0 },
      { name: "hair3", opacity: 1.0 },
      { name: "body", opacity: 1.0 },
      { name: "tattoo", opacity: 1.0 },
      { name: "mouth", opacity: 1.0 },
      { name: "eyes", opacity: 1.0 },
      { name: "glassesleft", opacity: 1.0 },
      { name: "nose", opacity: 1.0 },
      { name: "glassesright", opacity: 1.0 },
      { name: "clothes1", opacity: 1.0 },
      { name: "hair2", opacity: 1.0 },
      { name: "ear", opacity: 1.0 },
      { name: "gear", opacity: 1.0 },
      { name: "hair1", opacity: 1.0 },
      //{ name: "hoodie1", opacity: 1.0 },
    ],
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
      // hoodie2: {
      //    hoodie1: "sameName"
      // },
      body: {
        nose: "sameName",
        ear: "sameName"
      }
    }
  },
  // Male configuration
  {
    growEditionSizeTo: 200,
    gender: "male",
    excludeSuffixes: {
      //"*": "_nohoodie",  // Apply to all layers by default 
      // _nohoodie need exclude: close2 and close1
      // Different rules can be added for specific layers
      // "specificLayer": "_special"
    },
    layersOrder: [
      { name: "background", opacity: 1.0, bypassDNA: true },
      //{ name: "hoodie2", opacity: 1.0 },
      { name: "hair3", opacity: 1.0 },
      { name: "clothes2", opacity: 1.0 },
      { name: "body", opacity: 1.0 },
      { name: "tattoo", opacity: 1.0 },
      { name: "mouth", opacity: 1.0 },
      { name: "eyes", opacity: 1.0 },
      { name: "glassesleft", opacity: 1.0 },
      { name: "nose", opacity: 1.0 },
      { name: "hair2", opacity: 1.0 },
      { name: "glassesright", opacity: 1.0 },
      { name: "ear", opacity: 1.0 },
      { name: "clothes1", opacity: 1.0 },
      { name: "gear", opacity: 1.0 },
      { name: "hair1", opacity: 1.0 },
     // { name: "hoodie1", opacity: 1.0 },
    ],
    // Layer association configuration: specify that certain layers must appear together and select images with the same name
    layerAssociations: {
      // hair1 is the main layer, hair2 is the associated layer
      hair3: {
        hair1: "sameName",
        hair2: "sameName"
      },
      glassesleft: {
        glassesright: "sameName"
      },
      clothes2: {
         clothes1: "sameName"
      },
      // hoodie2: {
      //   hoodie1: "sameName"
      // },
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
