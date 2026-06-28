import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROGUELITE_BOSS_ABILITY_REWARDS,
  ROGUELITE_BOSSES,
  ROGUELITE_CHARACTER_SKILL_REWARDS,
  ROGUELITE_ENEMIES,
  ROGUELITE_GROWTH_REWARDS,
  ROGUELITE_STARTER_REWARDS,
  type RogueliteBossBalance,
  type RogueliteEnemyBalance,
  type RogueliteRewardDraft,
} from "@career-war/shared";

export interface EditableRogueliteBalance {
  enemies: RogueliteEnemyBalance[];
  bosses: RogueliteBossBalance[];
  rewards: {
    growth: RogueliteRewardDraft[];
    characterSkill: RogueliteRewardDraft[];
    bossAbility: RogueliteRewardDraft[];
    starter: RogueliteRewardDraft[];
  };
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "../../..");
const contentDir = path.join(projectRoot, "content", "roguelite");
const balanceJsonPath = path.join(contentDir, "balance.json");
const generatedTsPath = path.join(projectRoot, "shared", "src", "data", "rogueliteBalance.generated.ts");
const backupDir = path.join(contentDir, "backups");
const MAX_BACKUPS_PER_FILE = 20;
const VALID_REWARD_TYPES = new Set([
  "heavy_punch_training",
  "iron_body",
  "breathing_recovery",
  "blood_punch",
  "battle_instinct",
  "guard_training",
  "vitality_boost",
  "shield_wall",
  "first_strike",
  "low_hp_armor",
  "kill_heal",
  "drink_blood",
  "comeback",
  "low_roll_defense",
  "shield_strike",
  "shield_overload",
  "sturdy_bulwark",
  "fate_tokens",
  "low_roll_charge",
  "desperate_reroll",
  "lucky_floor",
  "gunner_triple_shot",
  "vampire_skill",
  "zhaoyun_pierce",
  "flame_lord_mark",
  "berserker_blood",
  "vampire_instinct",
  "dragon_courage",
  "starter_heavy_punch",
  "starter_blood_punch",
  "starter_iron_wall",
  "starter_recovery",
]);
const VALID_REWARD_TAGS = new Set(["shield", "dice", "low_hp", "burst", "heal", "armor", "status"]);
const VALID_ENEMY_SKILLS = new Set([
  "无特殊机制",
  "赌徒：投 1 自伤 1，投 6 伤害 +2",
  "破盾：攻击护盾时额外 +2 伤害",
  "穿甲：攻击无视 1 点护甲",
  "铁皮：护甲 +1",
  "整备：每回合获得 2 护盾",
  "狂暴：低于半血时伤害 +3",
  "收割：目标低于 40% 生命时伤害 +2",
  "穿甲：无视 1 点护甲",
  "破势：自身低于半血时无视 2 点护甲",
]);
const VALID_BOSS_SKILLS = new Set([
  "蓄力：投 1/2 获得 1 层蓄力",
  "重拳：攻击时每层蓄力 +3 伤害并清空",
  "狂暴：低于半血时伤害 +2",
  "嗜血：造成生命伤害后回复 2",
  "血盾：投到 3 时获得 4 护盾",
  "血祭：低于 40% 生命时一次性回复 5 并获得 3 护盾",
  "铁壁：护甲 +1",
  "架盾：投 1/2 获得 5 护盾并使本次受伤 -2",
  "盾反：受到生命伤害后反击 2",
  "神怒：攻击附加已损失生命值",
  "濒死：进入 15/10/5/1 血阈值",
  "终击：死亡前完成最后一击",
  "洗牌：投 1-3 时重投一次",
  "抽税：玩家投 6 时自身获得 3 护盾",
  "梭哈：低于 30% 生命时伤害 +3",
]);

