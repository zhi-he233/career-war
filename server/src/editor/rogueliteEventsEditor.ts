import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROGUELITE_EVENTS,
  type RogueliteEventChoiceDraft,
  type RogueliteEventDraft,
  type RogueliteEventOutcomeDraft,
} from "@career-war/shared";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "../../..");
const contentDir = path.join(projectRoot, "content", "roguelite");
const eventsJsonPath = path.join(contentDir, "events.json");
const generatedTsPath = path.join(projectRoot, "shared", "src", "data", "rogueliteEvents.generated.ts");
const backupDir = path.join(contentDir, "backups");

const VALID_RARITIES = new Set(["common", "uncommon", "rare"]);
const VALID_STAGES = new Set(["early", "mid", "late", "any"]);
const VALID_OUTCOME_TYPES = new Set([
  "heal",
  "lose_hp",
  "gain_gold",
  "lose_gold",
  "gain_start_shield_next_battle",
  "gain_start_damage_next_battle",
  "reward_choice",
  "start_battle",
  "todo",
]);
const VALID_REWARD_POOLS = new Set(["growth", "character_skill", "boss_ability", "rare"]);
const MAX_BACKUPS_PER_FILE = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeOutcome(value: unknown): RogueliteEventOutcomeDraft {
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new Error("事件效果配置格式不正确");
  }
  const type = value.type.trim();
  if (!VALID_OUTCOME_TYPES.has(type)) {
    throw new Error(`事件效果类型不合法：${type}`);
  }

  const result: RogueliteEventOutcomeDraft = {
    type: type as RogueliteEventOutcomeDraft["type"],
  };

  if (typeof value.value === "number" && Number.isFinite(value.value)) result.value = value.value;
  if (typeof value.rewardPool === "string" && VALID_REWARD_POOLS.has(value.rewardPool)) {
    result.rewardPool = value.rewardPool as RogueliteEventOutcomeDraft["rewardPool"];
  }
  if (typeof value.enemyId === "string" && value.enemyId.trim()) result.enemyId = value.enemyId.trim();
  if (typeof value.note === "string" && value.note.trim()) result.note = value.note.trim();

  if (["heal", "lose_hp", "gain_gold", "lose_gold", "gain_start_shield_next_battle", "gain_start_damage_next_battle"].includes(type)) {
    if (typeof result.value !== "number" || result.value <= 0) {
      throw new Error(`效果 ${type} 必须填写大于 0 的数值`);
    }
  }
  if (type === "reward_choice" && !result.rewardPool) {
    throw new Error("奖励三选一必须选择奖励池");
  }
  if (type === "start_battle" && !result.enemyId) {
    throw new Error("进入战斗必须选择战斗对象");
  }
  return result;
}

function outcomeSummary(outcome: RogueliteEventOutcomeDraft): string {
  const value = Math.max(0, Math.floor(outcome.value ?? 0));
  if (outcome.type === "heal") return `回复 ${value} 生命`;
  if (outcome.type === "lose_hp") return `失去 ${value} 生命`;
  if (outcome.type === "gain_gold") return `获得 ${value} 金币`;
  if (outcome.type === "lose_gold") return `失去 ${value} 金币`;
  if (outcome.type === "gain_start_shield_next_battle") return `下一场战斗开始获得 ${value} 护盾`;
  if (outcome.type === "gain_start_damage_next_battle") return `下一场战斗开始获得 ${value} 伤害加成`;
  if (outcome.type === "reward_choice") {
    const poolLabel: Record<string, string> = {
      growth: "普通成长池",
      character_skill: "职业技能池",
      boss_ability: "Boss 能力池",
      rare: "稀有奖励池",
    };
    return `从${poolLabel[outcome.rewardPool ?? "growth"] ?? "普通成长池"}三选一`;
  }
  if (outcome.type === "start_battle") return `进入战斗：${outcome.enemyId ?? "未选择对象"}`;
  return outcome.note ?? "暂未实现效果";
}

function outcomesSummary(outcomes: readonly RogueliteEventOutcomeDraft[] | undefined, fallback: string, emptyText: string): string {
  if (outcomes && outcomes.length > 0) return outcomes.map(outcomeSummary).join("；");
  return fallback || emptyText;
}

