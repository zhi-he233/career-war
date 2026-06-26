import type { RogueliteReward, RogueliteRewardType } from "../types.js";

export type RogueliteStageType = "normal" | "elite" | "boss";

export type RogueliteRewardDraft = Omit<RogueliteReward, "id">;

export type RogueliteEnemyId =
  | "normal"
  | "normal_gambler"
  | "normal_shield_breaker"
  | "normal_armor_piercer"
  | "elite_iron_skin"
  | "elite_berserker"
  | "elite_reaper"
  | "elite_armor_piercing";

export type RogueliteBossId =
  | "boss_boxer_king"
  | "boss_blood_demon"
  | "boss_shield_guard"
  | "boss_god_berserker"
  | "boss_gambler_dealer";

export type RogueliteMechanicId =
  | "fatigue"
  | "stage_scaling"
  | "reward_rhythm"
  | "boss_fixed_hp";

export type RogueliteRewardCategory =
  | "starter"
  | "growth"
  | "character_skill"
  | "boss_ability";

export interface UnsupportedRogueliteRewardDraft {
  type: string;
  name: string;
  category: RogueliteRewardCategory;
  value: number;
  tag?: string;
  maxStacks?: number;
  description: string;
  reason: string;
}

export interface UnsupportedRogueliteBossDraft {
  id: string;
  name: string;
  baseHp: number;
  baseShield: number;
  description: string;
  reason: string;
}

export interface RogueliteEnemyBalance {
  id: RogueliteEnemyId;
  name: string;
  enemyTemplateId: string;
  displayName: string;
  enemyKind: "monster" | "duelist";
  spriteKey?: string;
  portraitKey?: string;
  baseCharacterId?: string;
  stageType: Exclude<RogueliteStageType, "boss">;
  hpBonus: number;
  shieldBonus: number;
  damageBonus: number;
  skills: readonly string[];
  description: string;
}

export interface RogueliteBossBalance {
  id: RogueliteBossId;
  name: string;
  enemyTemplateId: string;
  displayName: string;
  enemyKind: "boss";
  spriteKey?: string;
  portraitKey?: string;
  baseCharacterId?: string;
  stageType: "boss";
  baseHp: number;
  fixedHp?: number;
  baseShield: number;
  skills: readonly string[];
  description: string;
}

export interface RogueliteEarlyStageBalance {
  stage: number;
  enemyId?: RogueliteEnemyId;
  bossPool?: readonly RogueliteBossId[];
  hp: number | "boss_config";
  shield: number | "boss_config";
  description: string;
}

export interface RogueliteStageScalingBalance {
  bossInterval: number;
  earlyStages: readonly RogueliteEarlyStageBalance[];
  stage4To6: Readonly<Partial<Record<number, { hpBonus: number; shieldBonus: number }>>>;
  stage7Plus: {
    hpBonusFormula: string;
    hpBonusPerStage: number;
    shieldBonusFormula: string;
    shieldStageDivisor: number;
    shieldBonusPerStep: number;
    bossExtraHp: number;
    bossExtraShield: number;
    eliteExtraHp: number;
    eliteExtraShield: number;
  };
}

export interface RogueliteRewardRhythmBalance {
  stage: string;
  title: string;
  rewardTypes: readonly RogueliteRewardType[];
  notes: string;
}

export interface RogueliteFatigueBalance {
  startsAtRound: number;
  normalRounds: string;
  formula: string;
  affects: string;
}

export const ROGUELITE_MAX_STAGE = 15;

export const ROGUELITE_PLAYER_START = {
  characterId: "boxer",
  summonerSkill: "disabled",
} as const;

export const ROGUELITE_BOT_BASE = {
  characterId: "boxer",
  controllerId: "bot",
} as const;

