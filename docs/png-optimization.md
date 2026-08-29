# PNG 无损压缩与 IPFS 发布流程

本项目使用 OxiPNG 对 `build/images` 内已经生成的 PNG 做第二次无损优化。它不会缩放图片、改变文件名、修改 JSON、改变 NFT 属性，也不会使用有损的 `--alpha` 优化。

## 一次性安装

macOS 推荐使用 Homebrew：

```bash
brew install oxipng
oxipng --version
```

也可以通过 Rust 安装：

```bash
cargo install oxipng
oxipng --version
```

脚本使用并测试 OxiPNG 9.x 及更高版本的 CLI 参数。如果系统找不到 `oxipng`，命令会明确失败并输出 `OXIPNG_NOT_FOUND`，不会偷偷改用其他压缩器。

## 生成和压缩

分两步运行，方便只重新执行压缩：

```bash
npm run generate
npm run optimize
```

也可以使用组合命令：

```bash
npm run generate:optimized
```

组合命令内部使用 `&&`。只有图片生成成功后才会开始优化。

`npm run optimize` 会：

1. 只处理项目根目录下 `build/images` 中的 PNG 文件；
2. 使用 `oxipng -o 4 --strip safe`；
3. 检查优化前后的文件名、数量和 PNG 可读性；
4. 输出一行 JSON，包含图片数、优化前后字节数、节省比例、耗时和 OxiPNG 版本。

Canvas 生成 PNG 时本来就启用了无损压缩，因此第二次优化的收益可能只有几个百分点。最终效果取决于画面的颜色数量、纹理和噪点，不应只根据 1,000×1,000 或 3,000×3,000 的像素数估算。

## 正确的 IPFS 顺序

必须遵守下面的顺序：

```text
生成图片 → 无损优化 → 验证 → 上传 images → 更新 JSON 图片地址 → 上传 json → 设置合约 metadata URI
```

虽然优化前后显示出来的像素相同，但 PNG 文件字节会变化，所以 IPFS CID 也可能变化。不要先上传 IPFS，再回来压缩本地图片。

常规的双目录上传流程如下：

1. 上传 `build/images`，得到 **Images folder CID**。
2. 把 [src/config.js](../src/config.js) 中的 `baseUri` 改成 `ipfs://<Images folder CID>`。
3. 运行 `npm run update_info`，把每个 JSON 的 `image` 字段更新为 `ipfs://<Images folder CID>/<edition>.png`。
4. 上传 `build/json`，得到 **JSON folder CID**。
5. 合约的 `baseURI`/`tokenURI` 应指向 JSON folder CID；最终是否需要文件扩展名和末尾 `/`，必须按合约的 `tokenURI()` 拼接逻辑确认。

三个 CID 的用途：

- **Images folder CID**：写入 JSON 的 `image` 字段，让市场显示图片。
- **JSON folder CID**：提供 NFT 元数据，通常是合约需要保存或返回的地址。
- **Root directory CID**：只有把包含 `images/` 和 `json/` 的父目录整体上传时才使用；这时路径必须包含子目录，例如 `ipfs://<Root CID>/images/1.png` 和 `ipfs://<Root CID>/json/1.json`。不要把 Root CID 直接当作前两个 CID 的替代品。

区块链上通常保存的是元数据 URI 或它的基础路径，而不是把完整 JSON 内容直接存进合约。IPFS 内容寻址保证同一个 CID 对应的文件内容不可被原地修改；内容变化会产生新的 CID。

## 错误与恢复

失败时脚本以非零状态退出，并向 stderr 输出一行 JSON。主要错误码：

- `IMAGES_DIR_MISSING`：`build/images` 不存在；
- `NO_PNG_FILES`：目录里没有 PNG；
- `OXIPNG_NOT_FOUND`：没有安装 OxiPNG 或不在 `PATH`；
- `OXIPNG_FAILED`：OxiPNG 返回失败，记录里会包含退出码和 stderr；
- `OUTPUT_COUNT_MISMATCH`：优化前后的 PNG 文件名或数量不同；
- `OUTPUT_INVALID_PNG`：某个输出无法解码为 PNG。

OxiPNG 原地处理文件。中途失败后可以修复报错并重新运行 `npm run optimize`；已经优化完成的文件仍然是有效输入。
