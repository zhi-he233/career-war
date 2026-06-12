import type { Character, CharacterId } from "./types.js";

export const characters: Record<CharacterId, Character> = {
  boxer: {
    id: "boxer",
    name: "拳手",
    maxHp: 20,
    description: ["无技能", "投到几点造成几点伤害"]
  },
  gunslinger: {
    id: "gunslinger",
    name: "枪手",
    maxHp: 20,
    description: ["基础伤害 -1", "6 点再投一次，第二次骰点 x3", "1 点复制上一名玩家最终伤害"]
  },
  vampire: {
    id: "vampire",
    name: "吸血鬼",
    maxHp: 15,
    description: ["3 点无伤", "1 点造成 1 伤害并回复 2 血", "6 点再投一次，回复骰点 x3，溢出变护盾"]
  },
  zhaoZilong: {
    id: "zhaoZilong",
    name: "赵子龙",
    maxHp: 20,
    description: ["1 点无伤", "造成伤害时无视护盾"]
  },
  assassin: {
    id: "assassin",
    name: "刺客",
    maxHp: 15,
    description: ["基础伤害 +1", "1 点造成 3 点伤害"]
  },
  paladin: {
    id: "paladin",
    name: "圣骑士",
    maxHp: 20,
    description: ["1 点无伤", "4 点全员无敌，持续到圣骑士下一次行动开始前"]
  },
  berserker: {
    id: "berserker",
    name: "狂战士",
    maxHp: 10,
    description: ["血量很低，但越残血伤害越高", "损失了多少血，本次攻击就额外增加多少伤害"]
  }
};

export const characterList = Object.values(characters);