export const ROGUELITE_FATIGUE = {
  startsAtRound: 9,
  normalRounds: "1-8",
  formula: "Math.max(0, Math.floor((round - 7) / 2))",
  affects: "direct_attack_damage_only",
} as const satisfies RogueliteFatigueBalance;

export const ROGUELITE_STAGE_SCALING = {
  bossInterval: 6,
  earlyStages: [
    {
      stage: 1,
      enemyId: "normal",
      hp: 12,
      shield: 0,
      description: "训练拳手",
    },
    {
      stage: 2,
      enemyId: "normal",
      hp: 12,
      shield: 0,
      description: "普通拳手",
    },
  ],
  stage4To6: {
    4: { hpBonus: 10, shieldBonus: 2 },
    5: { hpBonus: 12, shieldBonus: 4 },
    6: { hpBonus: 15, shieldBonus: 6 },
  },
  stage7Plus: {
    hpBonusFormula: "stage * 5",
    hpBonusPerStage: 5,
    shieldBonusFormula: "Math.floor(stage / 2) * 2",
    shieldStageDivisor: 2,
    shieldBonusPerStep: 2,
    bossExtraHp: 10,
    bossExtraShield: 4,
    eliteExtraHp: 3,
    eliteExtraShield: 2,
  },
} as const satisfies RogueliteStageScalingBalance;

export const ROGUELITE_ENEMIES = [
    {
      id: "normal",
      name: "普通兵",
      enemyTemplateId: "normal_training_dummy",
      displayName: "训练假人",
      enemyKind: "monster",
      spriteKey: "normal_training_dummy",
      portraitKey: "normal_training_dummy",
      baseCharacterId: "boxer",
      stageType: "normal",
    hpBonus: 0,
    shieldBonus: 0,
    damageBonus: 0,
    skills: ["无特殊机制"],
    description: "基础小怪。",
  },
    {
      id: "normal_gambler",
      name: "赌徒",
      enemyTemplateId: "normal_gambler",
      displayName: "赌徒",
      enemyKind: "duelist",
      spriteKey: "normal_gambler",
      portraitKey: "normal_gambler",
      baseCharacterId: "boxer",
      stageType: "normal",
    hpBonus: 0,
    shieldBonus: 0,
    damageBonus: 0,
    skills: ["赌徒：投 1 自伤 1，投 6 伤害 +2"],
    description: "波动型小怪。",
  },
    {
      id: "normal_shield_breaker",
      name: "破盾兵",
      enemyTemplateId: "normal_shield_breaker",
      displayName: "破盾兵",
      enemyKind: "monster",
      spriteKey: "normal_shield_breaker",
      portraitKey: "normal_shield_breaker",
      baseCharacterId: "boxer",
      stageType: "normal",
    hpBonus: 0,
    shieldBonus: 0,
    damageBonus: 0,
    skills: ["破盾：攻击护盾时额外 +2 伤害"],
    description: "克制护盾的小怪。",
  },
    {
      id: "normal_armor_piercer",
      name: "穿甲兵",
      enemyTemplateId: "normal_armor_piercer",
      displayName: "穿甲兵",
      enemyKind: "monster",
      spriteKey: "normal_armor_piercer",
      portraitKey: "normal_armor_piercer",
      baseCharacterId: "boxer",
      stageType: "normal",
    hpBonus: 0,
    shieldBonus: 0,
    damageBonus: 0,
    skills: ["穿甲：攻击无视 1 点护甲"],
    description: "克制护甲的小怪。",
  },
    {
      id: "elite_iron_skin",
      name: "铁皮精英",
      enemyTemplateId: "elite_iron_skin",
      displayName: "铁皮精英",
      enemyKind: "monster",
      spriteKey: "elite_iron_skin",
      portraitKey: "elite_iron_skin",
      baseCharacterId: "boxer",
      stageType: "elite",
    hpBonus: 0,
    shieldBonus: 0,
    damageBonus: 0,
    skills: ["铁皮：护甲 +1", "整备：每回合获得 2 护盾"],
    description: "防御型精英。",
  },
    {
      id: "elite_berserker",
      name: "狂暴精英",
      enemyTemplateId: "elite_berserker",
      displayName: "狂暴精英",
      enemyKind: "monster",
      spriteKey: "elite_berserker",
      portraitKey: "elite_berserker",
      baseCharacterId: "boxer",
      stageType: "elite",
    hpBonus: 0,
    shieldBonus: 0,
    damageBonus: 0,
    skills: ["狂暴：低于半血时伤害 +3"],
    description: "残血爆发精英。",
  },
    {
      id: "elite_reaper",
      name: "收割精英",
      enemyTemplateId: "elite_reaper",
      displayName: "收割精英",
      enemyKind: "monster",
      spriteKey: "elite_reaper",
      portraitKey: "elite_reaper",
      baseCharacterId: "boxer",
      stageType: "elite",
    hpBonus: 0,
    shieldBonus: 0,
    damageBonus: 0,
    skills: ["收割：目标低于 40% 生命时伤害 +2"],
    description: "压低血线后伤害提高的精英。",
  },
    {
      id: "elite_armor_piercing",
      name: "穿甲精英",
      enemyTemplateId: "elite_armor_piercing",
      displayName: "穿甲精英",
      enemyKind: "monster",
      spriteKey: "elite_armor_piercing",
      portraitKey: "elite_armor_piercing",
      baseCharacterId: "boxer",
      stageType: "elite",
    hpBonus: 0,
    shieldBonus: 0,
    damageBonus: 0,
    skills: ["穿甲：无视 1 点护甲", "破势：自身低于半血时无视 2 点护甲"],
    description: "针对护甲流派的精英。",
  },
] as const satisfies readonly RogueliteEnemyBalance[];

