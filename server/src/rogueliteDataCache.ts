import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROGUELITE_BOSS_ABILITY_REWARDS,
  ROGUELITE_BOSSES,
  ROGUELITE_CHARACTER_SKILL_REWARDS,
  ROGUELITE_ENEMIES,
  ROGUELITE_EVENTS,
  ROGUELITE_GROWTH_REWARDS,
  ROGUELITE_STARTER_REWARDS,
  type CharacterId,
  type RogueliteBossId,
  type RogueliteEnemyId,
  type RogueliteEventDraft,
  type RogueliteReward,
} from "@career-war/shared";

export type RogueliteRewardDraft = Omit<RogueliteReward, "id">;

export interface RogueliteBossConfig {
  id: RogueliteBossId;
  name: string;
  enemyTemplateId: string;
  displayName: string;
  enemyKind: "boss";
  spriteKey?: string;
  portraitKey?: string;
  baseCharacterId?: CharacterId;
  baseHp: number;
  fixedHp?: number;
  baseShield: number;
  skills: string[];
}

export interface RogueliteEnemyConfig {
  type: RogueliteEnemyId;
  name: string;
  enemyTemplateId: string;
  displayName: string;
  enemyKind: "monster" | "duelist";
  spriteKey?: string;
  portraitKey?: string;
  baseCharacterId?: CharacterId;
  hpBonus: number;
  shieldBonus: number;
  damageBonus: number;
  skills: string[];
}

export interface RogueliteRewardPools {
  growth: readonly RogueliteRewardDraft[];
  characterSkill: readonly RogueliteRewardDraft[];
  bossAbility: readonly RogueliteRewardDraft[];
  starter: readonly RogueliteRewardDraft[];
}

interface EditableRogueliteBalance {
  enemies: readonly (typeof ROGUELITE_ENEMIES)[number][];
  bosses: readonly (typeof ROGUELITE_BOSSES)[number][];
  rewards: {
    growth: readonly RogueliteRewardDraft[];
    characterSkill: readonly RogueliteRewardDraft[];
    bossAbility: readonly RogueliteRewardDraft[];
    starter: readonly RogueliteRewardDraft[];
  };
}

interface RogueliteBalanceCache {
  enemies: readonly (typeof ROGUELITE_ENEMIES)[number][];
  bosses: readonly (typeof ROGUELITE_BOSSES)[number][];
  rewardPools: RogueliteRewardPools;
  enemyConfigMap: Record<string, RogueliteEnemyConfig>;
  bossConfigMap: Record<string, RogueliteBossConfig>;
  bossPool: readonly RogueliteBossId[];
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "../..");
const contentDir = path.join(projectRoot, "content", "roguelite");
const eventsJsonPath = path.join(contentDir, "events.json");
const balanceJsonPath = path.join(contentDir, "balance.json");

