import type { RogueliteReward, RogueliteRewardType } from "../types.js";
export type RogueliteStageType = "normal" | "elite" | "boss";
export type RogueliteRewardDraft = Omit<RogueliteReward, "id">;
export type RogueliteEnemyId = "normal" | "normal_gambler" | "normal_shield_breaker" | "normal_armor_piercer" | "elite_iron_skin" | "elite_berserker" | "elite_reaper" | "elite_armor_piercing";
export type RogueliteBossId = "boss_boxer_king" | "boss_blood_demon" | "boss_shield_guard" | "boss_god_berserker" | "boss_gambler_dealer";
export type RogueliteMechanicId = "fatigue" | "stage_scaling" | "reward_rhythm" | "boss_fixed_hp";
export type RogueliteRewardCategory = "starter" | "growth" | "character_skill" | "boss_ability";
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
    stage4To6: Readonly<Partial<Record<number, {
        hpBonus: number;
        shieldBonus: number;
    }>>>;
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
export declare const ROGUELITE_MAX_STAGE = 15;
export declare const ROGUELITE_PLAYER_START: {
    readonly characterId: "boxer";
    readonly summonerSkill: "disabled";
};
export declare const ROGUELITE_BOT_BASE: {
    readonly characterId: "boxer";
    readonly controllerId: "bot";
};
export declare const ROGUELITE_FATIGUE: {
    readonly startsAtRound: 9;
    readonly normalRounds: "1-8";
    readonly formula: "Math.max(0, Math.floor((round - 7) / 2))";
    readonly affects: "direct_attack_damage_only";
};
export declare const ROGUELITE_STAGE_SCALING: {
    readonly bossInterval: 6;
    readonly earlyStages: readonly [{
        readonly stage: 1;
        readonly enemyId: "normal";
        readonly hp: 12;
        readonly shield: 0;
        readonly description: "训练敌人";
    }, {
        readonly stage: 2;
        readonly enemyId: "normal";
        readonly hp: 12;
        readonly shield: 0;
        readonly description: "普通敌人";
    }];
    readonly stage4To6: {
        readonly 4: {
            readonly hpBonus: 10;
            readonly shieldBonus: 2;
        };
        readonly 5: {
            readonly hpBonus: 12;
            readonly shieldBonus: 4;
        };
        readonly 6: {
            readonly hpBonus: 15;
            readonly shieldBonus: 6;
        };
    };
    readonly stage7Plus: {
        readonly hpBonusFormula: "stage * 5";
        readonly hpBonusPerStage: 5;
        readonly shieldBonusFormula: "Math.floor(stage / 2) * 2";
        readonly shieldStageDivisor: 2;
        readonly shieldBonusPerStep: 2;
        readonly bossExtraHp: 10;
        readonly bossExtraShield: 4;
        readonly eliteExtraHp: 3;
        readonly eliteExtraShield: 2;
    };
};
export declare const ROGUELITE_ENEMIES: readonly [{
    readonly id: "normal";
    readonly name: "普通兵";
    readonly enemyTemplateId: "normal_training_dummy";
    readonly displayName: "训练假人";
    readonly enemyKind: "monster";
    readonly spriteKey: "normal_training_dummy";
    readonly portraitKey: "normal_training_dummy";
    readonly baseCharacterId: "boxer";
    readonly stageType: "normal";
    readonly hpBonus: 0;
    readonly shieldBonus: 0;
    readonly damageBonus: 0;
    readonly skills: readonly ["无特殊机制"];
    readonly description: "基础小怪。";
}, {
    readonly id: "normal_gambler";
    readonly name: "赌徒";
    readonly enemyTemplateId: "normal_gambler";
    readonly displayName: "赌徒";
    readonly enemyKind: "duelist";
    readonly spriteKey: "normal_gambler";
    readonly portraitKey: "normal_gambler";
    readonly baseCharacterId: "boxer";
    readonly stageType: "normal";
    readonly hpBonus: 0;
    readonly shieldBonus: 0;
    readonly damageBonus: 0;
    readonly skills: readonly ["赌徒：投 1 自伤 1，投 6 伤害 +2"];
    readonly description: "波动型小怪。";
}, {
    readonly id: "normal_shield_breaker";
    readonly name: "破盾兵";
    readonly enemyTemplateId: "normal_shield_breaker";
    readonly displayName: "破盾兵";
    readonly enemyKind: "monster";
    readonly spriteKey: "normal_shield_breaker";
    readonly portraitKey: "normal_shield_breaker";
    readonly baseCharacterId: "boxer";
    readonly stageType: "normal";
    readonly hpBonus: 0;
    readonly shieldBonus: 0;
    readonly damageBonus: 0;
    readonly skills: readonly ["破盾：攻击护盾时额外 +2 伤害"];
    readonly description: "克制护盾的小怪。";
}, {
    readonly id: "normal_armor_piercer";
    readonly name: "穿甲兵";
    readonly enemyTemplateId: "normal_armor_piercer";
    readonly displayName: "穿甲兵";
    readonly enemyKind: "monster";
    readonly spriteKey: "normal_armor_piercer";
    readonly portraitKey: "normal_armor_piercer";
    readonly baseCharacterId: "boxer";
    readonly stageType: "normal";
    readonly hpBonus: 0;
    readonly shieldBonus: 0;
    readonly damageBonus: 0;
    readonly skills: readonly ["穿甲：攻击无视 1 点护甲"];
    readonly description: "克制护甲的小怪。";
}, {
    readonly id: "elite_iron_skin";
    readonly name: "铁皮精英";
    readonly enemyTemplateId: "elite_iron_skin";
    readonly displayName: "铁皮精英";
    readonly enemyKind: "monster";
    readonly spriteKey: "elite_iron_skin";
    readonly portraitKey: "elite_iron_skin";
    readonly baseCharacterId: "boxer";
    readonly stageType: "elite";
    readonly hpBonus: 0;
    readonly shieldBonus: 0;
    readonly damageBonus: 0;
    readonly skills: readonly ["铁皮：护甲 +1", "整备：每回合获得 2 护盾"];
    readonly description: "防御型精英。";
}, {
    readonly id: "elite_berserker";
    readonly name: "狂暴精英";
    readonly enemyTemplateId: "elite_berserker";
    readonly displayName: "狂暴精英";
    readonly enemyKind: "monster";
    readonly spriteKey: "elite_berserker";
    readonly portraitKey: "elite_berserker";
    readonly baseCharacterId: "boxer";
    readonly stageType: "elite";
    readonly hpBonus: 0;
    readonly shieldBonus: 0;
    readonly damageBonus: 0;
    readonly skills: readonly ["狂暴：低于半血时伤害 +3"];
    readonly description: "残血爆发精英。";
}, {
    readonly id: "elite_reaper";
    readonly name: "收割精英";
    readonly enemyTemplateId: "elite_reaper";
    readonly displayName: "收割精英";
    readonly enemyKind: "monster";
    readonly spriteKey: "elite_reaper";
    readonly portraitKey: "elite_reaper";
    readonly baseCharacterId: "boxer";
    readonly stageType: "elite";
    readonly hpBonus: 0;
    readonly shieldBonus: 0;
    readonly damageBonus: 0;
    readonly skills: readonly ["收割：目标低于 40% 生命时伤害 +2"];
    readonly description: "压低血线后伤害提高的精英。";
}, {
    readonly id: "elite_armor_piercing";
    readonly name: "穿甲精英";
    readonly enemyTemplateId: "elite_armor_piercing";
    readonly displayName: "穿甲精英";
    readonly enemyKind: "monster";
    readonly spriteKey: "elite_armor_piercing";
    readonly portraitKey: "elite_armor_piercing";
    readonly baseCharacterId: "boxer";
    readonly stageType: "elite";
    readonly hpBonus: 0;
    readonly shieldBonus: 0;
    readonly damageBonus: 0;
    readonly skills: readonly ["穿甲：无视 1 点护甲", "破势：自身低于半血时无视 2 点护甲"];
    readonly description: "针对护甲流派的精英。";
}];
export declare const ROGUELITE_BOSSES: readonly [{
    readonly id: "boss_boxer_king";
    readonly name: "拳王";
    readonly enemyTemplateId: "boss_boxer_king";
    readonly displayName: "拳王";
    readonly enemyKind: "boss";
    readonly spriteKey: "boss_boxer_king";
    readonly portraitKey: "boss_boxer_king";
    readonly baseCharacterId: "boxer";
    readonly stageType: "boss";
    readonly baseHp: 18;
    readonly baseShield: 2;
    readonly skills: readonly ["蓄力：投 1/2 获得 1 层蓄力", "重拳：攻击时每层蓄力 +3 伤害并清空", "狂暴：低于半血时伤害 +2"];
    readonly description: "稳定蓄力和半血爆发的 Boss。";
}, {
    readonly id: "boss_blood_demon";
    readonly name: "血魔";
    readonly enemyTemplateId: "boss_blood_demon";
    readonly displayName: "血魔";
    readonly enemyKind: "boss";
    readonly spriteKey: "boss_blood_demon";
    readonly portraitKey: "boss_blood_demon";
    readonly baseCharacterId: "boxer";
    readonly stageType: "boss";
    readonly baseHp: 16;
    readonly baseShield: 0;
    readonly skills: readonly ["嗜血：造成生命伤害后回复 2", "血盾：投到 3 时获得 4 护盾", "血祭：低于 40% 生命时一次性回复 5 并获得 3 护盾"];
    readonly description: "低血量回复型 Boss。";
}, {
    readonly id: "boss_shield_guard";
    readonly name: "山盾守卫";
    readonly enemyTemplateId: "boss_shield_guard";
    readonly displayName: "山盾守卫";
    readonly enemyKind: "boss";
    readonly spriteKey: "boss_shield_guard";
    readonly portraitKey: "boss_shield_guard";
    readonly baseCharacterId: "boxer";
    readonly stageType: "boss";
    readonly baseHp: 14;
    readonly baseShield: 5;
    readonly skills: readonly ["铁壁：护甲 +1", "架盾：投 1/2 获得 5 护盾并使本次受伤 -2", "盾反：受到生命伤害后反击 2"];
    readonly description: "靠护盾和护甲拖慢战斗的 Boss。";
}, {
    readonly id: "boss_god_berserker";
    readonly name: "神狂战";
    readonly enemyTemplateId: "boss_god_berserker";
    readonly displayName: "神狂战";
    readonly enemyKind: "boss";
    readonly spriteKey: "boss_god_berserker";
    readonly portraitKey: "boss_god_berserker";
    readonly baseCharacterId: "boxer";
    readonly stageType: "boss";
    readonly baseHp: 20;
    readonly fixedHp: 20;
    readonly baseShield: 0;
    readonly skills: readonly ["神怒：攻击附加已损失生命值", "濒死：进入 15/10/5/1 血阈值", "终击：死亡前完成最后一击"];
    readonly description: "固定 20 血，强度来自残血爆发和终击机制。";
}, {
    readonly id: "boss_gambler_dealer";
    readonly name: "赌命庄家";
    readonly enemyTemplateId: "boss_gambler_dealer";
    readonly displayName: "赌命庄家";
    readonly enemyKind: "boss";
    readonly spriteKey: "boss_gambler_dealer";
    readonly portraitKey: "boss_gambler_dealer";
    readonly baseCharacterId: "boxer";
    readonly stageType: "boss";
    readonly baseHp: 16;
    readonly baseShield: 3;
    readonly skills: readonly ["洗牌：投 1-3 时重投一次", "抽税：玩家投 6 时自身获得 3 护盾", "梭哈：低于 30% 生命时伤害 +3"];
    readonly description: "骰点波动型 Boss。";
}];
export declare const ROGUELITE_GROWTH_REWARDS: readonly [{
    readonly name: "重拳训练";
    readonly description: "伤害 +1，生命上限 +2，回复 3。";
    readonly type: "heavy_punch_training";
    readonly value: 1;
    readonly tag: "burst";
}, {
    readonly name: "铁布衫";
    readonly description: "护甲 +1，每关开始护盾 +2。";
    readonly type: "iron_body";
    readonly value: 1;
    readonly tag: "armor";
}, {
    readonly name: "战斗喘息";
    readonly description: "最大生命 +5，获得时回复最大生命 40%，最低 8 点。";
    readonly type: "breathing_recovery";
    readonly value: 40;
    readonly tag: "heal";
}, {
    readonly name: "吸血拳法";
    readonly description: "伤害 +1，造成生命伤害后回复 1 生命。";
    readonly type: "blood_punch";
    readonly value: 1;
    readonly tag: "heal";
}, {
    readonly name: "战斗本能";
    readonly description: "伤害 +1，生命上限 +2，战后额外恢复 +2。";
    readonly type: "battle_instinct";
    readonly value: 1;
    readonly tag: "burst";
}, {
    readonly name: "防守训练";
    readonly description: "生命上限 +4，每关开始护盾 +3。";
    readonly type: "guard_training";
    readonly value: 4;
    readonly tag: "shield";
}, {
    readonly name: "生命强化";
    readonly description: "生命上限 +6，并回复 4 生命。";
    readonly type: "vitality_boost";
    readonly value: 6;
    readonly tag: "armor";
    readonly maxStacks: 3;
}, {
    readonly name: "护盾壁垒";
    readonly description: "获得 4 护盾，每关开始护盾 +4。";
    readonly type: "shield_wall";
    readonly value: 4;
    readonly tag: "shield";
    readonly maxStacks: 3;
}, {
    readonly name: "先手优势";
    readonly description: "攻击伤害 +3。";
    readonly type: "first_strike";
    readonly value: 3;
    readonly tag: "burst";
    readonly maxStacks: 3;
}, {
    readonly name: "绝境护甲";
    readonly description: "生命低于一半时护甲 +2。";
    readonly type: "low_hp_armor";
    readonly value: 2;
    readonly tag: "low_hp";
    readonly maxStacks: 3;
}, {
    readonly name: "战利品";
    readonly description: "击败敌人后升级一个成长。";
    readonly type: "kill_heal";
    readonly value: 1;
    readonly tag: "heal";
    readonly maxStacks: 3;
}, {
    readonly name: "饮血";
    readonly description: "直接攻击造成生命伤害后回复 3 生命。";
    readonly type: "drink_blood";
    readonly value: 3;
    readonly tag: "heal";
    readonly maxStacks: 3;
}, {
    readonly name: "翻盘之力";
    readonly description: "生命低于一半时，攻击伤害 +3。";
    readonly type: "comeback";
    readonly value: 3;
    readonly tag: "low_hp";
    readonly maxStacks: 2;
}, {
    readonly name: "低点防御";
    readonly description: "投到 1 或 2 时获得 3 护盾。";
    readonly type: "low_roll_defense";
    readonly value: 3;
    readonly tag: "shield";
    readonly maxStacks: 3;
}, {
    readonly name: "盾击";
    readonly description: "拥有护盾时攻击伤害 +2。";
    readonly type: "shield_strike";
    readonly value: 2;
    readonly tag: "shield";
    readonly maxStacks: 3;
}, {
    readonly name: "护盾过载";
    readonly description: "每关一次，攻击时消耗最多 10 护盾并追加一半为伤害。";
    readonly type: "shield_overload";
    readonly value: 1;
    readonly tag: "shield";
    readonly maxStacks: 1;
}, {
    readonly name: "稳固壁垒";
    readonly description: "有护盾时护甲 +1。";
    readonly type: "sturdy_bulwark";
    readonly value: 1;
    readonly tag: "shield";
    readonly maxStacks: 1;
}, {
    readonly name: "命运筹码";
    readonly description: "投到 1/2 获得筹码，3 个筹码可让骰点 +1。";
    readonly type: "fate_tokens";
    readonly value: 1;
    readonly tag: "dice";
    readonly maxStacks: 1;
}, {
    readonly name: "低点蓄力";
    readonly description: "投到 1/2/3 获得蓄力，投到 5/6 时每层 +2 伤害。";
    readonly type: "low_roll_charge";
    readonly value: 1;
    readonly tag: "dice";
    readonly maxStacks: 1;
}, {
    readonly name: "孤注一掷";
    readonly description: "预留/显示型奖励。";
    readonly type: "desperate_reroll";
    readonly value: 1;
    readonly tag: "dice";
    readonly maxStacks: 1;
}, {
    readonly name: "幸运保底";
    readonly description: "连续低点后，下一次投骰至少为 4。";
    readonly type: "lucky_floor";
    readonly value: 1;
    readonly tag: "dice";
    readonly maxStacks: 1;
}];
export declare const ROGUELITE_CHARACTER_SKILL_REWARDS: readonly [{
    readonly name: "枪手技能";
    readonly description: "Lv.1 投 6 时攻击伤害 x3；Lv.2 额外 +3；Lv.3 投 5/6 触发。";
    readonly type: "gunner_triple_shot";
    readonly value: 1;
    readonly maxStacks: 3;
}, {
    readonly name: "吸血鬼技能";
    readonly description: "造成生命伤害后回复等同等级的生命。";
    readonly type: "vampire_skill";
    readonly value: 1;
    readonly maxStacks: 3;
}, {
    readonly name: "赵子龙技能";
    readonly description: "攻击无视护盾和护甲；高等级增加穿透伤害 +1/+2/+4。";
    readonly type: "zhaoyun_pierce";
    readonly value: 1;
    readonly maxStacks: 3;
}, {
    readonly name: "火焰领主技能";
    readonly description: "攻击命中后添加等同等级的火焰印记，按 6 可以引爆，每层造成 3 点伤害。";
    readonly type: "flame_lord_mark";
    readonly value: 1;
    readonly maxStacks: 3;
}];
export declare const ROGUELITE_BOSS_ABILITY_REWARDS: readonly [{
    readonly name: "狂怒之血";
    readonly description: "攻击额外造成已损失生命一半的伤害。";
    readonly type: "berserker_blood";
    readonly value: 0;
}, {
    readonly name: "吸血本能";
    readonly description: "造成生命伤害后回复 2 生命，溢出转化为护盾。";
    readonly type: "vampire_instinct";
    readonly value: 2;
}, {
    readonly name: "龙胆之力";
    readonly description: "攻击无视护盾和护甲，叠层后额外伤害 +1。";
    readonly type: "dragon_courage";
    readonly value: 0;
}];
export declare const ROGUELITE_STARTER_REWARDS: readonly [{
    readonly name: "重拳开局";
    readonly description: "伤害 +2，生命上限 +4，回复 4 生命。";
    readonly type: "starter_heavy_punch";
    readonly value: 2;
    readonly tag: "burst";
}, {
    readonly name: "吸血开局";
    readonly description: "伤害 +1，造成生命伤害后回复 2 生命。";
    readonly type: "starter_blood_punch";
    readonly value: 1;
    readonly tag: "heal";
}, {
    readonly name: "铁壁开局";
    readonly description: "护甲 +1，生命上限 +6，每关开始护盾 +3。";
    readonly type: "starter_iron_wall";
    readonly value: 1;
    readonly tag: "shield";
}, {
    readonly name: "续航开局";
    readonly description: "生命上限 +8，每关胜利后额外恢复 5 生命。";
    readonly type: "starter_recovery";
    readonly value: 8;
    readonly tag: "heal";
}];
export declare const UNSUPPORTED_ROGUELITE_REWARD_TYPES: readonly [];
export declare const ROGUELITE_UNSUPPORTED_ENABLED_REWARDS: readonly [];
export declare const UNSUPPORTED_ROGUELITE_BOSS_IDS: readonly [];
export declare const ROGUELITE_UNSUPPORTED_ENABLED_BOSSES: readonly [];
export declare const ROGUELITE_REWARD_RHYTHM: readonly [{
    readonly stage: "1";
    readonly title: "基础奖励";
    readonly rewardTypes: readonly ["vitality_boost", "shield_wall", "heavy_punch_training", "iron_body", "breathing_recovery", "guard_training"];
    readonly notes: "第 1 关胜利后给基础生存或伤害奖励。";
}, {
    readonly stage: "2";
    readonly title: "流派启动";
    readonly rewardTypes: readonly ["low_roll_defense", "shield_strike", "fate_tokens", "low_roll_charge", "low_hp_armor", "comeback", "first_strike"];
    readonly notes: "第 2 关胜利后尽量来自不同 tag。";
}, {
    readonly stage: "3";
    readonly title: "核心技能";
    readonly rewardTypes: readonly ["shield_overload", "sturdy_bulwark", "lucky_floor", "drink_blood"];
    readonly notes: "第 3 关 Boss 胜利后给关键技能。";
}, {
    readonly stage: "4-6";
    readonly title: "流派强化";
    readonly rewardTypes: readonly [];
    readonly notes: "根据玩家已有 tag 略微提高同流派奖励出现概率。";
}, {
    readonly stage: "15";
    readonly title: "Boss 能力";
    readonly rewardTypes: readonly ["berserker_blood", "vampire_instinct", "dragon_courage"];
    readonly notes: "第 15 关大 Boss 后给质变能力。";
}];
export declare const ROGUELITE_BALANCE_MECHANICS: {
    readonly fatigue: {
        readonly startsAtRound: 9;
        readonly normalRounds: "1-8";
        readonly formula: "Math.max(0, Math.floor((round - 7) / 2))";
        readonly affects: "direct_attack_damage_only";
    };
    readonly stageScaling: {
        readonly bossInterval: 6;
        readonly earlyStages: readonly [{
            readonly stage: 1;
            readonly enemyId: "normal";
            readonly hp: 12;
            readonly shield: 0;
            readonly description: "训练敌人";
        }, {
            readonly stage: 2;
            readonly enemyId: "normal";
            readonly hp: 12;
            readonly shield: 0;
            readonly description: "普通敌人";
        }];
        readonly stage4To6: {
            readonly 4: {
                readonly hpBonus: 10;
                readonly shieldBonus: 2;
            };
            readonly 5: {
                readonly hpBonus: 12;
                readonly shieldBonus: 4;
            };
            readonly 6: {
                readonly hpBonus: 15;
                readonly shieldBonus: 6;
            };
        };
        readonly stage7Plus: {
            readonly hpBonusFormula: "stage * 5";
            readonly hpBonusPerStage: 5;
            readonly shieldBonusFormula: "Math.floor(stage / 2) * 2";
            readonly shieldStageDivisor: 2;
            readonly shieldBonusPerStep: 2;
            readonly bossExtraHp: 10;
            readonly bossExtraShield: 4;
            readonly eliteExtraHp: 3;
            readonly eliteExtraShield: 2;
        };
    };
    readonly normalEnemyRotationStartsAtStage: 7;
    readonly normalEnemyRotation: readonly ["normal", "normal_gambler", "normal_shield_breaker", "normal_armor_piercer"];
    readonly normalGamblerFallbackStartsAtStage: 4;
    readonly normalGamblerFallbackModulo: 4;
    readonly eliteStartsAtStage: 5;
    readonly eliteStageRule: "cycleStage === 5 && stage >= 5";
    readonly eliteEarlyPool: readonly ["elite_iron_skin", "elite_berserker"];
    readonly eliteLatePoolStartsAtStage: 10;
    readonly eliteLatePool: readonly ["elite_iron_skin", "elite_berserker", "elite_reaper", "elite_armor_piercing"];
    readonly bossStageRule: "cycleStage === 6 || cycleStage === 15";
    readonly bossAbilityRewardStage: 15;
};
export declare const ROGUELITE_REWARD_TABLES: Record<RogueliteRewardCategory, readonly RogueliteRewardDraft[]>;
export declare const rogueliteBalance: {
    readonly maxStage: 15;
    readonly playerStart: {
        readonly characterId: "boxer";
        readonly summonerSkill: "disabled";
    };
    readonly botBase: {
        readonly characterId: "boxer";
        readonly controllerId: "bot";
    };
    readonly stageScaling: {
        readonly bossInterval: 6;
        readonly earlyStages: readonly [{
            readonly stage: 1;
            readonly enemyId: "normal";
            readonly hp: 12;
            readonly shield: 0;
            readonly description: "训练敌人";
        }, {
            readonly stage: 2;
            readonly enemyId: "normal";
            readonly hp: 12;
            readonly shield: 0;
            readonly description: "普通敌人";
        }];
        readonly stage4To6: {
            readonly 4: {
                readonly hpBonus: 10;
                readonly shieldBonus: 2;
            };
            readonly 5: {
                readonly hpBonus: 12;
                readonly shieldBonus: 4;
            };
            readonly 6: {
                readonly hpBonus: 15;
                readonly shieldBonus: 6;
            };
        };
        readonly stage7Plus: {
            readonly hpBonusFormula: "stage * 5";
            readonly hpBonusPerStage: 5;
            readonly shieldBonusFormula: "Math.floor(stage / 2) * 2";
            readonly shieldStageDivisor: 2;
            readonly shieldBonusPerStep: 2;
            readonly bossExtraHp: 10;
            readonly bossExtraShield: 4;
            readonly eliteExtraHp: 3;
            readonly eliteExtraShield: 2;
        };
    };
    readonly enemies: readonly [{
        readonly id: "normal";
        readonly name: "普通兵";
        readonly enemyTemplateId: "normal_training_dummy";
        readonly displayName: "训练假人";
        readonly enemyKind: "monster";
        readonly spriteKey: "normal_training_dummy";
        readonly portraitKey: "normal_training_dummy";
        readonly baseCharacterId: "boxer";
        readonly stageType: "normal";
        readonly hpBonus: 0;
        readonly shieldBonus: 0;
        readonly damageBonus: 0;
        readonly skills: readonly ["无特殊机制"];
        readonly description: "基础小怪。";
    }, {
        readonly id: "normal_gambler";
        readonly name: "赌徒";
        readonly enemyTemplateId: "normal_gambler";
        readonly displayName: "赌徒";
        readonly enemyKind: "duelist";
        readonly spriteKey: "normal_gambler";
        readonly portraitKey: "normal_gambler";
        readonly baseCharacterId: "boxer";
        readonly stageType: "normal";
        readonly hpBonus: 0;
        readonly shieldBonus: 0;
        readonly damageBonus: 0;
        readonly skills: readonly ["赌徒：投 1 自伤 1，投 6 伤害 +2"];
        readonly description: "波动型小怪。";
    }, {
        readonly id: "normal_shield_breaker";
        readonly name: "破盾兵";
        readonly enemyTemplateId: "normal_shield_breaker";
        readonly displayName: "破盾兵";
        readonly enemyKind: "monster";
        readonly spriteKey: "normal_shield_breaker";
        readonly portraitKey: "normal_shield_breaker";
        readonly baseCharacterId: "boxer";
        readonly stageType: "normal";
        readonly hpBonus: 0;
        readonly shieldBonus: 0;
        readonly damageBonus: 0;
        readonly skills: readonly ["破盾：攻击护盾时额外 +2 伤害"];
        readonly description: "克制护盾的小怪。";
    }, {
        readonly id: "normal_armor_piercer";
        readonly name: "穿甲兵";
        readonly enemyTemplateId: "normal_armor_piercer";
        readonly displayName: "穿甲兵";
        readonly enemyKind: "monster";
        readonly spriteKey: "normal_armor_piercer";
        readonly portraitKey: "normal_armor_piercer";
        readonly baseCharacterId: "boxer";
        readonly stageType: "normal";
        readonly hpBonus: 0;
        readonly shieldBonus: 0;
        readonly damageBonus: 0;
        readonly skills: readonly ["穿甲：攻击无视 1 点护甲"];
        readonly description: "克制护甲的小怪。";
    }, {
        readonly id: "elite_iron_skin";
        readonly name: "铁皮精英";
        readonly enemyTemplateId: "elite_iron_skin";
        readonly displayName: "铁皮精英";
        readonly enemyKind: "monster";
        readonly spriteKey: "elite_iron_skin";
        readonly portraitKey: "elite_iron_skin";
        readonly baseCharacterId: "boxer";
        readonly stageType: "elite";
        readonly hpBonus: 0;
        readonly shieldBonus: 0;
        readonly damageBonus: 0;
        readonly skills: readonly ["铁皮：护甲 +1", "整备：每回合获得 2 护盾"];
        readonly description: "防御型精英。";
    }, {
        readonly id: "elite_berserker";
        readonly name: "狂暴精英";
        readonly enemyTemplateId: "elite_berserker";
        readonly displayName: "狂暴精英";
        readonly enemyKind: "monster";
        readonly spriteKey: "elite_berserker";
        readonly portraitKey: "elite_berserker";
        readonly baseCharacterId: "boxer";
        readonly stageType: "elite";
        readonly hpBonus: 0;
        readonly shieldBonus: 0;
        readonly damageBonus: 0;
        readonly skills: readonly ["狂暴：低于半血时伤害 +3"];
        readonly description: "残血爆发精英。";
    }, {
        readonly id: "elite_reaper";
        readonly name: "收割精英";
        readonly enemyTemplateId: "elite_reaper";
        readonly displayName: "收割精英";
        readonly enemyKind: "monster";
        readonly spriteKey: "elite_reaper";
        readonly portraitKey: "elite_reaper";
        readonly baseCharacterId: "boxer";
        readonly stageType: "elite";
        readonly hpBonus: 0;
        readonly shieldBonus: 0;
        readonly damageBonus: 0;
        readonly skills: readonly ["收割：目标低于 40% 生命时伤害 +2"];
        readonly description: "压低血线后伤害提高的精英。";
    }, {
        readonly id: "elite_armor_piercing";
        readonly name: "穿甲精英";
        readonly enemyTemplateId: "elite_armor_piercing";
        readonly displayName: "穿甲精英";
        readonly enemyKind: "monster";
        readonly spriteKey: "elite_armor_piercing";
        readonly portraitKey: "elite_armor_piercing";
        readonly baseCharacterId: "boxer";
        readonly stageType: "elite";
        readonly hpBonus: 0;
        readonly shieldBonus: 0;
        readonly damageBonus: 0;
        readonly skills: readonly ["穿甲：无视 1 点护甲", "破势：自身低于半血时无视 2 点护甲"];
        readonly description: "针对护甲流派的精英。";
    }];
    readonly bosses: readonly [{
        readonly id: "boss_boxer_king";
        readonly name: "拳王";
        readonly enemyTemplateId: "boss_boxer_king";
        readonly displayName: "拳王";
        readonly enemyKind: "boss";
        readonly spriteKey: "boss_boxer_king";
        readonly portraitKey: "boss_boxer_king";
        readonly baseCharacterId: "boxer";
        readonly stageType: "boss";
        readonly baseHp: 18;
        readonly baseShield: 2;
        readonly skills: readonly ["蓄力：投 1/2 获得 1 层蓄力", "重拳：攻击时每层蓄力 +3 伤害并清空", "狂暴：低于半血时伤害 +2"];
        readonly description: "稳定蓄力和半血爆发的 Boss。";
    }, {
        readonly id: "boss_blood_demon";
        readonly name: "血魔";
        readonly enemyTemplateId: "boss_blood_demon";
        readonly displayName: "血魔";
        readonly enemyKind: "boss";
        readonly spriteKey: "boss_blood_demon";
        readonly portraitKey: "boss_blood_demon";
        readonly baseCharacterId: "boxer";
        readonly stageType: "boss";
        readonly baseHp: 16;
        readonly baseShield: 0;
        readonly skills: readonly ["嗜血：造成生命伤害后回复 2", "血盾：投到 3 时获得 4 护盾", "血祭：低于 40% 生命时一次性回复 5 并获得 3 护盾"];
        readonly description: "低血量回复型 Boss。";
    }, {
        readonly id: "boss_shield_guard";
        readonly name: "山盾守卫";
        readonly enemyTemplateId: "boss_shield_guard";
        readonly displayName: "山盾守卫";
        readonly enemyKind: "boss";
        readonly spriteKey: "boss_shield_guard";
        readonly portraitKey: "boss_shield_guard";
        readonly baseCharacterId: "boxer";
        readonly stageType: "boss";
        readonly baseHp: 14;
        readonly baseShield: 5;
        readonly skills: readonly ["铁壁：护甲 +1", "架盾：投 1/2 获得 5 护盾并使本次受伤 -2", "盾反：受到生命伤害后反击 2"];
        readonly description: "靠护盾和护甲拖慢战斗的 Boss。";
    }, {
        readonly id: "boss_god_berserker";
        readonly name: "神狂战";
        readonly enemyTemplateId: "boss_god_berserker";
        readonly displayName: "神狂战";
        readonly enemyKind: "boss";
        readonly spriteKey: "boss_god_berserker";
        readonly portraitKey: "boss_god_berserker";
        readonly baseCharacterId: "boxer";
        readonly stageType: "boss";
        readonly baseHp: 20;
        readonly fixedHp: 20;
        readonly baseShield: 0;
        readonly skills: readonly ["神怒：攻击附加已损失生命值", "濒死：进入 15/10/5/1 血阈值", "终击：死亡前完成最后一击"];
        readonly description: "固定 20 血，强度来自残血爆发和终击机制。";
    }, {
        readonly id: "boss_gambler_dealer";
        readonly name: "赌命庄家";
        readonly enemyTemplateId: "boss_gambler_dealer";
        readonly displayName: "赌命庄家";
        readonly enemyKind: "boss";
        readonly spriteKey: "boss_gambler_dealer";
        readonly portraitKey: "boss_gambler_dealer";
        readonly baseCharacterId: "boxer";
        readonly stageType: "boss";
        readonly baseHp: 16;
        readonly baseShield: 3;
        readonly skills: readonly ["洗牌：投 1-3 时重投一次", "抽税：玩家投 6 时自身获得 3 护盾", "梭哈：低于 30% 生命时伤害 +3"];
        readonly description: "骰点波动型 Boss。";
    }];
    readonly rewardTables: Record<RogueliteRewardCategory, readonly RogueliteRewardDraft[]>;
    readonly rewardRhythm: readonly [{
        readonly stage: "1";
        readonly title: "基础奖励";
        readonly rewardTypes: readonly ["vitality_boost", "shield_wall", "heavy_punch_training", "iron_body", "breathing_recovery", "guard_training"];
        readonly notes: "第 1 关胜利后给基础生存或伤害奖励。";
    }, {
        readonly stage: "2";
        readonly title: "流派启动";
        readonly rewardTypes: readonly ["low_roll_defense", "shield_strike", "fate_tokens", "low_roll_charge", "low_hp_armor", "comeback", "first_strike"];
        readonly notes: "第 2 关胜利后尽量来自不同 tag。";
    }, {
        readonly stage: "3";
        readonly title: "核心技能";
        readonly rewardTypes: readonly ["shield_overload", "sturdy_bulwark", "lucky_floor", "drink_blood"];
        readonly notes: "第 3 关 Boss 胜利后给关键技能。";
    }, {
        readonly stage: "4-6";
        readonly title: "流派强化";
        readonly rewardTypes: readonly [];
        readonly notes: "根据玩家已有 tag 略微提高同流派奖励出现概率。";
    }, {
        readonly stage: "15";
        readonly title: "Boss 能力";
        readonly rewardTypes: readonly ["berserker_blood", "vampire_instinct", "dragon_courage"];
        readonly notes: "第 15 关大 Boss 后给质变能力。";
    }];
    readonly mechanics: {
        readonly fatigue: {
            readonly startsAtRound: 9;
            readonly normalRounds: "1-8";
            readonly formula: "Math.max(0, Math.floor((round - 7) / 2))";
            readonly affects: "direct_attack_damage_only";
        };
        readonly stageScaling: {
            readonly bossInterval: 6;
            readonly earlyStages: readonly [{
                readonly stage: 1;
                readonly enemyId: "normal";
                readonly hp: 12;
                readonly shield: 0;
                readonly description: "训练敌人";
            }, {
                readonly stage: 2;
                readonly enemyId: "normal";
                readonly hp: 12;
                readonly shield: 0;
                readonly description: "普通敌人";
            }];
            readonly stage4To6: {
                readonly 4: {
                    readonly hpBonus: 10;
                    readonly shieldBonus: 2;
                };
                readonly 5: {
                    readonly hpBonus: 12;
                    readonly shieldBonus: 4;
                };
                readonly 6: {
                    readonly hpBonus: 15;
                    readonly shieldBonus: 6;
                };
            };
            readonly stage7Plus: {
                readonly hpBonusFormula: "stage * 5";
                readonly hpBonusPerStage: 5;
                readonly shieldBonusFormula: "Math.floor(stage / 2) * 2";
                readonly shieldStageDivisor: 2;
                readonly shieldBonusPerStep: 2;
                readonly bossExtraHp: 10;
                readonly bossExtraShield: 4;
                readonly eliteExtraHp: 3;
                readonly eliteExtraShield: 2;
            };
        };
        readonly normalEnemyRotationStartsAtStage: 7;
        readonly normalEnemyRotation: readonly ["normal", "normal_gambler", "normal_shield_breaker", "normal_armor_piercer"];
        readonly normalGamblerFallbackStartsAtStage: 4;
        readonly normalGamblerFallbackModulo: 4;
        readonly eliteStartsAtStage: 5;
        readonly eliteStageRule: "cycleStage === 5 && stage >= 5";
        readonly eliteEarlyPool: readonly ["elite_iron_skin", "elite_berserker"];
        readonly eliteLatePoolStartsAtStage: 10;
        readonly eliteLatePool: readonly ["elite_iron_skin", "elite_berserker", "elite_reaper", "elite_armor_piercing"];
        readonly bossStageRule: "cycleStage === 6 || cycleStage === 15";
        readonly bossAbilityRewardStage: 15;
    };
};