export const ROGUELITE_BOSSES = [
    {
      id: "boss_boxer_king",
      name: "拳王",
      enemyTemplateId: "boss_boxer_king",
      displayName: "拳王",
      enemyKind: "boss",
      spriteKey: "boss_boxer_king",
      portraitKey: "boss_boxer_king",
      baseCharacterId: "boxer",
      stageType: "boss",
    baseHp: 18,
    baseShield: 2,
    skills: ["蓄力：投 1/2 获得 1 层蓄力", "重拳：攻击时每层蓄力 +3 伤害并清空", "狂暴：低于半血时伤害 +2"],
    description: "稳定蓄力和半血爆发的 Boss。",
  },
    {
      id: "boss_blood_demon",
      name: "血魔",
      enemyTemplateId: "boss_blood_demon",
      displayName: "血魔",
      enemyKind: "boss",
      spriteKey: "boss_blood_demon",
      portraitKey: "boss_blood_demon",
      baseCharacterId: "boxer",
      stageType: "boss",
    baseHp: 16,
    baseShield: 0,
    skills: ["嗜血：造成生命伤害后回复 2", "血盾：投到 3 时获得 4 护盾", "血祭：低于 40% 生命时一次性回复 5 并获得 3 护盾"],
    description: "低血量回复型 Boss。",
  },
    {
      id: "boss_shield_guard",
      name: "山盾守卫",
      enemyTemplateId: "boss_shield_guard",
      displayName: "山盾守卫",
      enemyKind: "boss",
      spriteKey: "boss_shield_guard",
      portraitKey: "boss_shield_guard",
      baseCharacterId: "boxer",
      stageType: "boss",
    baseHp: 14,
    baseShield: 5,
    skills: ["铁壁：护甲 +1", "架盾：投 1/2 获得 5 护盾并使本次受伤 -2", "盾反：受到生命伤害后反击 2"],
    description: "靠护盾和护甲拖慢战斗的 Boss。",
  },
    {
      id: "boss_god_berserker",
      name: "神狂战",
      enemyTemplateId: "boss_god_berserker",
      displayName: "神狂战",
      enemyKind: "boss",
      spriteKey: "boss_god_berserker",
      portraitKey: "boss_god_berserker",
      baseCharacterId: "boxer",
      stageType: "boss",
    baseHp: 20,
    fixedHp: 20,
    baseShield: 0,
    skills: ["神怒：攻击附加已损失生命值", "濒死：进入 15/10/5/1 血阈值", "终击：死亡前完成最后一击"],
    description: "固定 20 血，强度来自残血爆发和终击机制。",
  },
    {
      id: "boss_gambler_dealer",
      name: "赌命庄家",
      enemyTemplateId: "boss_gambler_dealer",
      displayName: "赌命庄家",
      enemyKind: "boss",
      spriteKey: "boss_gambler_dealer",
      portraitKey: "boss_gambler_dealer",
      baseCharacterId: "boxer",
      stageType: "boss",
    baseHp: 16,
    baseShield: 3,
    skills: ["洗牌：投 1-3 时重投一次", "抽税：玩家投 6 时自身获得 3 护盾", "梭哈：低于 30% 生命时伤害 +3"],
    description: "骰点波动型 Boss。",
  },
] as const satisfies readonly RogueliteBossBalance[];

