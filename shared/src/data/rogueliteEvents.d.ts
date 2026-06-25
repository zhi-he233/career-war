export type RogueliteEventRarity = "common" | "uncommon" | "rare";
export type RogueliteEventStage = "early" | "mid" | "late" | "any";
export interface RogueliteEventChoiceDraft {
    label: string;
    effect: string;
    cost: string;
}
export interface RogueliteEventDraft {
    id: string;
    name: string;
    rarity: RogueliteEventRarity;
    stage: RogueliteEventStage;
    description: string;
    choices: readonly RogueliteEventChoiceDraft[];
    notes?: string;
}
export declare const ROGUELITE_EVENTS: readonly [{
    readonly id: "overtime_invite";
    readonly name: "加班邀约";
    readonly rarity: "common";
    readonly stage: "early";
    readonly description: "领导笑眯眯地问你今晚有没有安排。";
    readonly choices: readonly [{
        readonly label: "留下来卷一下";
        readonly effect: "获得一个普通成长奖励";
        readonly cost: "失去少量生命";
    }, {
        readonly label: "准点下班";
        readonly effect: "回复少量生命";
        readonly cost: "没有额外奖励";
    }];
    readonly notes: "偏轻量，适合前期教学。";
}, {
    readonly id: "boss_promise";
    readonly name: "老板画饼";
    readonly rarity: "uncommon";
    readonly stage: "any";
    readonly description: "老板递来一张看起来很香、但没有落款的未来蓝图。";
    readonly choices: readonly [{
        readonly label: "相信一次";
        readonly effect: "获得更高品质奖励预览";
        readonly cost: "下一场战斗敌人更强";
    }, {
        readonly label: "要求写进合同";
        readonly effect: "获得少量金币";
        readonly cost: "失去一次刷新机会";
    }];
    readonly notes: "后续需要接入临时难度或金币。";
}, {
    readonly id: "caught_slacking";
    readonly name: "摸鱼被抓";
    readonly rarity: "common";
    readonly stage: "mid";
    readonly description: "你刚切到娱乐网站，主管就从背后路过。";
    readonly choices: readonly [{
        readonly label: "装作查资料";
        readonly effect: "获得随机小奖励";
        readonly cost: "可能获得负面状态";
    }, {
        readonly label: "坦白在休息";
        readonly effect: "删除一个轻微负面效果";
        readonly cost: "失去少量金币";
    }];
    readonly notes: "可以做成风险事件。";
}];
