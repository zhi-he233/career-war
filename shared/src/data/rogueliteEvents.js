export const ROGUELITE_EVENTS = [
    {
        id: "overtime_invite",
        name: "加班邀约",
        rarity: "common",
        stage: "early",
        description: "领导笑眯眯地问你今晚有没有安排。",
        choices: [
            { label: "留下来卷一下", effect: "获得一个普通成长奖励", cost: "失去少量生命" },
            { label: "准点下班", effect: "回复少量生命", cost: "没有额外奖励" },
        ],
        notes: "偏轻量，适合前期教学。",
    },
    {
        id: "boss_promise",
        name: "老板画饼",
        rarity: "uncommon",
        stage: "any",
        description: "老板递来一张看起来很香、但没有落款的未来蓝图。",
        choices: [
            { label: "相信一次", effect: "获得更高品质奖励预览", cost: "下一场战斗敌人更强" },
            { label: "要求写进合同", effect: "获得少量金币", cost: "失去一次刷新机会" },
        ],
        notes: "后续需要接入临时难度或金币。",
    },
    {
        id: "caught_slacking",
        name: "摸鱼被抓",
        rarity: "common",
        stage: "mid",
        description: "你刚切到娱乐网站，主管就从背后路过。",
        choices: [
            { label: "装作查资料", effect: "获得随机小奖励", cost: "可能获得负面状态" },
            { label: "坦白在休息", effect: "删除一个轻微负面效果", cost: "失去少量金币" },
        ],
        notes: "可以做成风险事件。",
    },
];