export const ROGUELITE_GROWTH_REWARDS = [
  { name: "重拳训练", description: "伤害 +1，生命上限 +2，回复 3。", type: "heavy_punch_training", value: 1, tag: "burst" },
  { name: "铁布衫", description: "护甲 +1，每关开始护盾 +2。", type: "iron_body", value: 1, tag: "armor" },
  { name: "战斗喘息", description: "最大生命 +5，获得时回复最大生命 40%，最低 8 点。", type: "breathing_recovery", value: 40, tag: "heal" },
  { name: "吸血拳法", description: "伤害 +1，造成生命伤害后回复 1 生命。", type: "blood_punch", value: 1, tag: "heal" },
  { name: "战斗本能", description: "伤害 +1，生命上限 +2，战后额外恢复 +2。", type: "battle_instinct", value: 1, tag: "burst" },
  { name: "防守训练", description: "生命上限 +4，每关开始护盾 +3。", type: "guard_training", value: 4, tag: "shield" },
  { name: "生命强化", description: "生命上限 +6，并回复 4 生命。", type: "vitality_boost", value: 6, tag: "armor", maxStacks: 3 },
  { name: "护盾壁垒", description: "获得 4 护盾，每关开始护盾 +4。", type: "shield_wall", value: 4, tag: "shield", maxStacks: 3 },
  { name: "先手优势", description: "攻击伤害 +3。", type: "first_strike", value: 3, tag: "burst", maxStacks: 3 },
  { name: "绝境护甲", description: "生命低于一半时护甲 +2。", type: "low_hp_armor", value: 2, tag: "low_hp", maxStacks: 3 },
  { name: "战利品", description: "击败敌人后升级一个成长。", type: "kill_heal", value: 1, tag: "heal", maxStacks: 3 },
  { name: "饮血", description: "直接攻击造成生命伤害后回复 3 生命。", type: "drink_blood", value: 3, tag: "heal", maxStacks: 3 },
  { name: "翻盘之力", description: "生命低于一半时，攻击伤害 +3。", type: "comeback", value: 3, tag: "low_hp", maxStacks: 2 },
  { name: "低点防御", description: "投到 1 或 2 时获得 3 护盾。", type: "low_roll_defense", value: 3, tag: "shield", maxStacks: 3 },
  { name: "盾击", description: "拥有护盾时攻击伤害 +2。", type: "shield_strike", value: 2, tag: "shield", maxStacks: 3 },
  { name: "护盾过载", description: "每关一次，攻击时消耗最多 10 护盾并追加一半为伤害。", type: "shield_overload", value: 1, tag: "shield", maxStacks: 1 },
  { name: "稳固壁垒", description: "有护盾时护甲 +1。", type: "sturdy_bulwark", value: 1, tag: "shield", maxStacks: 1 },
  { name: "命运筹码", description: "投到 1/2 获得筹码，3 个筹码可让骰点 +1。", type: "fate_tokens", value: 1, tag: "dice", maxStacks: 1 },
  { name: "低点蓄力", description: "投到 1/2/3 获得蓄力，投到 5/6 时每层 +2 伤害。", type: "low_roll_charge", value: 1, tag: "dice", maxStacks: 1 },
  { name: "孤注一掷", description: "预留/显示型奖励。", type: "desperate_reroll", value: 1, tag: "dice", maxStacks: 1 },
  { name: "幸运保底", description: "连续低点后，下一次投骰至少为 4。", type: "lucky_floor", value: 1, tag: "dice", maxStacks: 1 },
] as const satisfies readonly RogueliteRewardDraft[];

