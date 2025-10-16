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

// 如果选择了Solana，集合将从0开始自动编号
// 为male和female分别配置不同的图层
const layerConfigurations = [
  // Female配置
  {
    growEditionSizeTo: 500,
    gender: "female",
    layersOrder: [
      { name: "background", opacity: 1.0 },
      { name: "clothes2", opacity: 1.0 },
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
      
    ],
    // 图层关联配置：指定某些图层必须同时出现，并且选择名称相同的图片
    layerAssociations: {
      // hair1为主图层，hair2和hair3为关联图层
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
      body: {
        nose: "sameName",
        ear: "sameName"
      }
    }
  },
  // Male配置
  {
    growEditionSizeTo: 500,
    gender: "male",
    layersOrder: [
      { name: "background", opacity: 1.0 },
      { name: "hair2", opacity: 1.0 },
      { name: "clothes2", opacity: 1.0 },
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
    ],
    // 图层关联配置：指定某些图层必须同时出现，并且选择名称相同的图片
    layerAssociations: {
      // hair1为主图层，hair2为关联图层
      hair2: {
        hair1: "sameName"
      },
      glassesleft: {
        glassesright: "sameName"
      },
      clothes2: {
        clothes1: "sameName"
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
