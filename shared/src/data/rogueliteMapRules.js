export const ROGUELITE_MAP_RULES = {
    pregenAhead: 10,
    lookBack: 1,
    worldBaseY: 3200,
    stageGapY: 125,
    branchX: {
        1: [50],
        2: [35, 65],
        3: [24, 50, 76],
        4: [17, 39, 61, 83],
    },
    layerPattern: [
        { stageModulo: 1, nodeCount: 1, notes: "起点或收束层" },
        { stageModulo: 2, nodeCount: 2, notes: "普通分叉" },
        { stageModulo: 3, nodeCount: 3, notes: "主要选择层" },
        { stageModulo: 4, nodeCount: 2, notes: "收束层" },
        { stageModulo: 5, nodeCount: 3, notes: "事件/商店混合层" },
        { stageModulo: 6, nodeCount: 2, notes: "普通分叉" },
        { stageModulo: 7, nodeCount: 3, notes: "精英风险层" },
        { stageModulo: 8, nodeCount: 2, notes: "休息/奖励层" },
        { stageModulo: 0, nodeCount: 1, notes: "远端 Boss 目标层" },
    ],
    typePattern: ["normal", "elite", "event", "shop", "normal", "rest", "elite", "reward", "boss"],
    routePools: [
        ["normal", "elite", "event"],
        ["normal", "rest", "elite"],
        ["elite", "normal", "shop"],
        ["normal", "event", "reward"],
        ["normal", "shop", "boss"],
    ],
    maxConnectionsFromNode: 2,
    maxConnectionsBetweenLayers: 5,
};
export function getRogueliteMapNodeId(stage, branch) {
    return `n${stage}-${branch}`;
}
export function getRogueliteMapWorldY(stage) {
    return ROGUELITE_MAP_RULES.worldBaseY - (stage - 1) * ROGUELITE_MAP_RULES.stageGapY;
}
export function getRogueliteMapLayerCount(stage) {
    if (stage <= 1)
        return 1;
    const modulo = stage % ROGUELITE_MAP_RULES.layerPattern.length;
    return ROGUELITE_MAP_RULES.layerPattern.find((item) => item.stageModulo === modulo)?.nodeCount ?? 2;
}
export function getRogueliteMapNodeX(branch, total) {
    return ROGUELITE_MAP_RULES.branchX[total][branch] ?? 50;
}
export function getRogueliteMapStagePrimaryType(stage) {
    const pattern = ROGUELITE_MAP_RULES.typePattern;
    return pattern[(stage - 1) % pattern.length] ?? "normal";
}
export function getRogueliteMapNodeType(stage, branch, total) {
    if (stage <= 1 || total <= 1)
        return getRogueliteMapStagePrimaryType(stage);
    const pools = ROGUELITE_MAP_RULES.routePools;
    const pool = pools[stage % pools.length] ?? pools[0];
    return pool[(branch + stage) % pool.length] ?? "normal";
}
export function createRogueliteMapLayer(stage) {
    const total = getRogueliteMapLayerCount(stage);
    return Array.from({ length: total }, (_, branch) => ({
        id: getRogueliteMapNodeId(stage, branch),
        stage,
        branch,
        type: getRogueliteMapNodeType(stage, branch, total),
        x: getRogueliteMapNodeX(branch, total),
    }));
}
export function getRogueliteConnectedNodeIds(from, nextLayer) {
    const sorted = [...nextLayer].sort((a, b) => Math.abs(a.x - from.x) - Math.abs(b.x - from.x));
    const maxTargets = Math.min(ROGUELITE_MAP_RULES.maxConnectionsFromNode, sorted.length);
    return new Set(sorted.slice(0, maxTargets).map((node) => node.id));
}