export const ROGUELITE_CHARACTER_SKILL_REWARDS = [
  { name: "枪手技能", description: "Lv.1 投 6 时攻击伤害 x3；Lv.2 额外 +3；Lv.3 投 5/6 触发。", type: "gunner_triple_shot", value: 1, maxStacks: 3 },
  { name: "吸血鬼技能", description: "造成生命伤害后回复等同等级的生命。", type: "vampire_skill", value: 1, maxStacks: 3 },
  { name: "赵子龙技能", description: "攻击无视护盾和护甲；高等级增加穿透伤害 +1/+2/+4。", type: "zhaoyun_pierce", value: 1, maxStacks: 3 },
  { name: "火焰领主技能", description: "攻击命中后添加等同等级的火焰印记，按 6 可以引爆，每层造成 3 点伤害。", type: "flame_lord_mark", value: 1, maxStacks: 3 },
] as const satisfies readonly RogueliteRewardDraft[];

export const ROGUELITE_BOSS_ABILITY_REWARDS = [
  { name: "狂怒之血", description: "攻击额外造成已损失生命一半的伤害。", type: "berserker_blood", value: 0 },
  { name: "吸血本能", description: "造成生命伤害后回复 2 生命，溢出转化为护盾。", type: "vampire_instinct", value: 2 },
  { name: "龙胆之力", description: "攻击无视护盾和护甲，叠层后额外伤害 +1。", type: "dragon_courage", value: 0 },
] as const satisfies readonly RogueliteRewardDraft[];

export const UNSUPPORTED_ROGUELITE_REWARD_TYPES = [
  "spiked_guard",
  "armor_tooth",
  "victory_spoils",
  "shop_discount",
  "elite_hunter",
  "paladin_oath",
  "assassin_execute",
  "dealer_rule",
  "shield_king_order",
  "cycle_bell",
] as const;

