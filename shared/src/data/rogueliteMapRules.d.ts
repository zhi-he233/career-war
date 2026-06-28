import type { RogueliteMapRoomType } from "./rogueliteRoomTypes.js";
export interface RogueliteMapLayerRule {
    stageModulo: number;
    nodeCount: 1 | 2 | 3 | 4;
    notes: string;
}
export interface RogueliteMapDesignRule {
    item: string;
    currentRule: string;
    notes: string;
}
export interface RogueliteMapRouteSuggestion {
    phase: "early" | "mid" | "late";
    recommendedNodeCount: 1 | 2 | 3;
    recommendedRooms: readonly RogueliteMapRoomType[];
    purpose: string;
    notes: string;
}
export interface RogueliteMapNodeDraft {
    id: string;
    stage: number;
    branch: number;
    type: RogueliteMapRoomType;
    x: number;
    enemyTemplateId?: string;
    bossTemplateId?: string;
}
export interface RogueliteMapConnectionInput {
    id: string;
    x: number;
}
export declare const ROGUELITE_MAP_RULES: {
    readonly pregenAhead: 10;
    readonly lookBack: 1;
    readonly worldBaseY: 3200;
    readonly stageGapY: 125;
    readonly cycleLength: 15;
    readonly branchX: {
        readonly 1: readonly [50];
        readonly 2: readonly [35, 65];
        readonly 3: readonly [24, 50, 76];
        readonly 4: readonly [17, 39, 61, 83];
    };
    readonly layerPattern: ({
        stageModulo: number;
        nodeCount: 1;
        notes: string;
    } | {
        stageModulo: number;
        nodeCount: 2;
        notes: string;
    } | {
        stageModulo: number;
        nodeCount: 3;
        notes: string;
    })[];
    readonly typePattern: ("normal" | "elite" | "boss" | "reward" | "event" | "shop" | "rest")[];
    readonly cycleLayers: {
        1: "normal"[];
        2: ("normal" | "event")[];
        3: ("normal" | "rest")[];
        4: ("normal" | "event" | "shop")[];
        5: ("normal" | "elite")[];
        6: "boss"[];
        7: ("normal" | "event")[];
        8: ("normal" | "elite" | "shop")[];
        9: ("normal" | "event" | "rest")[];
        10: ("normal" | "elite")[];
        11: "boss"[];
        12: ("reward" | "shop")[];
        13: ("normal" | "elite" | "event")[];
        14: ("reward" | "rest")[];
        15: "boss"[];
    };
    readonly routePools: (("normal" | "elite" | "shop")[] | ("normal" | "elite" | "event")[] | ("normal" | "elite" | "rest")[] | ("normal" | "reward" | "event")[] | ("normal" | "shop" | "rest")[])[];
    readonly maxConnectionsFromNode: 2;
    readonly maxConnectionsBetweenLayers: 6;
};
export declare function getRogueliteCycleStage(stage: number): number;
export declare const ROGUELITE_MAP_DESIGN_RULES: readonly [{
    readonly item: "可见未来层";
    readonly currentRule: "当前关后预生成 10 层";
    readonly notes: "UI 只渲染视口附近节点。";
}, {
    readonly item: "层节点数";
    readonly currentRule: "以 2-3 个为主";
    readonly notes: "起点和部分收束层为 1 个。";
}, {
    readonly item: "4 节点层";
    readonly currentRule: "暂不作为主要节奏";
    readonly notes: "后续可小规模加入。";
}, {
    readonly item: "单节点连接数";
    readonly currentRule: "最多 2 条";
    readonly notes: "保持路线清楚。";
}, {
    readonly item: "相邻层总连线";
    readonly currentRule: "约 3-5 条";
    readonly notes: "避免一团线；当前生成上限为 4 条。";
}, {
    readonly item: "Boss 节奏";
    readonly currentRule: "作为远处目标出现";
    readonly notes: "当前战斗节奏仍由 Boss 间隔配置控制。";
}, {
    readonly item: "路线目标";
    readonly currentRule: "左 / 中 / 右尽量清楚";
    readonly notes: "让玩家一眼看懂风险。";
}];
export declare const ROGUELITE_MAP_ROUTE_SUGGESTIONS: readonly [{
    readonly phase: "early";
    readonly recommendedNodeCount: 2;
    readonly recommendedRooms: readonly ["normal", "event"];
    readonly purpose: "教学和轻量选择";
    readonly notes: "不要惩罚太重。";
}, {
    readonly phase: "early";
    readonly recommendedNodeCount: 3;
    readonly recommendedRooms: readonly ["normal", "elite", "shop"];
    readonly purpose: "第一次风险收益";
    readonly notes: "精英奖励要明显。";
}, {
    readonly phase: "mid";
    readonly recommendedNodeCount: 2;
    readonly recommendedRooms: readonly ["rest", "reward"];
    readonly purpose: "缓冲和构筑整理";
    readonly notes: "放在高压后。";
}, {
    readonly phase: "mid";
    readonly recommendedNodeCount: 3;
    readonly recommendedRooms: readonly ["normal", "elite", "event"];
    readonly purpose: "形成路线差异";
    readonly notes: "事件可带代价。";
}, {
    readonly phase: "late";
    readonly recommendedNodeCount: 1;
    readonly recommendedRooms: readonly ["boss"];
    readonly purpose: "阶段目标";
    readonly notes: "Boss 主题要强。";
}];
export declare function getRogueliteMapNodeId(stage: number, branch: number): string;
export declare function getRogueliteMapWorldY(stage: number): number;
export declare function getRogueliteMapLayerCount(stage: number): 1 | 2 | 3 | 4;
export declare function getRogueliteMapNodeX(branch: number, total: 1 | 2 | 3 | 4): number;
export declare function getRogueliteMapStagePrimaryType(stage: number): RogueliteMapRoomType;
export declare function getRogueliteMapNodeType(stage: number, branch: number, total: number): RogueliteMapRoomType;
export declare function getRogueliteMapNodeEnemyTemplateId(stage: number, type: RogueliteMapRoomType, branch: number): string | undefined;
export declare function createRogueliteMapLayer(stage: number): RogueliteMapNodeDraft[];
export declare function getRogueliteConnectedNodeIds(from: RogueliteMapConnectionInput, nextLayer: readonly RogueliteMapConnectionInput[]): Set<string>;
