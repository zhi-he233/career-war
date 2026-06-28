import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROGUELITE_REST_SITE_ACTIONS,
  type RogueliteRestSiteActionDraft,
  type RogueliteRestSiteActionId,
} from "@career-war/shared";

export interface EditableRogueliteRestSites {
  actions: RogueliteRestSiteActionDraft[];
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "../../..");
const contentDir = path.join(projectRoot, "content", "roguelite");
const restSitesJsonPath = path.join(contentDir, "restSites.json");
const generatedTsPath = path.join(projectRoot, "shared", "src", "data", "rogueliteRestSites.generated.ts");
const backupDir = path.join(contentDir, "backups");
const MAX_BACKUPS_PER_FILE = 20;

const VALID_ACTION_IDS = new Set<string>([
  "campfire_heal",
  "weapon_drill",
  "shield_repair",
  "blood_meditation",
  "dice_prayer",
  "sharpen_first_hit",
  "reinforce_armor",
  "sell_scraps",
  "skip_for_trophy",
  "skill_focus",
]);

const fallbackRestSites: EditableRogueliteRestSites = {
  actions: [...ROGUELITE_REST_SITE_ACTIONS],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: Record<string, unknown>, key: string, label: string): string {
  const text = typeof value[key] === "string" ? value[key].trim() : "";
  if (!text) throw new Error(`${label} 不能为空`);
  return text;
}

function normalizeAction(value: unknown, index: number): RogueliteRestSiteActionDraft {
  if (!isRecord(value)) throw new Error(`第 ${index + 1} 个休息站点操作格式不正确`);
  const id = readString(value, "id", "操作 id");
  if (!VALID_ACTION_IDS.has(id)) throw new Error(`休息站点操作 id 不在预设内：${id}`);
  const action: RogueliteRestSiteActionDraft = {
    id: id as RogueliteRestSiteActionId,
    name: readString(value, "name", "操作名称"),
    effect: readString(value, "effect", "操作效果"),
    limit: readString(value, "limit", "操作限制"),
  };
  if (typeof value.notes === "string" && value.notes.trim()) {
    action.notes = value.notes.trim();
  }
  return action;
}

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${label} 重复：${value}`);
    seen.add(value);
  }
}

function normalizeRestSites(payload: unknown): EditableRogueliteRestSites {
  if (!isRecord(payload)) throw new Error("休息站点数据格式不正确");
  if (!Array.isArray(payload.actions)) throw new Error("休息站点操作必须是数组");

  const actions = payload.actions.map(normalizeAction);

  if (actions.length === 0) throw new Error("至少需要一个休息站点操作");
  assertUnique(actions.map((action) => action.id), "休息站点操作 id");

  return { actions };
}

function toGeneratedSource(restSites: EditableRogueliteRestSites): string {
  return [
    "import type { RogueliteRestSiteActionDraft } from \"./rogueliteRestSites.js\";",
    "",
    `export const GENERATED_ROGUELITE_REST_SITE_ACTIONS = ${JSON.stringify(restSites.actions, null, 2)} as const satisfies readonly RogueliteRestSiteActionDraft[];`,
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

export async function loadEditableRogueliteRestSites(): Promise<EditableRogueliteRestSites> {
  try {
    const raw = await readFile(restSitesJsonPath, "utf8");
    return normalizeRestSites(JSON.parse(raw));
  } catch (error) {
    if ("code" in (error as Record<string, unknown>) && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallbackRestSites;
    }
    const message = error instanceof Error ? error.message : "未知错误";
    throw new Error(`读取肉鸽休息站点数据失败：${message}`);
  }
}

export async function saveEditableRogueliteRestSites(payload: unknown): Promise<EditableRogueliteRestSites> {
  const restSites = normalizeRestSites(payload);
  await mkdir(contentDir, { recursive: true });
  await backupIfExists(restSitesJsonPath);
  await backupIfExists(generatedTsPath);
  await writeAtomic(restSitesJsonPath, `${JSON.stringify(restSites, null, 2)}\n`);
  await writeAtomic(generatedTsPath, toGeneratedSource(restSites));
  return restSites;
}
