import type { Character, RoomSettings, SummonerSkillId } from "@career-war/shared";

export type CharacterFilter = "all" | "newbie" | "attack" | "defense" | "healing" | "burst" | "special";
export type CharacterCard = Omit<Character, "id"> & { id: string };

export const CAREER_DETAIL_TAGS: Partial<Record<string, string[]>> = {
  zhaoZilong: ["破盾", "回血", "稳定输出"],
  mountain_shield: ["防御", "护盾", "坦克"],
  fire_lord: ["灼烧", "爆发", "持续伤害"],
  self_destructor: ["高风险", "爆炸", "赌命"],
  vampire: ["吸血", "回复", "消耗"]
};

export const CAREER_ART_ID_ALIASES: Record<string, string> = {
  warKnight: "war_knight"
};

export const FILTERS: Array<{ id: CharacterFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "newbie", label: "新手推荐" },
  { id: "attack", label: "攻击" },
  { id: "defense", label: "防御" },
  { id: "healing", label: "治疗" },
  { id: "burst", label: "爆发" },
  { id: "special", label: "特殊" }
];

export const DIFFICULTY_LABELS: Record<NonNullable<Character["difficulty"]>, string> = {
  simple: "简单",
  normal: "普通",
  complex: "复杂",
  expert: "高手"
};

export const ROLE_LABELS: Record<NonNullable<Character["role"]>, string> = {
  attack: "攻击",
  defense: "防御",
  healing: "治疗",
  burst: "爆发",
  special: "特殊"
};

export const MAX_PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8];
export const CHARACTER_PAGE_SIZE = 4;
export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  allowDuplicateCharacters: true,
  gameMode: "classic"
};
export const SUMMONER_SKILLS: Array<{ id: SummonerSkillId; name: string; description: string }> = [
  { id: "lucky_plus_one", name: "幸运骰", description: "投后让本次主骰 +1，最高 6。开局预冷却：2 次自己的行动。使用后冷却：3 次自己的行动。" },
  { id: "first_aid", name: "急救术", description: "本次不攻击，改为回复自己等于骰点的血量。冷却：3 次自己的行动。" },
  { id: "iron_wall", name: "铁壁", description: "本次不攻击，改为获得等于骰点的护盾。冷却：3 次自己的行动。" },
  { id: "fate_reroll", name: "命运重掷", description: "服务器重新投一次主骰，必须接受新骰点。冷却：3 次自己的行动。" },
  { id: "last_stand", name: "破釜", description: "攻击伤害行动可用，最终伤害 +2，自己受 2 点反噬。冷却：3 次自己的行动。" }
];
export type SummonerSkill = (typeof SUMMONER_SKILLS)[number];

export const LOCKED_CHARACTERS: CharacterCard[] = [
  {
    id: "warKnight",
    name: "战争骑士",
    maxHp: 20,
    description: ["未开放"],
    difficulty: "complex",
    role: "attack",
    tags: ["攻击", "未开放"],
    shortDescription: "攻守节奏型职业，后续版本开放。",
    isImplemented: false
  },
  {
    id: "priest",
    name: "牧师",
    maxHp: 18,
    description: ["未开放"],
    difficulty: "normal",
    role: "healing",
    tags: ["治疗", "未开放"],
    shortDescription: "团队治疗型职业，后续版本开放。",
    isImplemented: false
  },
  {
    id: "shenNong",
    name: "神农氏",
    maxHp: 18,
    description: ["未开放"],
    difficulty: "complex",
    role: "special",
    tags: ["治疗", "特殊", "未开放"],
    shortDescription: "药草与恢复相关的特殊职业，后续版本开放。",
    isImplemented: false
  },
  {
    id: "counterflow",
    name: "逆流",
    maxHp: 16,
    description: ["未开放"],
    difficulty: "expert",
    role: "special",
    tags: ["特殊", "高手", "未开放"],
    shortDescription: "反转局势型职业，后续版本开放。",
    isImplemented: false
  }
];
