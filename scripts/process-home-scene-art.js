const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const root = process.cwd();
const sourceDir = path.join(root, "art-source/home-scene/raw-ai");
const outDir = path.join(root, "client/src/assets/art/home-scene");

const assets = [
  { name: "home_scene_bg", mode: "background" },
  { name: "home_scene_ground", mode: "cutout-full" },
  { name: "home_fog_back", mode: "fog-full" },
  { name: "home_fog_front", mode: "fog-full" },
  { name: "home_node_roguelite", mode: "cutout-trim" },
  { name: "home_node_pvp", mode: "cutout-trim" },
  { name: "home_node_pve", mode: "cutout-trim" },
  { name: "home_campfire", mode: "cutout-trim" },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getCutoutAlpha(r, g, b) {
  const avg = (r + g + b) / 3;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const cyan = Math.max(0, (b + g) / 2 - r);

  if (avg > 216 && chroma < 24) return 0;
  if (avg > 198 && chroma < 14) return clamp((216 - avg) * 12 + chroma * 2, 0, 170);
  if (avg > 206 && cyan > 16) return clamp(cyan * 7, 70, 210);
  return 255;
}

function getFogAlpha(r, g, b) {
  const avg = (r + g + b) / 3;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const cyan = Math.max(0, (b + g) / 2 - r);

  if (avg > 216 && chroma < 24) return 0;
  return clamp(cyan * 5.8 + Math.max(0, 226 - avg) * 1.2, 0, 160);
}

async function makeTransparentAsset(name, mode) {
  const input = path.join(sourceDir, `${name}.png`);
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
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
      const alpha = mode === "fog-full" ? getFogAlpha(r, g, b) : getCutoutAlpha(r, g, b);

      rgba[target] = mode === "fog-full" ? 214 : r;
      rgba[target + 1] = mode === "fog-full" ? 244 : g;
      rgba[target + 2] = mode === "fog-full" ? 246 : b;
      rgba[target + 3] = alpha;

      if (alpha > 18) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  let image = sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });
  let width = info.width;
  let height = info.height;

  if (mode === "cutout-trim" && maxX >= minX && maxY >= minY) {
    const padding = 18;
    const left = clamp(minX - padding, 0, info.width - 1);
    const top = clamp(minY - padding, 0, info.height - 1);
    const right = clamp(maxX + padding, 0, info.width - 1);
    const bottom = clamp(maxY + padding, 0, info.height - 1);
    width = right - left + 1;
    height = bottom - top + 1;
    image = image.extract({ left, top, width, height });
  }

  return { image, width, height };
}

async function processAsset({ name, mode }) {
  const output = path.join(outDir, `${name}.webp`);

  if (mode === "background") {
    const result = await sharp(path.join(sourceDir, `${name}.png`))
      .webp({ quality: 82, effort: 5, smartSubsample: true })
      .toFile(output);
    return { name, width: result.width, height: result.height, size: result.size };
  }

  const { image, width, height } = await makeTransparentAsset(name, mode);
  const result = await image
    .webp({ quality: 86, effort: 5, alphaQuality: 90, smartSubsample: true })
    .toFile(output);
  return { name, width, height, size: result.size };
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  for (const asset of assets) {
    const result = await processAsset(asset);
    console.log(`${result.name}: ${result.width}x${result.height}, ${Math.round(result.size / 1024)}KB`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
