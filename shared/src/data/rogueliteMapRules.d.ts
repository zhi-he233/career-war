import type { RogueliteMapRoomType } from "./rogueliteRoomTypes.js";
export interface RogueliteMapLayerRule {
    stageModulo: number;
    nodeCount: 1 | 2 | 3 | 4;
    notes: string;
}
export interface RogueliteMapNodeDraft {
    id: string;
    stage: number;
    branch: number;
    type: RogueliteMapRoomType;
    x: number;
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
    readonly typePattern: ("normal" | "elite" | "boss" | "event" | "shop" | "rest" | "reward")[];
    readonly routePools: (("normal" | "elite" | "event")[] | ("normal" | "elite" | "rest")[] | ("normal" | "elite" | "shop")[] | ("normal" | "event" | "reward")[] | ("normal" | "boss" | "shop")[])[];
    readonly maxConnectionsFromNode: 2;
    readonly maxConnectionsBetweenLayers: 5;
};
export declare function getRogueliteMapNodeId(stage: number, branch: number): string;
export declare function getRogueliteMapWorldY(stage: number): number;
export declare function getRogueliteMapLayerCount(stage: number): 1 | 2 | 3 | 4;
export declare function getRogueliteMapNodeX(branch: number, total: 1 | 2 | 3 | 4): number;
export declare function getRogueliteMapStagePrimaryType(stage: number): RogueliteMapRoomType;
export declare function getRogueliteMapNodeType(stage: number, branch: number, total: number): RogueliteMapRoomType;
export declare function createRogueliteMapLayer(stage: number): RogueliteMapNodeDraft[];
export declare function getRogueliteConnectedNodeIds(from: RogueliteMapConnectionInput, nextLayer: readonly RogueliteMapConnectionInput[]): Set<string>;
