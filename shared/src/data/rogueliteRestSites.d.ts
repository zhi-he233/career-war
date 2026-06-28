export type RogueliteRestSiteActionId = "campfire_heal" | "weapon_drill" | "shield_repair" | "blood_meditation" | "dice_prayer" | "sharpen_first_hit" | "reinforce_armor" | "sell_scraps" | "skip_for_trophy" | "skill_focus";
export interface RogueliteRestSiteActionDraft {
    id: RogueliteRestSiteActionId;
    name: string;
    effect: string;
    limit: string;
    notes?: string;
}
export declare const ROGUELITE_REST_SITE_ACTIONS: readonly RogueliteRestSiteActionDraft[];
export declare const rogueliteRestSites: {
    readonly actions: readonly RogueliteRestSiteActionDraft[];
};