export const ROGUELITE_UNSUPPORTED_ENABLED_REWARDS = [
  {
    type: "spiked_guard",
    name: "尖刺防守",
    category: "growth",
    value: 1,
    tag: "shield",
    maxStacks: 3,
    description: "获得护盾时，下次攻击追加（护盾数值 / 2）伤害。",
    reason: "需要新增获得护盾后的下次攻击追伤逻辑，当前 RogueliteRewardType 与 engine 均未支持。",
  },
  {
    type: "armor_tooth",
    name: "护甲尖牙",
    category: "growth",
    value: 1,
    tag: "armor",
    maxStacks: 2,
    description: "有护甲时攻击额外造成数值等同于护甲的伤害。",
    reason: "需要新增按护甲转化攻击伤害的战斗触发逻辑，当前 RogueliteRewardType 与 engine 均未支持。",
  },
  {
    type: "victory_spoils",
    name: "胜者搜刮",
    category: "growth",
    value: 1,
    tag: "economy",
    maxStacks: 3,
    description: "每场胜利后获得额外金币 +25%。",
    reason: "需要新增金币结算逻辑，当前没有战后金币收益系统承接。",
  },
  {
    type: "shop_discount",
    name: "黑市熟客",
    category: "growth",
    value: 1,
    tag: "economy",
    maxStacks: 1,
    description: "商店价格降低 25%。",
    reason: "需要新增商店价格结算逻辑，本轮未接入商店购买流程。",
  },
  {
    type: "elite_hunter",
    name: "精英猎手",
    category: "growth",
    value: 1,
    tag: "burst",
    maxStacks: 2,
    description: "对精英和 Boss 第一次攻击伤害 +25%。",
    reason: "需要新增按敌人类型和首次攻击计算百分比伤害的逻辑，当前 RogueliteRewardType 与 engine 均未支持。",
  },
  {
    type: "paladin_oath",
    name: "圣骑士誓约",
    category: "character_skill",
    value: 1,
    maxStacks: 3,
    description: "获得护盾时回复（护盾值 / 2）生命，生命值降到 1-5 区间时获得一回合无敌。",
    reason: "需要新增护盾回血与低血无敌触发逻辑，当前 RogueliteRewardType 与 engine 均未支持。",
  },
  {
    type: "assassin_execute",
    name: "刺客斩杀",
    category: "character_skill",
    value: 1,
    maxStacks: 3,
    description: "目标血量低于 50% 时攻击伤害 +1/2/4。",
    reason: "需要新增目标血线判定的角色技能逻辑，当前 RogueliteRewardType 与 engine 均未支持。",
  },
  {
    type: "dealer_rule",
    name: "庄家规则",
    category: "boss_ability",
    value: 0,
    description: "每场第一次骰点可选择重投一次。",
    reason: "需要新增玩家重投决策流程与状态记录，当前 RogueliteRewardType 与 engine 均未支持。",
  },
  {
    type: "shield_king_order",
    name: "盾王号令",
    category: "boss_ability",
    value: 0,
    description: "每回合开始若无护盾，获得 4 护盾，并且每层获得 2 点护甲加成。",
    reason: "需要新增回合开始护盾检查与护甲加成逻辑，当前 RogueliteRewardType 与 engine 均未支持。",
  },
  {
    type: "cycle_bell",
    name: "轮回钟声",
    category: "boss_ability",
    value: 0,
    description: "Boss 战或精英战中伤害提高，作为进入下一轮循环的信号。",
    reason: "由文档中的旧钟声条目修正而来；需要新增按房间类型增伤逻辑，当前 RogueliteRewardType 与 engine 均未支持。",
  },
] as const satisfies readonly UnsupportedRogueliteRewardDraft[];

export const UNSUPPORTED_ROGUELITE_BOSS_IDS = ["boss_dragon_spear_trial"] as const;

export const ROGUELITE_UNSUPPORTED_ENABLED_BOSSES = [
  {
    id: "boss_dragon_spear_trial",
    name: "龙胆试炼",
    baseHp: 17,
    baseShield: 1,
    description: "攻击穿透护盾和护甲，1 血时触发龙胆，无敌一回合，伤害 +4，并且回复这一次攻击的生命值。",
    reason: "需要新增 Boss 专属穿透、1 血无敌、反击后回复等战斗触发逻辑；本轮未加入 ROGUELITE_BOSSES 实际轮换池。",
  },
] as const satisfies readonly UnsupportedRogueliteBossDraft[];

export const ROGUELITE_STARTER_REWARDS = [
  { name: "重拳开局", description: "伤害 +2，生命上限 +4，回复 4 生命。", type: "starter_heavy_punch", value: 2, tag: "burst" },
  { name: "吸血开局", description: "伤害 +1，造成生命伤害后回复 2 生命。", type: "starter_blood_punch", value: 1, tag: "heal" },
  { name: "铁壁开局", description: "护甲 +1，生命上限 +6，每关开始护盾 +3。", type: "starter_iron_wall", value: 1, tag: "shield" },
  { name: "续航开局", description: "生命上限 +8，每关胜利后额外恢复 5 生命。", type: "starter_recovery", value: 8, tag: "heal" },
] as const satisfies readonly RogueliteRewardDraft[];

