export type RogueliteShopItemType = "heal" | "relic" | "perk" | "skill" | "remove" | "reroll";
export type RogueliteShopStage = "early" | "mid" | "late" | "any";

export interface RogueliteShopItemDraft {
  id: string;
  name: string;
  type: RogueliteShopItemType;
  price: number;
  stage: RogueliteShopStage;
  effect: string;
  limit: string;
  notes?: string;
}

export interface RogueliteShopRules {
  itemsPerVisit: number;
  canRefresh: boolean;
  refreshPrice: number;
  canBuyHeal: boolean;
  canBuySkill: boolean;
  canBuyGrowth: boolean;
  canRemoveNegative: boolean;
}

export const ROGUELITE_SHOP_RULES = {
  itemsPerVisit: 3,
  canRefresh: true,
  refreshPrice: 20,
  canBuyHeal: true,
  canBuySkill: true,
  canBuyGrowth: true,
  canRemoveNegative: true,
} as const satisfies RogueliteShopRules;

export const ROGUELITE_SHOP_ITEMS = [
  {
    id: "cheap_coffee",
    name: "续命咖啡",
    type: "heal",
    price: 25,
    stage: "any",
    effect: "回复少量生命",
    limit: "每次商店 1 次",
    notes: "基础回血商品。",
  },
  {
    id: "interview_notes",
    name: "面试小抄",
    type: "perk",
    price: 45,
    stage: "early",
    effect: "获得一个普通成长",
    limit: "不限",
    notes: "前期成长入口。",
  },
  {
    id: "respec_coupon",
    name: "复盘券",
    type: "reroll",
    price: 30,
    stage: "any",
    effect: "刷新当前商店商品",
    limit: "每次商店 2 次",
    notes: "后续可以和刷新价格联动。",
  },
] as const satisfies readonly RogueliteShopItemDraft[];
