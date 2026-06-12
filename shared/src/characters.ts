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
    maxHp: 20,
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
  zhaoZilong: {
    id: "zhaoZilong",
    name: "赵子龙",
    maxHp: 20,
    description: ["1 点无伤", "造成伤害时无视护盾"],
    difficulty: "normal",
    role: "attack",
    tags: ["新手推荐", "攻击", "破盾"],
    shortDescription: "攻击能无视护盾，适合针对高护盾目标。",
    fullDescription: ["1 点无伤", "造成伤害时无视护盾"],
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
    description: ["1 点无伤", "4 点全员无敌，持续到圣骑士下一次行动开始前"],
    difficulty: "complex",
    role: "defense",
    tags: ["防御", "特殊", "团队"],
    shortDescription: "能制造全员无敌窗口，改变局势节奏。",
    fullDescription: ["1 点无伤", "4 点全员无敌，持续到圣骑士下一次行动开始前"],
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
  }
};

export const characterList = Object.values(characters);