export const ROGUELITE_REWARD_RHYTHM = [
  {
    stage: "1",
    title: "基础奖励",
    rewardTypes: ["vitality_boost", "shield_wall", "heavy_punch_training", "iron_body", "breathing_recovery", "guard_training"],
    notes: "第 1 关胜利，给基础生存或伤害。",
  },
  {
    stage: "2",
    title: "流派启动",
    rewardTypes: ["low_roll_defense", "shield_strike", "fate_tokens", "low_roll_charge", "low_hp_armor", "comeback", "first_strike"],
    notes: "第 2 关胜利，尽量来自不同 tag。",
  },
  {
    stage: "3",
    title: "核心技能",
    rewardTypes: ["shield_overload", "sturdy_bulwark", "lucky_floor", "drink_blood"],
    notes: "第 3 关 Boss 胜利，至少给一个关键技能。",
  },
  {
    stage: "4-6",
    title: "流派强化",
    rewardTypes: [],
    notes: "根据玩家已有 tag 略微提高同流派奖励出现概率。",
  },
  {
    stage: "15",
    title: "Boss 能力",
    rewardTypes: ["berserker_blood", "vampire_instinct", "dragon_courage"],
    notes: "第 15 关大 Boss 后才给质变能力。",
  },
] as const satisfies readonly RogueliteRewardRhythmBalance[];

export const ROGUELITE_BALANCE_MECHANICS = {
  fatigue: ROGUELITE_FATIGUE,
  stageScaling: ROGUELITE_STAGE_SCALING,
  normalEnemyRotationStartsAtStage: 7,
  normalEnemyRotation: ["normal", "normal_gambler", "normal_shield_breaker", "normal_armor_piercer"],
  normalGamblerFallbackStartsAtStage: 4,
  normalGamblerFallbackModulo: 4,
  eliteStartsAtStage: 5,
  eliteStageRule: "cycleStage === 5 && stage >= 5",
  eliteEarlyPool: ["elite_iron_skin", "elite_berserker"],
  eliteLatePoolStartsAtStage: 10,
  eliteLatePool: ["elite_iron_skin", "elite_berserker", "elite_reaper", "elite_armor_piercing"],
  bossStageRule: "cycleStage === 6 || cycleStage === 15",
  bossAbilityRewardStage: 15,
} as const;

export const ROGUELITE_REWARD_TABLES: Record<RogueliteRewardCategory, readonly RogueliteRewardDraft[]> = {
  starter: ROGUELITE_STARTER_REWARDS,
  growth: ROGUELITE_GROWTH_REWARDS,
  character_skill: ROGUELITE_CHARACTER_SKILL_REWARDS,
  boss_ability: ROGUELITE_BOSS_ABILITY_REWARDS,
};

export const rogueliteBalance = {
  maxStage: ROGUELITE_MAX_STAGE,
  playerStart: ROGUELITE_PLAYER_START,
  botBase: ROGUELITE_BOT_BASE,
  fatigue: ROGUELITE_FATIGUE,
  stageScaling: ROGUELITE_STAGE_SCALING,
  enemies: ROGUELITE_ENEMIES,
  bosses: ROGUELITE_BOSSES,
  rewardTables: ROGUELITE_REWARD_TABLES,
  rewardRhythm: ROGUELITE_REWARD_RHYTHM,
  unsupportedEnabledRewards: ROGUELITE_UNSUPPORTED_ENABLED_REWARDS,
  unsupportedEnabledBosses: ROGUELITE_UNSUPPORTED_ENABLED_BOSSES,
  mechanics: ROGUELITE_BALANCE_MECHANICS,
} as const;
