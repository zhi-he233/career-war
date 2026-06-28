import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROGUELITE_ACTIVE_SHOP_ITEM_IDS,
  ROGUELITE_SHOP_ITEMS,
  ROGUELITE_SHOP_RULES,
  type RogueliteShopItemDraft,
  type RogueliteShopRules,
  type RogueliteShopItemType,
  type RogueliteShopStage,
} from "@career-war/shared";

export interface EditableRogueliteShop {
  rules: RogueliteShopRules;
  items: RogueliteShopItemDraft[];
  activeItemIds: string[];
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "../../..");
const contentDir = path.join(projectRoot, "content", "roguelite");
const shopJsonPath = path.join(contentDir, "shop.json");
const generatedTsPath = path.join(projectRoot, "shared", "src", "data", "rogueliteShop.generated.ts");
const backupDir = path.join(contentDir, "backups");
const MAX_BACKUPS_PER_FILE = 20;

const VALID_ITEM_TYPES = new Set<string>(["heal", "relic", "perk", "skill", "remove", "reroll"]);
const VALID_STAGES = new Set<string>(["early", "mid", "late", "mid_late", "any"]);

const fallbackShop: EditableRogueliteShop = {
  rules: { ...ROGUELITE_SHOP_RULES },
  items: [...ROGUELITE_SHOP_ITEMS],
  activeItemIds: [...ROGUELITE_ACTIVE_SHOP_ITEM_IDS] as string[],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: Record<string, unknown>, key: string, label: string): string {
  const text = typeof value[key] === "string" ? value[key].trim() : "";
  if (!text) throw new Error(`${label} 不能为空`);
  return text;
}

function readNumber(value: Record<string, unknown>, key: string, label: string): number {
  const number = Number(value[key]);
  if (!Number.isFinite(number)) throw new Error(`${label} 必须是数字`);
  return number;
}

function readBoolean(value: Record<string, unknown>, key: string, label: string): boolean {
  if (typeof value[key] !== "boolean") throw new Error(`${label} 必须是布尔值`);
  return value[key];
}

function normalizeShopItem(value: unknown, index: number): RogueliteShopItemDraft {
  if (!isRecord(value)) throw new Error(`第 ${index + 1} 个商品格式不正确`);
  const type = readString(value, "type", "商品 type");
  if (!VALID_ITEM_TYPES.has(type)) throw new Error(`商品 type 不合法：${type}`);
  const stage = readString(value, "stage", "商品 stage");
  if (!VALID_STAGES.has(stage)) throw new Error(`商品 stage 不合法：${stage}`);
  const price = readNumber(value, "price", "商品价格");
  if (price < 0) throw new Error("商品价格不能为负数");
  const item: RogueliteShopItemDraft = {
    id: readString(value, "id", "商品 id"),
    name: readString(value, "name", "商品名称"),
    type: type as RogueliteShopItemType,
    price,
    stage: stage as RogueliteShopStage,
    effect: readString(value, "effect", "商品效果"),
    limit: readString(value, "limit", "商品限制"),
  };
  if (typeof value.notes === "string" && value.notes.trim()) {
    item.notes = value.notes.trim();
  }
  return item;
}

