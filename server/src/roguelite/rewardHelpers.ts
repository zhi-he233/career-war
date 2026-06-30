import type { RogueliteReward, Room } from "@career-war/shared";
import { ROGUELITE_REWARD_RHYTHM, ROGUELITE_BALANCE_MECHANICS } from "@career-war/shared";
import { getRogueliteRewardPools, type RogueliteRewardDraft } from "../rogueliteDataCache.js";
import { REWARD_TO_PERK } from "../constants.js";
import { pickOne } from "../infrastructure/utils.js";

// ---------------------------------------------------------------------------
// Reward rhythm constants
// ---------------------------------------------------------------------------

export function getRogueliteRewardRhythm(stageKey: string): (typeof ROGUELITE_REWARD_RHYTHM)[number] | undefined {
  return ROGUELITE_REWARD_RHYTHM.find((item) => item.stage === stageKey);
}

export const ROGUELITE_BASIC_REWARD_STAGE = Number(getRogueliteRewardRhythm("1")?.stage ?? 1);
export const ROGUELITE_ARCHETYPE_REWARD_STAGE = Number(getRogueliteRewardRhythm("2")?.stage ?? 2);
export const ROGUELITE_CORE_REWARD_STAGE = Number(getRogueliteRewardRhythm("3")?.stage ?? 3);
export const ROGUELITE_BOSS_REWARD_STAGE = ROGUELITE_BALANCE_MECHANICS.bossAbilityRewardStage;

const ROGUELITE_TAG_BIAS_STAGE_RANGE = (getRogueliteRewardRhythm("4-6")?.stage ?? "4-6").split("-").map((v) => Number(v));
export const ROGUELITE_TAG_BIAS_STAGE_START = ROGUELITE_TAG_BIAS_STAGE_RANGE[0] ?? 4;
export const ROGUELITE_TAG_BIAS_STAGE_END = ROGUELITE_TAG_BIAS_STAGE_RANGE[1] ?? ROGUELITE_TAG_BIAS_STAGE_START;

const BASIC_REWARD_TYPES: ReadonlyArray<RogueliteReward["type"]> = getRogueliteRewardRhythm("1")?.rewardTypes ?? [];
const ARCHETYPE_STARTER_TYPES: ReadonlyArray<RogueliteReward["type"]> = getRogueliteRewardRhythm("2")?.rewardTypes ?? [];
const CORE_REWARD_TYPES: ReadonlyArray<RogueliteReward["type"]> = getRogueliteRewardRhythm("3")?.rewardTypes ?? [];

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isBossRewardType(type: string): boolean { return type === "berserker_blood" || type === "vampire_instinct" || type === "dragon_courage"; }
export function isRogueliteSkillRewardType(type: string): boolean { return type === "gunner_triple_shot" || type === "vampire_skill" || type === "zhaoyun_pierce" || type === "flame_lord_mark"; }

// ---------------------------------------------------------------------------
// Draft pool helpers
// ---------------------------------------------------------------------------

export function getRogueliteDraftsByType(types: readonly RogueliteReward["type"][]): RogueliteRewardDraft[] {
  const pools = getRogueliteRewardPools();
  const all = [...pools.characterSkill, ...pools.growth, ...pools.starter, ...pools.bossAbility];
  return types.map((t) => all.find((d) => d.type === t)).filter((d): d is RogueliteRewardDraft => Boolean(d));
}

export function getAvailableRogueliteDrafts(drafts: readonly RogueliteRewardDraft[], currentStacks?: Record<string, number>): RogueliteRewardDraft[] {
  return drafts.filter((d) => { if (!d.maxStacks) return true; const pid = REWARD_TO_PERK[d.type]?.perkId ?? d.type; return (currentStacks?.[pid] ?? 0) < d.maxStacks; });
}

