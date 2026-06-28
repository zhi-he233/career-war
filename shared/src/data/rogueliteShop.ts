import {
  GENERATED_ROGUELITE_ACTIVE_SHOP_ITEM_IDS,
  GENERATED_ROGUELITE_SHOP_ITEMS,
  GENERATED_ROGUELITE_SHOP_RULES,
} from "./rogueliteShop.generated.js";

export type RogueliteShopItemType = "heal" | "relic" | "perk" | "skill" | "remove" | "reroll";
export type RogueliteShopStage = "early" | "mid" | "late" | "mid_late" | "any";

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
  canBuyRouteInfo: boolean;
  canBuyTemporaryBoost: boolean;
}

export const ROGUELITE_SHOP_RULES: RogueliteShopRules = GENERATED_ROGUELITE_SHOP_RULES;

export const ROGUELITE_SHOP_ITEMS: readonly RogueliteShopItemDraft[] = GENERATED_ROGUELITE_SHOP_ITEMS;

export const ROGUELITE_ACTIVE_SHOP_ITEM_IDS: readonly string[] = GENERATED_ROGUELITE_ACTIVE_SHOP_ITEM_IDS;
