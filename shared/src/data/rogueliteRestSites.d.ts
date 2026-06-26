export type RogueliteRestSiteActionId = "campfire_heal" | "weapon_drill" | "shield_repair" | "blood_meditation" | "dice_prayer" | "sharpen_first_hit" | "reinforce_armor" | "sell_scraps" | "skip_for_trophy" | "skill_focus";
export interface RogueliteRestSiteActionDraft {
    id: RogueliteRestSiteActionId;
    name: string;
    effect: string;
    limit: string;
    notes?: string;
}
export declare const ROGUELITE_REST_SITE_ACTIONS: readonly [{
    readonly id: "campfire_heal";
    readonly name: "营火疗伤";
    readonly effect: "回复 10 生命";
    readonly limit: "每次休息点只能选 1 次";
    readonly notes: "最基础选项。";
}, {
    readonly id: "weapon_drill";
    readonly name: "武器演练";
    readonly effect: "强化一个已有成长";
    readonly limit: "需要已有可强化成长";
    readonly notes: "偏构筑。";
}, {
    readonly id: "shield_repair";
    readonly name: "修补护甲";
    readonly effect: "下一场开始获得 8 护盾，或提升护盾类成长";
    readonly limit: "每次休息点 1 次";
    readonly notes: "护盾流。";
}, {
    readonly id: "blood_meditation";
    readonly name: "血池冥想";
    readonly effect: "回复 5 生命，并提高吸血/回复类奖励出现倾向";
    readonly limit: "需要已拥有 heal 标签奖励时更有效";
    readonly notes: "回复流。";
}, {
    readonly id: "dice_prayer";
    readonly name: "骰子祈愿";
    readonly effect: "提高骰子类奖励出现倾向，或获得一次重摇机会";
    readonly limit: "每次休息点 1 次";
    readonly notes: "骰子流。TODO: 重摇机会尚未接入休息点流程。";
}, {
    readonly id: "sharpen_first_hit";
    readonly name: "磨拳蓄势";
    readonly effect: "下一场第一次攻击伤害 +4";
    readonly limit: "不回复生命";
    readonly notes: "进攻选项。";
}, {
    readonly id: "reinforce_armor";
    readonly name: "加固甲片";
    readonly effect: "下一场受到的首次伤害 -3";
    readonly limit: "不回复生命";
    readonly notes: "防御选项。";
}, {
    readonly id: "sell_scraps";
    readonly name: "出售碎片";
    readonly effect: "获得 20 金币";
    readonly limit: "不回复生命";
    readonly notes: "贪心选项。";
}, {
    readonly id: "skip_for_trophy";
    readonly name: "不休息，拿战利品";
    readonly effect: "获得 20 金币或 4 护盾";
    readonly limit: "不回复生命";
    readonly notes: "高风险选项。";
}, {
    readonly id: "skill_focus";
    readonly name: "专注职业技能";
    readonly effect: "强化一个已有角色技能";
    readonly limit: "需要已有可强化技能";
    readonly notes: "中后期构筑。";
}];
export declare const rogueliteRestSites: {
    readonly actions: readonly [{
        readonly id: "campfire_heal";
        readonly name: "营火疗伤";
        readonly effect: "回复 10 生命";
        readonly limit: "每次休息点只能选 1 次";
        readonly notes: "最基础选项。";
    }, {
        readonly id: "weapon_drill";
        readonly name: "武器演练";
        readonly effect: "强化一个已有成长";
        readonly limit: "需要已有可强化成长";
        readonly notes: "偏构筑。";
    }, {
        readonly id: "shield_repair";
        readonly name: "修补护甲";
        readonly effect: "下一场开始获得 8 护盾，或提升护盾类成长";
        readonly limit: "每次休息点 1 次";
        readonly notes: "护盾流。";
    }, {
        readonly id: "blood_meditation";
        readonly name: "血池冥想";
        readonly effect: "回复 5 生命，并提高吸血/回复类奖励出现倾向";
        readonly limit: "需要已拥有 heal 标签奖励时更有效";
        readonly notes: "回复流。";
    }, {
        readonly id: "dice_prayer";
        readonly name: "骰子祈愿";
        readonly effect: "提高骰子类奖励出现倾向，或获得一次重摇机会";
        readonly limit: "每次休息点 1 次";
        readonly notes: "骰子流。TODO: 重摇机会尚未接入休息点流程。";
    }, {
        readonly id: "sharpen_first_hit";
        readonly name: "磨拳蓄势";
        readonly effect: "下一场第一次攻击伤害 +4";
        readonly limit: "不回复生命";
        readonly notes: "进攻选项。";
    }, {
        readonly id: "reinforce_armor";
        readonly name: "加固甲片";
        readonly effect: "下一场受到的首次伤害 -3";
        readonly limit: "不回复生命";
        readonly notes: "防御选项。";
    }, {
        readonly id: "sell_scraps";
        readonly name: "出售碎片";
        readonly effect: "获得 20 金币";
        readonly limit: "不回复生命";
        readonly notes: "贪心选项。";
    }, {
        readonly id: "skip_for_trophy";
        readonly name: "不休息，拿战利品";
        readonly effect: "获得 20 金币或 4 护盾";
        readonly limit: "不回复生命";
        readonly notes: "高风险选项。";
    }, {
        readonly id: "skill_focus";
        readonly name: "专注职业技能";
        readonly effect: "强化一个已有角色技能";
        readonly limit: "需要已有可强化技能";
        readonly notes: "中后期构筑。";
    }];
};