let eventsCache: readonly RogueliteEventDraft[] = ROGUELITE_EVENTS;
let balanceCache = buildBalanceCache(fallbackBalance());

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function warnFallback(label: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[roguelite data cache] ${label} 读取失败，已回退到 shared/generated 数据：${message}`);
}

function fallbackBalance(): EditableRogueliteBalance {
  return {
    enemies: ROGUELITE_ENEMIES,
    bosses: ROGUELITE_BOSSES,
    rewards: {
      growth: ROGUELITE_GROWTH_REWARDS,
      characterSkill: ROGUELITE_CHARACTER_SKILL_REWARDS,
      bossAbility: ROGUELITE_BOSS_ABILITY_REWARDS,
      starter: ROGUELITE_STARTER_REWARDS,
    },
  };
}

function toRogueliteBossConfig(boss: (typeof ROGUELITE_BOSSES)[number]): RogueliteBossConfig {
  const config: RogueliteBossConfig = {
    id: boss.id,
    name: boss.name,
    enemyTemplateId: boss.enemyTemplateId,
    displayName: boss.displayName,
    enemyKind: boss.enemyKind,
    spriteKey: boss.spriteKey,
    portraitKey: boss.portraitKey,
    baseCharacterId: boss.baseCharacterId as CharacterId | undefined,
    baseHp: boss.baseHp,
    baseShield: boss.baseShield,
    skills: [...boss.skills],
  };
  if ("fixedHp" in boss && boss.fixedHp !== undefined) config.fixedHp = boss.fixedHp;
  return config;
}

function toRogueliteEnemyConfig(enemy: (typeof ROGUELITE_ENEMIES)[number]): RogueliteEnemyConfig {
  const skills = enemy.id === "normal" ? [] : [...enemy.skills];
  return {
    type: enemy.id,
    name: enemy.name,
    enemyTemplateId: enemy.enemyTemplateId,
    displayName: enemy.displayName,
    enemyKind: enemy.enemyKind,
    spriteKey: enemy.spriteKey,
    portraitKey: enemy.portraitKey,
    baseCharacterId: enemy.baseCharacterId as CharacterId | undefined,
    hpBonus: enemy.hpBonus,
    shieldBonus: enemy.shieldBonus,
    damageBonus: enemy.damageBonus,
    skills,
  };
}

function normalizeEvents(payload: unknown): readonly RogueliteEventDraft[] {
  if (!Array.isArray(payload)) throw new Error("events.json 必须是事件数组");
  return payload as readonly RogueliteEventDraft[];
}

function normalizeBalance(payload: unknown): EditableRogueliteBalance {
  if (!isRecord(payload) || !isRecord(payload.rewards)) throw new Error("balance.json 格式不正确");
  if (!Array.isArray(payload.enemies)) throw new Error("balance.json enemies 必须是数组");
  if (!Array.isArray(payload.bosses)) throw new Error("balance.json bosses 必须是数组");
  if (!Array.isArray(payload.rewards.growth)) throw new Error("balance.json rewards.growth 必须是数组");
  if (!Array.isArray(payload.rewards.characterSkill)) throw new Error("balance.json rewards.characterSkill 必须是数组");
  if (!Array.isArray(payload.rewards.bossAbility)) throw new Error("balance.json rewards.bossAbility 必须是数组");
  if (!Array.isArray(payload.rewards.starter)) throw new Error("balance.json rewards.starter 必须是数组");

  return payload as unknown as EditableRogueliteBalance;
}

function buildBalanceCache(balance: EditableRogueliteBalance): RogueliteBalanceCache {
  const enemyConfigMap = Object.fromEntries(
    balance.enemies.map((enemy) => [enemy.id, toRogueliteEnemyConfig(enemy)])
  );
  const bossConfigMap = Object.fromEntries(
    balance.bosses.map((boss) => [boss.id, toRogueliteBossConfig(boss)])
  );

  return {
    enemies: balance.enemies,
    bosses: balance.bosses,
    rewardPools: balance.rewards,
    enemyConfigMap,
    bossConfigMap,
    bossPool: balance.bosses.map((boss) => boss.id),
  };
}

async function readJsonFile(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function refreshRogueliteEvents(): Promise<void> {
  eventsCache = normalizeEvents(await readJsonFile(eventsJsonPath));
}

export async function refreshRogueliteBalance(): Promise<void> {
  balanceCache = buildBalanceCache(normalizeBalance(await readJsonFile(balanceJsonPath)));
}

export function getRogueliteEvents(): readonly RogueliteEventDraft[] {
  return eventsCache;
}

export function getRogueliteEnemies(): readonly (typeof ROGUELITE_ENEMIES)[number][] {
  return balanceCache.enemies;
}

export function getRogueliteBosses(): readonly (typeof ROGUELITE_BOSSES)[number][] {
  return balanceCache.bosses;
}

export function getRogueliteRewardPools(): RogueliteRewardPools {
  return balanceCache.rewardPools;
}

export function getRogueliteEnemyConfigMap(): Record<string, RogueliteEnemyConfig> {
  return balanceCache.enemyConfigMap;
}

export function getRogueliteBossConfigMap(): Record<string, RogueliteBossConfig> {
  return balanceCache.bossConfigMap;
}

export function getRogueliteBossPool(): readonly RogueliteBossId[] {
  return balanceCache.bossPool;
}

try {
  await refreshRogueliteEvents();
} catch (error) {
  warnFallback("events.json", error);
}

try {
  await refreshRogueliteBalance();
} catch (error) {
  warnFallback("balance.json", error);
}