const fallbackBalance: EditableRogueliteBalance = {
  enemies: [...ROGUELITE_ENEMIES],
  bosses: [...ROGUELITE_BOSSES],
  rewards: {
    growth: [...ROGUELITE_GROWTH_REWARDS],
    characterSkill: [...ROGUELITE_CHARACTER_SKILL_REWARDS],
    bossAbility: [...ROGUELITE_BOSS_ABILITY_REWARDS],
    starter: [...ROGUELITE_STARTER_REWARDS],
  },
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

function readOptionalNumber(value: Record<string, unknown>, key: string): number | undefined {
  if (value[key] === undefined || value[key] === null || value[key] === "") return undefined;
  const number = Number(value[key]);
  return Number.isFinite(number) ? number : undefined;
}

function readStringList(value: Record<string, unknown>, key: string): string[] {
  if (Array.isArray(value[key])) {
    return value[key].filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value[key] === "string") {
    return value[key].split("\n").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeReward(value: unknown, index: number): RogueliteRewardDraft {
  if (!isRecord(value)) throw new Error(`第 ${index + 1} 个奖励格式不正确`);
  const type = readString(value, "type", "奖励 type");
  if (!VALID_REWARD_TYPES.has(type)) throw new Error(`奖励 type 不在可选规则内：${type}`);
  const reward: RogueliteRewardDraft = {
    name: readString(value, "name", "奖励名称"),
    description: readString(value, "description", "奖励说明"),
    type: type as RogueliteRewardDraft["type"],
    value: readNumber(value, "value", "奖励数值"),
  };
  if (typeof value.tag === "string" && value.tag.trim()) {
    const tag = value.tag.trim();
    if (!VALID_REWARD_TAGS.has(tag)) throw new Error(`奖励 tag 不在可选标签内：${tag}`);
    reward.tag = tag as RogueliteRewardDraft["tag"];
  }
  const maxStacks = readOptionalNumber(value, "maxStacks");
  if (maxStacks !== undefined) reward.maxStacks = maxStacks;
  return reward;
}

function normalizeEnemy(value: unknown, index: number): RogueliteEnemyBalance {
  if (!isRecord(value)) throw new Error(`第 ${index + 1} 个敌人格式不正确`);
  const skills = readStringList(value, "skills");
  const invalidSkill = skills.find((skill) => !VALID_ENEMY_SKILLS.has(skill));
  if (invalidSkill) throw new Error(`敌人机制不在预设内：${invalidSkill}`);
  return {
    id: readString(value, "id", "敌人 id") as RogueliteEnemyBalance["id"],
    name: readString(value, "name", "敌人名称"),
    enemyTemplateId: readString(value, "enemyTemplateId", "敌人模板 id"),
    displayName: readString(value, "displayName", "显示名"),
    enemyKind: readString(value, "enemyKind", "敌人类型") as RogueliteEnemyBalance["enemyKind"],
    spriteKey: typeof value.spriteKey === "string" ? value.spriteKey.trim() : undefined,
    portraitKey: typeof value.portraitKey === "string" ? value.portraitKey.trim() : undefined,
    baseCharacterId: typeof value.baseCharacterId === "string" ? value.baseCharacterId.trim() : undefined,
    stageType: readString(value, "stageType", "关卡类型") as RogueliteEnemyBalance["stageType"],
    hpBonus: readNumber(value, "hpBonus", "生命修正"),
    shieldBonus: readNumber(value, "shieldBonus", "护盾修正"),
    damageBonus: readNumber(value, "damageBonus", "伤害修正"),
    skills,
    description: readString(value, "description", "敌人说明"),
  };
}

function normalizeBoss(value: unknown, index: number): RogueliteBossBalance {
  if (!isRecord(value)) throw new Error(`第 ${index + 1} 个 Boss 格式不正确`);
  const skills = readStringList(value, "skills");
  const invalidSkill = skills.find((skill) => !VALID_BOSS_SKILLS.has(skill));
  if (invalidSkill) throw new Error(`Boss 机制不在预设内：${invalidSkill}`);
  const boss: RogueliteBossBalance = {
    id: readString(value, "id", "Boss id") as RogueliteBossBalance["id"],
    name: readString(value, "name", "Boss 名称"),
    enemyTemplateId: readString(value, "enemyTemplateId", "Boss 模板 id"),
    displayName: readString(value, "displayName", "显示名"),
    enemyKind: "boss",
    spriteKey: typeof value.spriteKey === "string" ? value.spriteKey.trim() : undefined,
    portraitKey: typeof value.portraitKey === "string" ? value.portraitKey.trim() : undefined,
    baseCharacterId: typeof value.baseCharacterId === "string" ? value.baseCharacterId.trim() : undefined,
    stageType: "boss",
    baseHp: readNumber(value, "baseHp", "基础生命"),
    baseShield: readNumber(value, "baseShield", "基础护盾"),
    skills,
    description: readString(value, "description", "Boss 说明"),
  };
  const fixedHp = readOptionalNumber(value, "fixedHp");
  if (fixedHp !== undefined) boss.fixedHp = fixedHp;
  return boss;
}

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${label} 重复：${value}`);
    seen.add(value);
  }
}

function normalizeBalance(payload: unknown): EditableRogueliteBalance {
  if (!isRecord(payload) || !isRecord(payload.rewards)) throw new Error("肉鸽平衡数据格式不正确");
  const balance: EditableRogueliteBalance = {
    enemies: Array.isArray(payload.enemies) ? payload.enemies.map(normalizeEnemy) : [],
    bosses: Array.isArray(payload.bosses) ? payload.bosses.map(normalizeBoss) : [],
    rewards: {
      growth: Array.isArray(payload.rewards.growth) ? payload.rewards.growth.map(normalizeReward) : [],
      characterSkill: Array.isArray(payload.rewards.characterSkill) ? payload.rewards.characterSkill.map(normalizeReward) : [],
      bossAbility: Array.isArray(payload.rewards.bossAbility) ? payload.rewards.bossAbility.map(normalizeReward) : [],
      starter: Array.isArray(payload.rewards.starter) ? payload.rewards.starter.map(normalizeReward) : [],
    },
  };
  if (balance.enemies.length === 0) throw new Error("至少需要一个敌人");
  if (balance.bosses.length === 0) throw new Error("至少需要一个 Boss");
  assertUnique(balance.enemies.map((item) => item.id), "enemy id");
  assertUnique(balance.bosses.map((item) => item.id), "boss id");
  for (const [category, rewards] of Object.entries(balance.rewards)) {
    assertUnique(rewards.map((item) => item.type), `${category} reward type`);
  }
  return balance;
}

function toGeneratedSource(balance: EditableRogueliteBalance): string {
  return [
    "import type { RogueliteBossBalance, RogueliteEnemyBalance, RogueliteRewardDraft } from \"./rogueliteBalance.js\";",
    "",
    `export const GENERATED_ROGUELITE_ENEMIES = ${JSON.stringify(balance.enemies, null, 2)} as const satisfies readonly RogueliteEnemyBalance[];`,
    "",
    `export const GENERATED_ROGUELITE_BOSSES = ${JSON.stringify(balance.bosses, null, 2)} as const satisfies readonly RogueliteBossBalance[];`,
    "",
    `export const GENERATED_ROGUELITE_GROWTH_REWARDS = ${JSON.stringify(balance.rewards.growth, null, 2)} as const satisfies readonly RogueliteRewardDraft[];`,
    "",
    `export const GENERATED_ROGUELITE_CHARACTER_SKILL_REWARDS = ${JSON.stringify(balance.rewards.characterSkill, null, 2)} as const satisfies readonly RogueliteRewardDraft[];`,
    "",
    `export const GENERATED_ROGUELITE_BOSS_ABILITY_REWARDS = ${JSON.stringify(balance.rewards.bossAbility, null, 2)} as const satisfies readonly RogueliteRewardDraft[];`,
    "",
    `export const GENERATED_ROGUELITE_STARTER_REWARDS = ${JSON.stringify(balance.rewards.starter, null, 2)} as const satisfies readonly RogueliteRewardDraft[];`,
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

export async function loadEditableRogueliteBalance(): Promise<EditableRogueliteBalance> {
  try {
    const raw = await readFile(balanceJsonPath, "utf8");
    return normalizeBalance(JSON.parse(raw));
  } catch (error) {
    if ("code" in (error as Record<string, unknown>) && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallbackBalance;
    }
    const message = error instanceof Error ? error.message : "未知错误";
    throw new Error(`读取肉鸽平衡数据失败：${message}`);
  }
}

export async function saveEditableRogueliteBalance(payload: unknown): Promise<EditableRogueliteBalance> {
  const balance = normalizeBalance(payload);
  await mkdir(contentDir, { recursive: true });
  await backupIfExists(balanceJsonPath);
  await backupIfExists(generatedTsPath);
  await writeAtomic(balanceJsonPath, `${JSON.stringify(balance, null, 2)}\n`);
  await writeAtomic(generatedTsPath, toGeneratedSource(balance));
  return balance;
}
