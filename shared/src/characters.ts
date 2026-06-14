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
  zhaoZilong: {
    id: "zhaoZilong",
    name: "赵子龙",
    maxHp: 20,
    description: ["1 点无伤", "造成伤害时无视护盾", "每成功造成 3 次血量伤害后，回复 2 点血"],
    difficulty: "normal",
    role: "attack",
    tags: ["新手推荐", "攻击", "破盾"],
    shortDescription: "攻击能无视护盾，连续造成血量伤害后会回复自己。",
    fullDescription: ["1 点无伤", "造成伤害时无视护盾", "龙胆：每成功造成 3 次血量伤害后，回复 2 点血，触发后计数清零。"],
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
    fullDescription: ["刺客（斩）最大血量 15。", "投到 1 时无伤。", "目标血量越低，伤害越高；目标血量低于最大血量的 3/4 时伤害 +1，低于 1/2 时伤害 +2。", "若目标当前血量小于等于 3，则投骰后可以直接斩杀目标，斩杀无视护盾和无敌。"],
    isImplemented: true
  }
};

export const characterList = Object.values(characters);