function normalizeChoice(value: unknown, index: number): RogueliteEventChoiceDraft {
  if (!isRecord(value)) {
    throw new Error(`第 ${index + 1} 个选项格式不正确`);
  }
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const rawEffect = typeof value.effect === "string" ? value.effect.trim() : "";
  const rawCost = typeof value.cost === "string" ? value.cost.trim() : "";
  const effects = Array.isArray(value.effects) && value.effects.length > 0 ? value.effects.map(normalizeOutcome) : undefined;
  const costs = Array.isArray(value.costs) && value.costs.length > 0 ? value.costs.map(normalizeOutcome) : undefined;
  const effect = outcomesSummary(effects, rawEffect, "无效果");
  const cost = outcomesSummary(costs, rawCost, "无代价");

  if (!label) {
    throw new Error(`第 ${index + 1} 个选项有空字段`);
  }

  const result: RogueliteEventChoiceDraft = {
    label,
    effect,
    cost,
  };

  if (effects) result.effects = effects;
  if (costs) result.costs = costs;

  return result;
}

function normalizeEvent(value: unknown, index: number): RogueliteEventDraft {
  if (!isRecord(value)) {
    throw new Error(`第 ${index + 1} 条事件格式不正确`);
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const rarity = typeof value.rarity === "string" ? value.rarity.trim() : "";
  const stage = typeof value.stage === "string" ? value.stage.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const notes = typeof value.notes === "string" ? value.notes.trim() : undefined;
  const rawChoices = Array.isArray(value.choices) ? value.choices : [];

  if (!id || !name || !description) {
    throw new Error(`第 ${index + 1} 条事件有空字段`);
  }
  if (!VALID_RARITIES.has(rarity)) {
    throw new Error(`事件 ${id} 的稀有度不合法`);
  }
  if (!VALID_STAGES.has(stage)) {
    throw new Error(`事件 ${id} 的阶段不合法`);
  }
  if (rawChoices.length !== 2) {
    throw new Error(`事件 ${id} 必须正好有 2 个选项`);
  }

  return {
    id,
    name,
    rarity: rarity as RogueliteEventDraft["rarity"],
    stage: stage as RogueliteEventDraft["stage"],
    description,
    choices: rawChoices.map(normalizeChoice),
    ...(notes ? { notes } : {}),
  };
}

function validateEvents(payload: unknown): RogueliteEventDraft[] {
  if (!Array.isArray(payload)) {
    throw new Error("事件数据必须是数组");
  }
  const events = payload.map(normalizeEvent);
  const idSet = new Set<string>();
  for (const event of events) {
    if (idSet.has(event.id)) {
      throw new Error(`事件 id 重复：${event.id}`);
    }
    idSet.add(event.id);
  }
  return events;
}

function toGeneratedSource(events: readonly RogueliteEventDraft[]): string {
  return [
    "import type { RogueliteEventDraft } from \"./rogueliteEvents.js\";",
    "",
    `export const GENERATED_ROGUELITE_EVENTS = ${JSON.stringify(events, null, 2)} as const satisfies readonly RogueliteEventDraft[];`,
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

export async function loadEditableRogueliteEvents(): Promise<readonly RogueliteEventDraft[]> {
  try {
    const raw = await readFile(eventsJsonPath, "utf8");
    return validateEvents(JSON.parse(raw));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if ("code" in (error as Record<string, unknown>) && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return ROGUELITE_EVENTS;
    }
    throw new Error(`读取肉鸽事件数据失败：${message || "未知错误"}`);
  }
}

export async function saveEditableRogueliteEvents(payload: unknown): Promise<readonly RogueliteEventDraft[]> {
  const events = validateEvents(payload);
  await mkdir(contentDir, { recursive: true });
  await backupIfExists(eventsJsonPath);
  await backupIfExists(generatedTsPath);
  await writeAtomic(eventsJsonPath, `${JSON.stringify(events, null, 2)}\n`);
  await writeAtomic(generatedTsPath, toGeneratedSource(events));
  return events;
}
