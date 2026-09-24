/*
 * 从 app/favicon.ico 派生扩展图标到 public/icon/{16,32,48,128}.png。
 *
 * 为什么需要它：扩展页（chrome-extension://）的标签图标取的是 manifest.icons，
 * 不是页面里的 <link rel="icon">，所以要让新标签页有图标必须提供扩展图标。
 * WXT 的 discoverIcons 只匹配 .png（node_modules/wxt/dist/core/utils/manifest.mjs），
 * 命中后自动写入 manifest.icons。
 *
 * 只做格式转换与缩放，源图就是你自己的 app/favicon.ico。
 * 换掉 favicon 后重跑：npm run ext:icons
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE = "app/favicon.ico";
const TARGET_DIR = "public/icon";
const SIZES = [16, 32, 48, 128];

/**
 * ICO 目录项：宽(1) 高(1) 色数(1) 保留(1) planes(2) bpp(2) 字节数(4) 偏移(4)。
 * 取最大那一层——本文件里只有 256 层是内嵌 PNG，16/32/48 是 BMP/DIB，sharp 读不了。
 */
function largestPngLayer(buf) {
  const count = buf.readUInt16LE(4);
  let best = null;
  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16;
    const width = buf[entry] || 256;
    const bytes = buf.readUInt32LE(entry + 8);
    const offset = buf.readUInt32LE(entry + 12);
    const isPng =
      buf.readUInt32BE(offset) === 0x89504e47 &&
      buf.readUInt32BE(offset + 4) === 0x0d0a1a0a;
    if (isPng && (!best || width > best.width)) {
      best = { width, data: buf.subarray(offset, offset + bytes) };
    }
  }
  return best;
}

const layer = largestPngLayer(fs.readFileSync(path.resolve(process.cwd(), SOURCE)));
if (!layer) {
  console.error(`${SOURCE} 里没有 PNG 层，无法派生图标`);
  process.exit(1);
}
console.log(`源层: ${layer.width}x${layer.width} PNG, ${layer.data.length}B（来自 ${SOURCE}）`);

const outDir = path.resolve(process.cwd(), TARGET_DIR);
fs.mkdirSync(outDir, { recursive: true });

for (const size of SIZES) {
  await sharp(layer.data)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outDir, `${size}.png`));
  console.log(`public/icon/${size}.png`);
}
