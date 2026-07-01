const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const root = process.cwd();
const input = path.join(root, "art-source/homepage/raw-ai/ui汇总.png");
const tabletopDir = path.join(root, "art-source/homepage");
const outDir = path.join(root, "client/src/assets/art/homepage");

const crops = [
  { id: "tavern_table", file: "tavern_table.webp", x: 4, y: 3, w: 526, h: 758, kind: "opaque", quality: 88 },

  { id: "card_rogue", file: "card_rogue.png", x: 543, y: 90, w: 188, h: 153, kind: "cutout" },
  { id: "card_versus", file: "card_versus.png", x: 746, y: 90, w: 188, h: 153, kind: "cutout" },
  { id: "card_training", file: "card_training.png", x: 947, y: 90, w: 188, h: 153, kind: "cutout" },

  { id: "dice_1", file: "dice_1.png", x: 549, y: 373, w: 81, h: 90, kind: "cutout", target: 128 },
  { id: "dice_2", file: "dice_2.png", x: 650, y: 373, w: 81, h: 90, kind: "cutout", target: 128 },
  { id: "dice_3", file: "dice_3.png", x: 751, y: 373, w: 81, h: 90, kind: "cutout", target: 128 },
  { id: "dice_4", file: "dice_4.png", x: 852, y: 373, w: 81, h: 90, kind: "cutout", target: 128 },
  { id: "dice_5", file: "dice_5.png", x: 953, y: 373, w: 81, h: 90, kind: "cutout", target: 128 },
  { id: "dice_6", file: "dice_6.png", x: 1053, y: 373, w: 81, h: 90, kind: "cutout", target: 128 },

  { id: "prop_candle", file: "prop_candle.png", x: 555, y: 604, w: 76, h: 104, kind: "cutout" },
  { id: "prop_tankard", file: "prop_tankard.png", x: 648, y: 610, w: 84, h: 99, kind: "cutout" },
  { id: "prop_bulletin_board", file: "prop_bulletin_board.png", x: 759, y: 603, w: 92, h: 107, kind: "cutout" },
  { id: "prop_coin_pouch", file: "prop_coin_pouch.png", x: 919, y: 622, w: 74, h: 87, kind: "cutout" },
  { id: "prop_wooden_sign", file: "prop_wooden_sign.png", x: 1014, y: 605, w: 93, h: 104, kind: "cutout" },

  { id: "node_battle", file: "node_battle.png", x: 51, y: 813, w: 104, h: 104, kind: "cutout", target: 64 },
  { id: "node_elite", file: "node_elite.png", x: 184, y: 813, w: 104, h: 104, kind: "cutout", target: 64 },
  { id: "node_boss", file: "node_boss.png", x: 318, y: 813, w: 104, h: 104, kind: "cutout", target: 64 },
  { id: "node_event", file: "node_event.png", x: 452, y: 813, w: 104, h: 104, kind: "cutout", target: 64 },
  { id: "node_shop", file: "node_shop.png", x: 586, y: 813, w: 104, h: 104, kind: "cutout", target: 64 },
  { id: "node_rest", file: "node_rest.png", x: 719, y: 813, w: 104, h: 104, kind: "cutout", target: 64 },
  { id: "node_reward", file: "node_reward.png", x: 855, y: 813, w: 104, h: 104, kind: "cutout", target: 64 },
  { id: "node_fate", file: "node_fate.png", x: 990, y: 813, w: 104, h: 104, kind: "cutout", target: 64 },

  { id: "roguelite_object", file: "roguelite_object.png", x: 34, y: 1021, w: 360, h: 300, kind: "cutout", target: 320 },
  { id: "ring_gold", file: "ring_gold.png", x: 473, y: 1111, w: 183, h: 181, kind: "glow", target: 160 },
  { id: "ring_blue", file: "ring_blue.png", x: 701, y: 1111, w: 183, h: 181, kind: "glow", target: 160 },
  { id: "ring_green", file: "ring_green.png", x: 929, y: 1111, w: 183, h: 181, kind: "glow", target: 160 },
];

const tabletopAssets = [
  {
    id: "tabletop_table",
    source: "空白桌面.png",
    file: "tabletop_table.webp",
    kind: "opaque",
    width: 760,
    quality: 86,
  },
  { id: "tabletop_dice", source: "骰子.png", file: "tabletop_dice.png", kind: "cutout", target: 300 },
  { id: "tabletop_card", source: "卡片.png", file: "tabletop_card.png", kind: "cutout", target: 320 },
  { id: "tabletop_mug", source: "杯子.png", file: "tabletop_mug.png", kind: "cutout", target: 240 },
  { id: "tabletop_candle", source: "蜡烛.png", file: "tabletop_candle.png", kind: "cutout", target: 240 },
  { id: "tabletop_rulebook", source: "规则书.png", file: "tabletop_rulebook.png", kind: "cutout", target: 260 },
  { id: "tabletop_coin_pouch", source: "钱袋.png", file: "tabletop_coin_pouch.png", kind: "cutout", target: 220 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function alphaForCheckerboard(r, g, b) {
  const avg = (r + g + b) / 3;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);

  if (avg > 245 && chroma < 10) return 0;
  if (avg > 226 && chroma < 12) return 0;
  if (avg > 214 && chroma < 8) return clamp((226 - avg) * 14, 0, 160);
  return 255;
}

function alphaForGlowCheckerboard(r, g, b) {
  const avg = (r + g + b) / 3;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);

  if (avg > 232 && chroma < 34) return 0;
  if (avg > 206 && chroma < 18) return 0;
  return 255;
}

