import { GENERATED_ROGUELITE_BOSS_ABILITY_REWARDS, GENERATED_ROGUELITE_BOSSES, GENERATED_ROGUELITE_CHARACTER_SKILL_REWARDS, GENERATED_ROGUELITE_ENEMIES, GENERATED_ROGUELITE_GROWTH_REWARDS, GENERATED_ROGUELITE_STARTER_REWARDS, } from "./rogueliteBalance.generated.js";
export const ROGUELITE_MAX_STAGE = 15;
export const ROGUELITE_PLAYER_START = {
    characterId: "boxer",
    summonerSkill: "disabled",
};
export const ROGUELITE_BOT_BASE = {
    characterId: "boxer",
    controllerId: "bot",
};
export const ROGUELITE_FATIGUE = {
    startsAtRound: 9,
    normalRounds: "1-8",
    formula: "Math.max(0, Math.floor((round - 7) / 2))",
    affects: "direct_attack_damage_only",
};
export const ROGUELITE_STAGE_SCALING = {
    bossInterval: 6,
    earlyStages: [
        {
            stage: 1,
            enemyId: "normal",
            hp: 12,
            shield: 0,
            description: "训练敌人",
        },
        {
            stage: 2,
            enemyId: "normal",
            hp: 12,
            shield: 0,
            description: "普通敌人",
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
};
export const ROGUELITE_ENEMIES = GENERATED_ROGUELITE_ENEMIES;
export const ROGUELITE_BOSSES = GENERATED_ROGUELITE_BOSSES;
export const ROGUELITE_GROWTH_REWARDS = GENERATED_ROGUELITE_GROWTH_REWARDS;
export const ROGUELITE_CHARACTER_SKILL_REWARDS = GENERATED_ROGUELITE_CHARACTER_SKILL_REWARDS;
export const ROGUELITE_BOSS_ABILITY_REWARDS = GENERATED_ROGUELITE_BOSS_ABILITY_REWARDS;
export const ROGUELITE_STARTER_REWARDS = GENERATED_ROGUELITE_STARTER_REWARDS;
export const UNSUPPORTED_ROGUELITE_REWARD_TYPES = [];
export const ROGUELITE_UNSUPPORTED_ENABLED_REWARDS = [];
export const UNSUPPORTED_ROGUELITE_BOSS_IDS = [];
export const ROGUELITE_UNSUPPORTED_ENABLED_BOSSES = [];
export const ROGUELITE_REWARD_RHYTHM = [
    {
        stage: "1",
        title: "基础奖励",
        rewardTypes: ["vitality_boost", "shield_wall", "heavy_punch_training", "iron_body", "breathing_recovery", "guard_training"],
        notes: "第 1 关胜利后给基础生存或伤害奖励。",
    },
    {
        stage: "2",
        title: "流派启动",
        rewardTypes: ["low_roll_defense", "shield_strike", "fate_tokens", "low_roll_charge", "low_hp_armor", "comeback", "first_strike"],
        notes: "第 2 关胜利后尽量来自不同 tag。",
    },
    {
        stage: "3",
        title: "核心技能",
        rewardTypes: ["shield_overload", "sturdy_bulwark", "lucky_floor", "drink_blood"],
        notes: "第 3 关 Boss 胜利后给关键技能。",
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
        notes: "第 15 关大 Boss 后给质变能力。",
    },
];
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
};
export const ROGUELITE_REWARD_TABLES = {
    starter: ROGUELITE_STARTER_REWARDS,
    growth: ROGUELITE_GROWTH_REWARDS,
    character_skill: ROGUELITE_CHARACTER_SKILL_REWARDS,
    boss_ability: ROGUELITE_BOSS_ABILITY_REWARDS,
};
export const rogueliteBalance = {
    maxStage: ROGUELITE_MAX_STAGE,
    playerStart: ROGUELITE_PLAYER_START,
    botBase: ROGUELITE_BOT_BASE,
    stageScaling: ROGUELITE_STAGE_SCALING,
    enemies: ROGUELITE_ENEMIES,
    bosses: ROGUELITE_BOSSES,
    rewardTables: ROGUELITE_REWARD_TABLES,
    rewardRhythm: ROGUELITE_REWARD_RHYTHM,
    mechanics: ROGUELITE_BALANCE_MECHANICS,
};
