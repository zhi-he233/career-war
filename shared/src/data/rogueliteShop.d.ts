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
export declare const ROGUELITE_SHOP_RULES: {
    readonly itemsPerVisit: 3;
    readonly canRefresh: true;
    readonly refreshPrice: 20;
    readonly canBuyHeal: true;
    readonly canBuySkill: true;
    readonly canBuyGrowth: true;
    readonly canRemoveNegative: true;
};
export declare const ROGUELITE_SHOP_ITEMS: readonly [{
    readonly id: "cheap_coffee";
    readonly name: "续命咖啡";
    readonly type: "heal";
    readonly price: 25;
    readonly stage: "any";
    readonly effect: "回复少量生命";
    readonly limit: "每次商店 1 次";
    readonly notes: "基础回血商品。";
}, {
    readonly id: "interview_notes";
    readonly name: "面试小抄";
    readonly type: "perk";
    readonly price: 45;
    readonly stage: "early";
    readonly effect: "获得一个普通成长";
    readonly limit: "不限";
    readonly notes: "前期成长入口。";
}, {
    readonly id: "respec_coupon";
    readonly name: "复盘券";
    readonly type: "reroll";
    readonly price: 30;
    readonly stage: "any";
    readonly effect: "刷新当前商店商品";
    readonly limit: "每次商店 2 次";
    readonly notes: "后续可以和刷新价格联动。";
}];