function defringeColor(r, g, b, alpha) {
  if (alpha >= 245) return [r, g, b];

  const avg = (r + g + b) / 3;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);

  if (avg < 150 || chroma > 55) return [r, g, b];

  const edge = (245 - alpha) / 245;
  const strength = clamp(edge * 0.70, 0, 0.70);
  const target = { r: 128, g: 88, b: 44 };

  return [
    Math.round(r * (1 - strength) + target.r * strength),
    Math.round(g * (1 - strength) + target.g * strength),
    Math.round(b * (1 - strength) + target.b * strength),
  ];
}

async function normalizeToSquare(image, width, height, target) {
  if (!target) return { image, width, height };

  const scale = Math.min(target / width, target / height);
  const resizedWidth = Math.max(1, Math.round(width * scale));
  const resizedHeight = Math.max(1, Math.round(height * scale));
  const resized = await image
    .resize(resizedWidth, resizedHeight, { kernel: sharp.kernel.nearest, fit: "fill" })
    .png()
    .toBuffer();

  const left = Math.floor((target - resizedWidth) / 2);
  const top = Math.floor((target - resizedHeight) / 2);
  const normalized = sharp({
    create: {
      width: target,
      height: target,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: resized, left, top }]);

  return { image: normalized, width: target, height: target };
}

async function makeCutout(buffer, width, height, mode, target) {
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const source = (y * info.width + x) * info.channels;
      const target = (y * info.width + x) * 4;
      const r = data[source];
      const g = data[source + 1];
      const b = data[source + 2];
      const alpha = mode === "glow" ? alphaForGlowCheckerboard(r, g, b) : alphaForCheckerboard(r, g, b);
      const [cleanR, cleanG, cleanB] = mode === "glow" ? [r, g, b] : defringeColor(r, g, b, alpha);

      rgba[target] = cleanR;
      rgba[target + 1] = cleanG;
      rgba[target + 2] = cleanB;
      rgba[target + 3] = alpha;

      if (alpha > 12) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  let image = sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });
  let finalWidth = width;
  let finalHeight = height;

  if (maxX >= minX && maxY >= minY) {
    const padding = 3;
    const left = clamp(minX - padding, 0, info.width - 1);
    const top = clamp(minY - padding, 0, info.height - 1);
    const right = clamp(maxX + padding, 0, info.width - 1);
    const bottom = clamp(maxY + padding, 0, info.height - 1);
    finalWidth = right - left + 1;
    finalHeight = bottom - top + 1;
    image = image.extract({ left, top, width: finalWidth, height: finalHeight });
  }

  return normalizeToSquare(image, finalWidth, finalHeight, target);
}

async function processCrop(crop) {
  const extracted = await sharp(input)
    .extract({ left: crop.x, top: crop.y, width: crop.w, height: crop.h })
    .toBuffer();
  const output = path.join(outDir, crop.file);

  if (crop.kind === "opaque") {
    const result = await sharp(extracted)
      .webp({ quality: crop.quality ?? 86, effort: 5, smartSubsample: true })
      .toFile(output);
    return { id: crop.id, file: crop.file, width: result.width, height: result.height, bytes: result.size };
  }

  const cutout = await makeCutout(extracted, crop.w, crop.h, crop.kind, crop.target);
  const result = await cutout.image.png({ compressionLevel: 9, palette: false }).toFile(output);
  return { id: crop.id, file: crop.file, width: cutout.width, height: cutout.height, bytes: result.size };
}

async function processTabletopAsset(asset) {
  const source = path.join(tabletopDir, asset.source);
  const output = path.join(outDir, asset.file);

  if (asset.kind === "opaque") {
    const result = await sharp(source)
      .resize({ width: asset.width, withoutEnlargement: true })
      .webp({ quality: asset.quality ?? 86, effort: 5, smartSubsample: true })
      .toFile(output);
    return { id: asset.id, file: asset.file, width: result.width, height: result.height, bytes: result.size };
  }

  const { data, info } = await sharp(source).toBuffer({ resolveWithObject: true });
  const cutout = await makeCutout(data, info.width, info.height, asset.kind, asset.target);
  const result = await cutout.image.png({ compressionLevel: 9, palette: false }).toFile(output);
  return { id: asset.id, file: asset.file, width: cutout.width, height: cutout.height, bytes: result.size };
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const manifest = {};

  for (const crop of crops) {
    const result = await processCrop(crop);
    manifest[result.id] = {
      file: result.file,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
    console.log(`${result.id}: ${result.width}x${result.height}, ${Math.round(result.bytes / 1024)}KB`);
  }

  for (const asset of tabletopAssets) {
    try {
      await fs.access(path.join(tabletopDir, asset.source));
    } catch {
      continue;
    }

    const result = await processTabletopAsset(asset);
    manifest[result.id] = {
      file: result.file,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
    console.log(`${result.id}: ${result.width}x${result.height}, ${Math.round(result.bytes / 1024)}KB`);
  }

  await fs.writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
