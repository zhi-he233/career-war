import { GENERATED_ROGUELITE_ACTIVE_SHOP_ITEM_IDS, GENERATED_ROGUELITE_SHOP_ITEMS, GENERATED_ROGUELITE_SHOP_RULES, } from "./rogueliteShop.generated.js";
export const ROGUELITE_SHOP_RULES = GENERATED_ROGUELITE_SHOP_RULES;
export const ROGUELITE_SHOP_ITEMS = GENERATED_ROGUELITE_SHOP_ITEMS;
export const ROGUELITE_ACTIVE_SHOP_ITEM_IDS = GENERATED_ROGUELITE_ACTIVE_SHOP_ITEM_IDS;
/** Map stage number to shop stage tier for item filtering. */
export function getRogueliteShopStageTier(stage) {
    const tiers = ["any"];
    if (stage <= 5)
        tiers.push("early");
    if (stage >= 6 && stage <= 10)
        tiers.push("mid");
    if (stage >= 11)
        tiers.push("late");
    if (stage >= 8)
        tiers.push("mid_late");
    return tiers;
}
/** Filter shop items available at the given stage. */
export function getRogueliteShopItemsForStage(stage) {
    const tiers = getRogueliteShopStageTier(stage);
    const activeIds = new Set(ROGUELITE_ACTIVE_SHOP_ITEM_IDS);
    return ROGUELITE_SHOP_ITEMS.filter((item) => activeIds.has(item.id) && tiers.includes(item.stage));
}
