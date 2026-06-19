#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

let sharp;
try {
  sharp = require("sharp");
} catch (error) {
  console.error("缺少图片处理依赖 sharp。请先运行：npm install -D sharp");
  process.exit(1);
}

const ROOT = path.resolve(__dirname, "..");
const RAW_DIR = path.join(ROOT, "art-source", "raw-ai");
const PROCESSED_DIR = path.join(ROOT, "art-source", "processed");
const CLIENT_CHARACTER_DIR = path.join(ROOT, "client", "src", "assets", "art", "characters");
const SUPPORTED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const OUTPUT_SIZE = 128;
const AVATAR_SIZE = 64;
const CONTENT_MAX_SIZE = 112;
const CHARACTER_ID_ALIASES = {
  gunner: "gunslinger",
  bomber: "self_destructor",
  flame_lord: "fire_lord",
  crescent: "crescent_moon",
  zhao_yun: "zhaoZilong",
  assassin_fearless: "fearless_assassin",
  assassin_slash: "execution_assassin"
};

function normalizeCharacterId(fileBaseName) {
  return CHARACTER_ID_ALIASES[fileBaseName] ?? fileBaseName;
}

function isNearWhite(r, g, b) {
  return r >= 238 && g >= 238 && b >= 238 && Math.max(r, g, b) - Math.min(r, g, b) <= 18;
}

function isGreenScreen(r, g, b) {
  return g >= 135 && g - r >= 45 && g - b >= 35;
}

function detectBackground(pixels, width, height) {
  let borderCount = 0;
  let whiteCount = 0;
  let greenCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) continue;
      const offset = (y * width + x) * 4;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      borderCount += 1;
      if (isNearWhite(r, g, b)) whiteCount += 1;
      if (isGreenScreen(r, g, b)) greenCount += 1;
    }
  }

  const whiteRatio = whiteCount / Math.max(borderCount, 1);
  const greenRatio = greenCount / Math.max(borderCount, 1);
  if (whiteRatio >= 0.35) return { kind: "white", confidence: whiteRatio };
  if (greenRatio >= 0.35) return { kind: "green", confidence: greenRatio };
  return { kind: "complex", confidence: Math.max(whiteRatio, greenRatio) };
}

function removeBackground(pixels, backgroundKind) {
  const result = Buffer.from(pixels);
  for (let offset = 0; offset < result.length; offset += 4) {
    const r = result[offset];
    const g = result[offset + 1];
    const b = result[offset + 2];
    const shouldClear = backgroundKind === "white" ? isNearWhite(r, g, b) : backgroundKind === "green" ? isGreenScreen(r, g, b) : false;
    if (shouldClear) result[offset + 3] = 0;
  }
  return result;
}

async function ensureDirs(characterId) {
  await fs.mkdir(path.join(CLIENT_CHARACTER_DIR, characterId), { recursive: true });
  await fs.mkdir(PROCESSED_DIR, { recursive: true });
}

async function renderSprite(inputBuffer, metadata) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const background = detectBackground(data, info.width, info.height);
  const masked = removeBackground(data, background.kind);
  const transparentInput = sharp(masked, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  });

  const trimmedBuffer = await transparentInput
    .trim({
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      threshold: 8
    })
    .png()
    .toBuffer();

  const resizedBuffer = await sharp(trimmedBuffer)
    .resize(CONTENT_MAX_SIZE, CONTENT_MAX_SIZE, {
      fit: "inside",
      kernel: metadata.width && metadata.width <= OUTPUT_SIZE ? "nearest" : "lanczos3"
    })
    .png()
    .toBuffer();

  const resizedMeta = await sharp(resizedBuffer).metadata();
  const left = Math.max(0, Math.floor((OUTPUT_SIZE - (resizedMeta.width ?? CONTENT_MAX_SIZE)) / 2));
  const top = Math.max(0, Math.floor((OUTPUT_SIZE - (resizedMeta.height ?? CONTENT_MAX_SIZE)) / 2));
  const sprite = await sharp({
    create: {
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: resizedBuffer, left, top }])
    .png()
    .toBuffer();

  return {
    sprite,
    needsManualPs: background.kind === "complex",
    background
  };
}

async function processFile(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) return null;

  const sourceId = path.basename(fileName, extension);
  const characterId = normalizeCharacterId(sourceId);
  const inputPath = path.join(RAW_DIR, fileName);
  const outputDir = path.join(CLIENT_CHARACTER_DIR, characterId);
  const spritePath = path.join(outputDir, `${characterId}_sprite.png`);
  const avatarPath = path.join(outputDir, `${characterId}_avatar.png`);
  const processedSpritePath = path.join(PROCESSED_DIR, `${characterId}_sprite.png`);
  const processedAvatarPath = path.join(PROCESSED_DIR, `${characterId}_avatar.png`);

  await ensureDirs(characterId);

  const inputBuffer = await fs.readFile(inputPath);
  const metadata = await sharp(inputBuffer).metadata();
  const { sprite, needsManualPs, background } = await renderSprite(inputBuffer, metadata);
  const avatar = await sharp(sprite)
    .resize(AVATAR_SIZE, AVATAR_SIZE, {
      fit: "contain",
      kernel: "nearest",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  await fs.writeFile(spritePath, sprite);
  await fs.writeFile(avatarPath, avatar);
  await fs.writeFile(processedSpritePath, sprite);
  await fs.writeFile(processedAvatarPath, avatar);

  return {
    source: fileName,
    sourceId,
    characterId,
    spritePath: path.relative(ROOT, spritePath),
    avatarPath: path.relative(ROOT, avatarPath),
    needsManualPs,
    background
  };
}

async function main() {
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.mkdir(PROCESSED_DIR, { recursive: true });
  await fs.mkdir(CLIENT_CHARACTER_DIR, { recursive: true });

  const entries = await fs.readdir(RAW_DIR);
  const results = [];
  for (const entry of entries) {
    const result = await processFile(entry);
    if (result) results.push(result);
  }

  if (results.length === 0) {
    console.log("art-source/raw-ai/ 中未找到 png / jpg / jpeg 图片。");
    return;
  }

  console.log("角色美术处理完成：");
  for (const item of results) {
    console.log(`- ${item.source} -> ${item.characterId}`);
    console.log(`  sprite: ${item.spritePath}`);
    console.log(`  avatar: ${item.avatarPath}`);
    if (item.needsManualPs) {
      console.log(`  需要人工 PS 修图：边缘背景不是纯白/近白或绿幕，自动扣图可信度 ${item.background.confidence.toFixed(2)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
