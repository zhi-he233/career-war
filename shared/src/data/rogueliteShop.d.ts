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
export declare const ROGUELITE_SHOP_RULES: RogueliteShopRules;
export declare const ROGUELITE_SHOP_ITEMS: readonly RogueliteShopItemDraft[];
export declare const ROGUELITE_ACTIVE_SHOP_ITEM_IDS: readonly string[];
