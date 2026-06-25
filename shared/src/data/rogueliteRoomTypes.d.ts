export type RogueliteMapRoomType = "normal" | "elite" | "boss" | "event" | "shop" | "rest" | "reward";
export interface RogueliteRoomTypeConfig {
    type: RogueliteMapRoomType;
    label: string;
    icon: string;
    description: string;
    entersBattle: boolean;
    isRouteChoice: boolean;
}
export interface RogueliteMapNodeSelection {
    id: string;
    stage: number;
    type: RogueliteMapRoomType;
    enemyTemplateId?: string;
    bossTemplateId?: string;
    rewardTier?: string;
}
export declare const ROGUELITE_ROOM_TYPES: {
    readonly normal: {
        readonly type: "normal";
        readonly label: "普通";
        readonly icon: "⚔️";
        readonly description: "普通战斗，主线体验，奖励普通。";
        readonly entersBattle: true;
        readonly isRouteChoice: true;
    };
    readonly elite: {
        readonly type: "elite";
        readonly label: "精英";
        readonly icon: "💀";
        readonly description: "高风险战斗，奖励更好，可能给稀有奖励。";
        readonly entersBattle: true;
        readonly isRouteChoice: true;
    };
    readonly boss: {
        readonly type: "boss";
        readonly label: "Boss";
        readonly icon: "👑";
        readonly description: "阶段强敌，可以作为路线目标或关键节点。";
        readonly entersBattle: true;
        readonly isRouteChoice: true;
    };
    readonly event: {
        readonly type: "event";
        readonly label: "事件";
        readonly icon: "❓";
        readonly description: "问号事件，不一定战斗，可能有选择和代价。";
        readonly entersBattle: false;
        readonly isRouteChoice: true;
    };
    readonly shop: {
        readonly type: "shop";
        readonly label: "商店";
        readonly icon: "🛒";
        readonly description: "花金币买回血、成长、技能或其他服务。";
        readonly entersBattle: false;
        readonly isRouteChoice: true;
    };
    readonly rest: {
        readonly type: "rest";
        readonly label: "休息";
        readonly icon: "🔥";
        readonly description: "回血、强化、清负面或换取小奖励。";
        readonly entersBattle: false;
        readonly isRouteChoice: true;
    };
    readonly reward: {
        readonly type: "reward";
        readonly label: "奖励";
        readonly icon: "🎁";
        readonly description: "不战斗，直接拿奖励或选择奖励。";
        readonly entersBattle: false;
        readonly isRouteChoice: true;
    };
};
export declare const ROGUELITE_ROOM_TYPE_LABELS: Record<RogueliteMapRoomType, string>;
export declare const ROGUELITE_ROOM_TYPE_ICONS: Record<RogueliteMapRoomType, string>;