function normalizeShopRules(value: unknown): RogueliteShopRules {
  if (!isRecord(value)) throw new Error("商店规则格式不正确");
  return {
    itemsPerVisit: readNumber(value, "itemsPerVisit", "每次商店商品数"),
    canRefresh: readBoolean(value, "canRefresh", "是否可刷新"),
    refreshPrice: readNumber(value, "refreshPrice", "刷新价格"),
    canBuyHeal: readBoolean(value, "canBuyHeal", "是否可购买回血"),
    canBuySkill: readBoolean(value, "canBuySkill", "是否可购买技能"),
    canBuyGrowth: readBoolean(value, "canBuyGrowth", "是否可购买成长"),
    canRemoveNegative: readBoolean(value, "canRemoveNegative", "是否可移除负面"),
    canBuyRouteInfo: readBoolean(value, "canBuyRouteInfo", "是否可购买路线信息"),
    canBuyTemporaryBoost: readBoolean(value, "canBuyTemporaryBoost", "是否可购买临时增益"),
  };
}

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${label} 重复：${value}`);
    seen.add(value);
  }
}

function normalizeShop(payload: unknown): EditableRogueliteShop {
  if (!isRecord(payload)) throw new Error("商店数据格式不正确");
  if (!Array.isArray(payload.items)) throw new Error("商店商品必须是数组");
  if (!Array.isArray(payload.activeItemIds)) throw new Error("activeItemIds 必须是数组");

  const rules = normalizeShopRules(payload.rules);
  const items = payload.items.map(normalizeShopItem);
  const activeItemIds: string[] = (payload.activeItemIds as unknown[]).filter(
    (id): id is string => typeof id === "string" && id.trim() !== ""
  );

  if (items.length === 0) throw new Error("至少需要一个商品");
  assertUnique(items.map((item) => item.id), "商品 id");

  const itemIds = new Set(items.map((item) => item.id));
  const validActiveIds = activeItemIds.filter((id) => {
    if (!itemIds.has(id)) {
      console.warn(`[rogueliteShopEditor] activeItemIds 中 id「${id}」不在商品列表中，已自动移除`);
      return false;
    }
    return true;
  });

  return { rules, items, activeItemIds: validActiveIds };
}

function toGeneratedSource(shop: EditableRogueliteShop): string {
  return [
    "import type { RogueliteShopItemDraft, RogueliteShopRules } from \"./rogueliteShop.js\";",
    "",
    `export const GENERATED_ROGUELITE_SHOP_RULES = ${JSON.stringify(shop.rules, null, 2)} as const satisfies RogueliteShopRules;`,
    "",
    `export const GENERATED_ROGUELITE_SHOP_ITEMS = ${JSON.stringify(shop.items, null, 2)} as const satisfies readonly RogueliteShopItemDraft[];`,
    "",
    `export const GENERATED_ROGUELITE_ACTIVE_SHOP_ITEM_IDS = ${JSON.stringify(shop.activeItemIds, null, 2)} as const;`,
    "",
  ].join("\n");
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function pruneBackups(parsed: path.ParsedPath): Promise<void> {
  const prefix = `${parsed.name}.`;
  const backups = (await readdir(backupDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith(parsed.ext))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));

  await Promise.all(backups.slice(MAX_BACKUPS_PER_FILE).map((name) => rm(path.join(backupDir, name), { force: true })));
}

async function backupIfExists(filePath: string): Promise<void> {
  try {
    await mkdir(backupDir, { recursive: true });
    const parsed = path.parse(filePath);
    await copyFile(filePath, path.join(backupDir, `${parsed.name}.${timestamp()}${parsed.ext}`));
    await pruneBackups(parsed);
  } catch (error) {
    if ("code" in (error as Record<string, unknown>) && (error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

async function writeAtomic(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(tempPath, content, "utf8");
  await rename(tempPath, filePath);
}

export async function loadEditableRogueliteShop(): Promise<EditableRogueliteShop> {
  try {
    const raw = await readFile(shopJsonPath, "utf8");
    return normalizeShop(JSON.parse(raw));
  } catch (error) {
    if ("code" in (error as Record<string, unknown>) && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallbackShop;
    }
    const message = error instanceof Error ? error.message : "未知错误";
    throw new Error(`读取肉鸽商店数据失败：${message}`);
  }
}

export async function saveEditableRogueliteShop(payload: unknown): Promise<EditableRogueliteShop> {
  const shop = normalizeShop(payload);
  await mkdir(contentDir, { recursive: true });
  await backupIfExists(shopJsonPath);
  await backupIfExists(generatedTsPath);
  await writeAtomic(shopJsonPath, `${JSON.stringify(shop, null, 2)}\n`);
  await writeAtomic(generatedTsPath, toGeneratedSource(shop));
  return shop;
}