export function getPreferredRogueliteTags(appliedRewards: readonly RogueliteReward[]): Array<NonNullable<RogueliteReward["tag"]>> {
  const counts = new Map<NonNullable<RogueliteReward["tag"]>, number>();
  for (const r of appliedRewards) { if (r.tag) counts.set(r.tag, (counts.get(r.tag) ?? 0) + 1); }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

export function removeRandomRogueliteDraft(pool: RogueliteRewardDraft[], source: readonly RogueliteRewardDraft[] = pool): RogueliteRewardDraft | undefined {
  if (source.length === 0) return undefined;
  const sel = source[Math.floor(Math.random() * source.length)];
  const idx = pool.findIndex((d) => d.type === sel?.type); if (idx < 0) return undefined;
  return pool.splice(idx, 1)[0];
}

export function fillRogueliteChoices(choices: RogueliteReward[], pool: RogueliteRewardDraft[]): RogueliteReward[] {
  while (choices.length < 3 && pool.length > 0) {
    const d = removeRandomRogueliteDraft(pool); if (!d) continue;
    if (choices.some((c) => c.type === d.type)) continue;
    choices.push({ ...d, id: crypto.randomUUID() });
  }
  return choices;
}

// ---------------------------------------------------------------------------
// Reward choice creation
// ---------------------------------------------------------------------------

export function createRogueliteRewardChoices(currentStacks?: Record<string, number>, appliedRewards: readonly RogueliteReward[] = [], stage = 1): RogueliteReward[] {
  const pools = getRogueliteRewardPools();
  const pool = getAvailableRogueliteDrafts([...pools.characterSkill, ...pools.growth], currentStacks);
  const choices: RogueliteReward[] = [];
  const pref = stage >= ROGUELITE_TAG_BIAS_STAGE_START && stage <= ROGUELITE_TAG_BIAS_STAGE_END ? getPreferredRogueliteTags(appliedRewards) : [];
  for (const tag of pref.slice(0, 2)) { const ti = pool.findIndex((d) => d.tag === tag); if (ti >= 0) choices.push({ ...pool.splice(ti, 1)[0]!, id: crypto.randomUUID() }); }
  while (choices.length < 3 && pool.length > 0) { const idx = Math.floor(Math.random() * pool.length); choices.push({ ...pool.splice(idx, 1)[0]!, id: crypto.randomUUID() }); }
  return choices;
}

export function createRogueliteBossRewardChoices(): RogueliteReward[] { return getRogueliteRewardPools().bossAbility.map((d) => ({ ...d, id: crypto.randomUUID() })); }
export function createRogueliteBasicRewardChoices(currentStacks?: Record<string, number>): RogueliteReward[] { return createRogueliteChoicesFromTypes(BASIC_REWARD_TYPES, currentStacks); }

export function createRogueliteArchetypeStarterChoices(currentStacks?: Record<string, number>): RogueliteReward[] {
  const pool = getAvailableRogueliteDrafts(getRogueliteDraftsByType(ARCHETYPE_STARTER_TYPES), currentStacks);
  const choices: RogueliteReward[] = []; const used = new Set<string>();
  while (choices.length < 3 && pool.length > 0) {
    const cand = pool.filter((d) => d.tag && !used.has(d.tag));
    const d = removeRandomRogueliteDraft(pool, cand.length > 0 ? cand : pool); if (!d) break;
    if (d.tag) used.add(d.tag);
    choices.push({ ...d, id: crypto.randomUUID() });
  }
  return fillRogueliteChoices(choices, pool);
}

export function createRogueliteCoreRewardChoices(currentStacks?: Record<string, number>): RogueliteReward[] {
  const choices = createRogueliteChoicesFromTypes(CORE_REWARD_TYPES, currentStacks);
  if (choices.length >= 3) return choices;
  const pools = getRogueliteRewardPools();
  return fillRogueliteChoices(choices, getAvailableRogueliteDrafts([...pools.characterSkill, ...pools.growth], currentStacks));
}

export function createRogueliteChoicesFromTypes(types: readonly RogueliteReward["type"][], currentStacks?: Record<string, number>): RogueliteReward[] {
  return fillRogueliteChoices([], getAvailableRogueliteDrafts(getRogueliteDraftsByType(types), currentStacks));
}

// ---------------------------------------------------------------------------
// Apply reward to player
// ---------------------------------------------------------------------------

export function applyRogueliteReward(player: Room["players"][number], reward: RogueliteReward): void {
  const mapping = REWARD_TO_PERK[reward.type];
  if (mapping) { player.roguelitePerkStacks ??= {}; player.roguelitePerkStacks[mapping.perkId] = (player.roguelitePerkStacks[mapping.perkId] ?? 0) + mapping.levels; }
  if (isRogueliteSkillRewardType(reward.type)) { player.rogueliteSkillStacks ??= {}; player.rogueliteSkillStacks[reward.type] = (player.rogueliteSkillStacks[reward.type] ?? 0) + 1; return; }
  if (reward.type === "starter_heavy_punch") { player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + 2; player.maxHp += 4; player.hp = Math.min(player.maxHp, player.hp + 4); return; }
  if (reward.type === "starter_blood_punch") { player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + 1; player.roguelitePassiveIds ??= []; if (!player.roguelitePassiveIds.includes("starter_blood_punch")) player.roguelitePassiveIds = [...player.roguelitePassiveIds, "starter_blood_punch"]; return; }
  if (reward.type === "starter_iron_wall") { player.rogueliteArmorBonus = (player.rogueliteArmorBonus ?? 0) + 1; player.maxHp += 6; player.hp = Math.min(player.maxHp, player.hp + 6); player.rogueliteStartShield = (player.rogueliteStartShield ?? 0) + 3; return; }
  if (reward.type === "starter_recovery") { player.maxHp += 8; player.hp = Math.min(player.maxHp, player.hp + 8); player.roguelitePostBattleHealBonus = (player.roguelitePostBattleHealBonus ?? 0) + 5; return; }
  if (reward.type === "heavy_punch_training") { player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + 1; player.maxHp += 2; player.hp = Math.min(player.maxHp, player.hp + 2); return; }
  if (reward.type === "iron_body") { player.rogueliteArmorBonus = (player.rogueliteArmorBonus ?? 0) + 1; player.rogueliteStartShield = (player.rogueliteStartShield ?? 0) + 2; return; }
  if (reward.type === "breathing_recovery") { player.maxHp += 3; player.hp = Math.min(player.maxHp, player.hp + 3); const ha = Math.max(8, Math.floor(player.maxHp * reward.value / 100)); player.hp = Math.min(player.maxHp, player.hp + ha); return; }
  if (reward.type === "blood_punch") { player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + 1; player.roguelitePassiveIds ??= []; if (!player.roguelitePassiveIds.includes("blood_punch")) player.roguelitePassiveIds = [...player.roguelitePassiveIds, "blood_punch"]; return; }
  if (reward.type === "battle_instinct") { player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + 1; player.roguelitePostBattleHealBonus = (player.roguelitePostBattleHealBonus ?? 0) + 2; player.maxHp += 2; player.hp = Math.min(player.maxHp, player.hp + 2); return; }
  if (reward.type === "guard_training") { player.maxHp += 4; player.hp = Math.min(player.maxHp, player.hp + 4); player.rogueliteStartShield = (player.rogueliteStartShield ?? 0) + 3; return; }
  if (reward.type === "vitality_boost") { player.maxHp += 6; player.hp = Math.min(player.maxHp, player.hp + 4); return; }
  if (reward.type === "shield_wall") { player.shield += 4; player.rogueliteStartShield = (player.rogueliteStartShield ?? 0) + 4; return; }
  if (reward.type === "first_strike") { player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + reward.value; return; }
  if (reward.type === "low_hp_armor") { player.rogueliteLowHpArmor = (player.rogueliteLowHpArmor ?? 0) + 2; return; }
  if (reward.type === "kill_heal" || reward.type === "drink_blood") return;
  if (reward.type === "comeback") { player.rogueliteComebackDamage = (player.rogueliteComebackDamage ?? 0) + reward.value; return; }
  if (reward.type === "low_roll_defense") { player.rogueliteLowRollDefenseShield = (player.rogueliteLowRollDefenseShield ?? 0) + reward.value; return; }
  if (reward.type === "shield_strike") { player.rogueliteShieldStrikeBonus = (player.rogueliteShieldStrikeBonus ?? 0) + reward.value; return; }
  if (reward.type === "shield_overload" || reward.type === "sturdy_bulwark" || reward.type === "fate_tokens" || reward.type === "low_roll_charge" || reward.type === "desperate_reroll" || reward.type === "lucky_floor") return;
  if (reward.type === "gunner_triple_shot" || reward.type === "vampire_skill" || reward.type === "zhaoyun_pierce" || reward.type === "flame_lord_mark") { player.rogueliteSkillStacks ??= {}; player.rogueliteSkillStacks[reward.type] = (player.rogueliteSkillStacks[reward.type] ?? 0) + 1; player.roguelitePerkStacks ??= {}; player.roguelitePerkStacks[reward.type] = (player.roguelitePerkStacks[reward.type] ?? 0) + 1; return; }
  if (reward.type === "berserker_blood" || reward.type === "vampire_instinct" || reward.type === "dragon_courage") { player.rogueliteBossAbilities ??= []; if (!player.rogueliteBossAbilities.includes(reward.type)) player.rogueliteBossAbilities = [...player.rogueliteBossAbilities, reward.type]; }
}
