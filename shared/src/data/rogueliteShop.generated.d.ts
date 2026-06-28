export declare const GENERATED_ROGUELITE_SHOP_RULES: {
    readonly itemsPerVisit: 3;
    readonly canRefresh: true;
    readonly refreshPrice: 20;
    readonly canBuyHeal: true;
    readonly canBuySkill: true;
    readonly canBuyGrowth: true;
    readonly canRemoveNegative: true;
    readonly canBuyRouteInfo: false;
    readonly canBuyTemporaryBoost: true;
};
export declare const GENERATED_ROGUELITE_SHOP_ITEMS: readonly [{
    readonly id: "minor_healing_potion";
    readonly name: "小瓶回血药";
    readonly type: "heal";
    readonly price: 25;
    readonly stage: "any";
    readonly effect: "回复 6 生命";
    readonly limit: "每次商店 1 次";
    readonly notes: "基础回血商品。";
}, {
    readonly id: "large_healing_potion";
    readonly name: "大瓶回血药";
    readonly type: "heal";
    readonly price: 55;
    readonly stage: "mid_late";
    readonly effect: "回复 14 生命";
    readonly limit: "每次商店 1 次";
    readonly notes: "中后期保命。";
}, {
    readonly id: "shield_patch";
    readonly name: "护盾补片";
    readonly type: "relic";
    readonly price: 35;
    readonly stage: "any";
    readonly effect: "下一场开始获得 6 护盾";
    readonly limit: "每次商店 1 次";
    readonly notes: "便宜防御。";
}, {
    readonly id: "iron_plate";
    readonly name: "铁甲片";
    readonly type: "perk";
    readonly price: 60;
    readonly stage: "any";
    readonly effect: "从普通成长池三选一（防御类）";
    readonly limit: "不限";
    readonly notes: "护甲/护盾流。";
}, {
    readonly id: "spiked_gauntlet";
    readonly name: "尖刺拳套";
    readonly type: "perk";
    readonly price: 65;
    readonly stage: "any";
    readonly effect: "从普通成长池三选一（伤害类）";
    readonly limit: "不限";
    readonly notes: "爆发流。";
}, {
    readonly id: "blood_vial";
    readonly name: "血瓶";
    readonly type: "perk";
    readonly price: 70;
    readonly stage: "mid_late";
    readonly effect: "从普通成长池三选一（回复/吸血类）";
    readonly limit: "不限";
    readonly notes: "回复流。";
}, {
    readonly id: "lucky_dice";
    readonly name: "幸运骰子";
    readonly type: "perk";
    readonly price: 75;
    readonly stage: "mid_late";
    readonly effect: "从普通成长池三选一（骰子类）";
    readonly limit: "不限";
    readonly notes: "骰子流。";
}, {
    readonly id: "skill_scroll";
    readonly name: "职业技能卷轴";
    readonly type: "skill";
    readonly price: 95;
    readonly stage: "mid_late";
    readonly effect: "从角色技能池三选一";
    readonly limit: "每次商店 1 次";
    readonly notes: "构筑入口。";
}, {
    readonly id: "dragon_scale";
    readonly name: "龙鳞碎片";
    readonly type: "relic";
    readonly price: 110;
    readonly stage: "late";
    readonly effect: "从稀有奖励池三选一（偏向穿透类）";
    readonly limit: "每次商店 1 次";
    readonly notes: "后期稀有。TODO: 稀有奖励池商店抽取逻辑尚未接入。";
}, {
    readonly id: "cleansing_salt";
    readonly name: "净化盐";
    readonly type: "remove";
    readonly price: 80;
    readonly stage: "any";
    readonly effect: "删除一个负面效果";
    readonly limit: "每次商店 1 次";
    readonly notes: "价格偏高。TODO: 负面效果删除尚未接入商店流程。";
}, {
    readonly id: "blacksmith_hammer";
    readonly name: "铁匠锤";
    readonly type: "relic";
    readonly price: 85;
    readonly stage: "any";
    readonly effect: "升级一个已有成长";
    readonly limit: "每次商店 1 次";
    readonly notes: "构筑强化。";
}, {
    readonly id: "reroll_coupon";
    readonly name: "重摇券";
    readonly type: "reroll";
    readonly price: 30;
    readonly stage: "any";
    readonly effect: "刷新当前商店商品";
    readonly limit: "每次商店 2 次";
    readonly notes: "可和刷新价格联动。";
}, {
    readonly id: "cracked_relic_box";
    readonly name: "裂纹遗物盒";
    readonly type: "relic";
    readonly price: 45;
    readonly stage: "any";
    readonly effect: "随机获得 20 金币或 4 护盾";
    readonly limit: "每次商店 1 次";
    readonly notes: "便宜随机商品。";
}, {
    readonly id: "cursed_relic_box";
    readonly name: "诅咒遗物盒";
    readonly type: "relic";
    readonly price: 30;
    readonly stage: "mid_late";
    readonly effect: "获得 45 金币，但附带一个负面效果";
    readonly limit: "每次商店 1 次";
    readonly notes: "高风险低价格。TODO: 负面效果尚未接入商店流程。";
}, {
    readonly id: "battle_map";
    readonly name: "斗技塔地图";
    readonly type: "relic";
    readonly price: 50;
    readonly stage: "any";
    readonly effect: "预览后续 3 层路线或提高奖励房出现概率";
    readonly limit: "每次商店 1 次";
    readonly notes: "地图系统候选，不进入当前可购买池。TODO: 路线预览和奖励房概率逻辑尚未接入。";
}, {
    readonly id: "opening_bell";
    readonly name: "开场铃";
    readonly type: "relic";
    readonly price: 45;
    readonly stage: "any";
    readonly effect: "下一场第一次攻击伤害 +4";
    readonly limit: "每次商店 1 次";
    readonly notes: "临时爆发。";
}, {
    readonly id: "emergency_shield";
    readonly name: "应急护符";
    readonly type: "relic";
    readonly price: 55;
    readonly stage: "mid_late";
    readonly effect: "低于半血时获得 8 护盾（每场 1 次）";
    readonly limit: "每次商店 1 次";
    readonly notes: "保命道具。TODO: 临时触发逻辑尚未接入商店流程。";
}, {
    readonly id: "flame_oil";
    readonly name: "火焰油";
    readonly type: "relic";
    readonly price: 55;
    readonly stage: "mid_late";
    readonly effect: "下一场攻击命中附加 2 层火焰标记";
    readonly limit: "每次商店 1 次";
    readonly notes: "火焰流。TODO: 临时火焰标记逻辑尚未接入商店流程。";
}, {
    readonly id: "blood_contract";
    readonly name: "血契纸";
    readonly type: "relic";
    readonly price: 65;
    readonly stage: "mid_late";
    readonly effect: "失去 5 生命，从稀有奖励池三选一";
    readonly limit: "每次商店 1 次";
    readonly notes: "风险换强度。TODO: 稀有奖励池商店抽取逻辑尚未接入。";
}, {
    readonly id: "boss_trophy";
    readonly name: "Boss 战利品";
    readonly type: "skill";
    readonly price: 130;
    readonly stage: "late";
    readonly effect: "从 Boss 能力池三选一";
    readonly limit: "每次商店 1 次";
    readonly notes: "后期爽点。TODO: Boss 能力商店购买流程尚未接入。";
}];
export declare const GENERATED_ROGUELITE_ACTIVE_SHOP_ITEM_IDS: readonly ["minor_healing_potion", "large_healing_potion", "shield_patch", "iron_plate", "spiked_gauntlet", "blood_vial", "lucky_dice", "skill_scroll", "cleansing_salt", "blacksmith_hammer", "reroll_coupon", "cracked_relic_box", "opening_bell"];
