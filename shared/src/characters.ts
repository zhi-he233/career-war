import type { Character, CharacterId } from "./types.js";

export const characters: Record<CharacterId, Character> = {
  boxer: {
    id: "boxer",
    name: "拳手",
    maxHp: 20,
    description: ["无技能", "投到几点造成几点伤害"],
    difficulty: "simple",
    role: "attack",
    tags: ["新手推荐", "攻击", "稳定"],
    shortDescription: "没有额外规则，按骰点造成伤害。",
    fullDescription: ["无技能", "投到几点造成几点伤害"],
    isImplemented: true
  },
  gunslinger: {
    id: "gunslinger",
    name: "枪手",
    maxHp: 18,
    description: ["基础伤害 -1", "6 点再投一次，第二次骰点 x3", "1 点复制上一名玩家最终伤害"],
    difficulty: "complex",
    role: "burst",
    tags: ["攻击", "爆发", "连投"],
    shortDescription: "低保伤害偏低，但 6 点能打出高额爆发。",
    fullDescription: ["基础伤害 -1", "6 点再投一次，第二次骰点 x3", "1 点复制上一名玩家最终伤害"],
    isImplemented: true
  },
  vampire: {
    id: "vampire",
    name: "吸血鬼",
    maxHp: 15,
    description: ["3 点无伤", "1 点造成 1 伤害并回复 2 血", "6 点再投一次，回复骰点 x3，溢出变护盾"],
    difficulty: "complex",
    role: "healing",
    tags: ["治疗", "续航", "特殊"],
    shortDescription: "靠吸血和额外回复维持生存。",
    fullDescription: ["3 点无伤", "1 点造成 1 伤害并回复 2 血", "6 点再投一次，回复骰点 x3，溢出变护盾"],
    isImplemented: true
  },
  // Zhao Zilong balance rule: only roll 4 is no-damage; it is not a skill and roll 1 is not no-damage.
  zhaoZilong: {
    id: "zhaoZilong",
    name: "赵子龙",
    maxHp: 20,
    description: ["4 点无伤", "造成伤害时无视护盾", "龙胆：每成功造成 3 次血量伤害后，回复 2 点血"],
    difficulty: "normal",
    role: "attack",
    tags: ["新手推荐", "攻击", "破盾"],
    shortDescription: "攻击能无视护盾，连续造成血量伤害后会回复自己。",
    fullDescription: ["4 点无伤：投出 4 时不造成伤害，自动跳过行动", "造成伤害时无视护盾", "龙胆：每成功造成 3 次血量伤害后，回复 2 点血，触发后计数清零。"],
    isImplemented: true
  },
  assassin: {
    id: "assassin",
    name: "刺客",
    maxHp: 15,
    description: ["基础伤害 +1", "1 点造成 3 点伤害"],
    difficulty: "normal",
    role: "burst",
    tags: ["攻击", "爆发", "低血量"],
    shortDescription: "血量较低，但基础输出更凶。",
    fullDescription: ["基础伤害 +1", "1 点造成 3 点伤害"],
    isImplemented: true
  },
  paladin: {
    id: "paladin",
    name: "圣骑士",
    maxHp: 20,
    description: ["1 点无伤", "4 点全员无敌，持续到圣骑士下一次行动开始前，并获得 3 点护盾"],
    difficulty: "complex",
    role: "defense",
    tags: ["防御", "特殊", "团队"],
    shortDescription: "能制造全员无敌窗口，并在发动时保护自己。",
    fullDescription: ["1 点无伤", "4 点全员无敌，持续到圣骑士下一次行动开始前", "发动 4 点技能时，圣骑士自己获得 3 点护盾。"],
    isImplemented: true
  },
  berserker: {
    id: "berserker",
    name: "狂战士",
    maxHp: 10,
    description: ["血量很低，但越残血伤害越高", "损失了多少血，本次攻击就额外增加多少伤害"],
    difficulty: "expert",
    role: "burst",
    tags: ["爆发", "高手", "低血量"],
    shortDescription: "高风险高回报，残血时爆发极高。",
    fullDescription: ["血量很低，但越残血伤害越高", "损失了多少血，本次攻击就额外增加多少伤害"],
    isImplemented: true
  },
  stone_titan: {
    id: "stone_titan",
    name: "巨石泰坦",
    maxHp: 30,
    description: ["1、2、3、4 点无伤", "5 点造成 5 点伤害", "6 点造成 9 点伤害"],
    difficulty: "simple",
    role: "defense",
    tags: ["防御", "重装", "高血量", "低频爆发"],
    shortDescription: "血量极高，但低点数经常打不出伤害。",
    fullDescription: ["巨石泰坦拥有 30 点血量。", "投到 1、2、3、4 时不会造成伤害。", "投到 5 时造成 5 点伤害；投到 6 时造成 9 点伤害。"],
    isImplemented: true
  },
  fearless_assassin: {
    id: "fearless_assassin",
    name: "刺客（无畏）",
    maxHp: 15,
    description: ["1 点无伤", "满血伤害 +3", "血量高于 10 伤害 +2", "血量高于 5 伤害 +1"],
    difficulty: "normal",
    role: "burst",
    tags: ["攻击", "爆发", "血量收益"],
    shortDescription: "血量越健康，攻击越凶。",
    fullDescription: ["刺客（无畏）最大血量 15。", "投到 1 时无伤。", "满血时伤害 +3；血量高于 10 时伤害 +2；血量高于 5 时伤害 +1；血量小于等于 5 时造成普通伤害。"],
    isImplemented: true
  },
  execution_assassin: {
    id: "execution_assassin",
    name: "刺客（斩）",
    maxHp: 15,
    description: ["1 点无伤", "目标血量低于 3/4 时伤害 +1", "目标血量低于 1/2 时伤害 +2", "目标血量小于等于 3 时直接斩杀"],
    difficulty: "complex",
    role: "attack",
    tags: ["攻击", "收割", "斩杀", "残血收割"],
    shortDescription: "擅长收割残血目标。",
    fullDescription: ["刺客（斩）最大血量 15。", "投到 1 时无伤。", "目标血量越低，伤害越高；目标血量低于最大血量的 3/4 时伤害 +1，低于 1/2 时伤害 +2。", "若目标当前血量小于等于 3，则可尝试处决；只有本次最终结算后生命扣到 0 才会斩杀。"],
    isImplemented: true
  },
  self_destructor: {
    id: "self_destructor",
    name: "自爆人",
    maxHp: 20,
    description: ["1 点无伤", "6 点可选择发动自爆", "选择扣除自己 1 到 9 点血量，对目标造成扣血量 x2 的普通伤害"],
    difficulty: "complex",
    role: "burst",
    tags: ["攻击", "爆发", "高风险"],
    shortDescription: "用自己的血量换取爆发伤害。",
    fullDescription: ["自爆人最大血量 20。", "投到 1 时无伤。", "投到 6 时可以普通攻击造成 6 点伤害；也可以发动自爆：选择扣除自己 1 到 9 点血量，然后对目标造成扣血量 x2 的普通伤害，最高 18。", "扣血直接扣除自爆人血量，不经过自己的护盾；不能选择超过当前血量的扣血量。"],
    isImplemented: true
  },
  war_knight: {
    id: "war_knight",
    name: "战争骑士",
    maxHp: 20,
    description: ["自己造成伤害 -1", "护甲 +1", "3 点可选择回复 3 点血"],
    difficulty: "normal",
    role: "defense",
    tags: ["防御", "护甲", "续航"],
    shortDescription: "攻势较稳，拥有护甲和少量回复。",
    fullDescription: ["战争骑士最大血量 20。", "自己造成伤害 -1，最低为 0。", "护甲 +1。", "投到 3 时可以普通攻击造成 2 点伤害；也可以发动技能回复 3 点血，不能超过最大血量。"],
    isImplemented: true
  },
  crescent_moon: {
    id: "crescent_moon",
    name: "残月者",
    maxHp: 15,
    description: ["初始 3 血", "行动开始回复 2 点血", "伤害 +2", "6 点可选择造成 9 点伤害"],
    difficulty: "complex",
    role: "burst",
    tags: ["攻击", "爆发", "续航", "低血量"],
    shortDescription: "开局极脆，但会逐步恢复并打出高伤害。",
    fullDescription: ["残月者最大血量 15，初始血量 3。", "每到自己行动开始时回复 2 点血，不能超过最大血量。", "普通伤害为骰点 +2。", "投到 6 时可以普通攻击造成 8 点伤害；也可以发动技能造成固定 9 点伤害。"],
    isImplemented: true
  },
  fire_lord: {
    id: "fire_lord",
    name: "火焰领主",
    maxHp: 16,
    description: ["3 点可选择火焰印记，普通攻击无效果", "攻击敌方时添加 1 层火焰印记", "6 点可选择爆发目标火焰印记，每层造成 3 点普通伤害并清空"],
    difficulty: "complex",
    role: "attack",
    tags: ["攻击", "印记", "爆发"],
    shortDescription: "通过叠加火焰印记制造爆发窗口。",
    fullDescription: ["火焰领主最大血量 16。", "投到 3 时普通攻击不造成伤害且不添加火焰印记；也可以发动火焰印记技能，不造成伤害并添加 1 层火焰印记。", "每次普通攻击敌方时，给目标添加 1 层火焰印记。", "投到 6 时可以普通攻击造成 6 点伤害并添加 1 层火焰印记；也可以发动技能，爆发目标身上的火焰印记，每层造成 3 点普通伤害，爆发后清空目标火焰印记。"],
    isImplemented: true
  },
  mountain_shield: {
    id: "mountain_shield",
    name: "山盾",
    maxHp: 25,
    description: ["自己造成伤害 -1", "护甲 +1", "6 点可选择进入架盾状态", "架盾时自己额外伤害 -1、额外护甲 +1，队友和自己团体护甲 +2"],
    difficulty: "complex",
    role: "defense",
    tags: ["防御", "护甲", "团队"],
    shortDescription: "用架盾状态保护自己和队友。",
    fullDescription: ["山盾最大血量 25。", "自己造成伤害 -1，护甲 +1。", "投到 6 时可以普通攻击造成 5 点伤害，若正在架盾则造成 4 点伤害；也可以发动技能进入架盾状态，不额外造成伤害。", "架盾状态下，山盾自己的伤害额外 -1，自己的护甲额外 +1，所有队友包括山盾自己获得团体护甲 +2。", "每到山盾行动开始时先投骰，1-4 继续架盾，5-6 结束架盾。"],
    isImplemented: true
  }
};

export const characterList = Object.values(characters);
