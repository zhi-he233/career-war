import {
  ROGUELITE_BALANCE_MECHANICS,
  ROGUELITE_ROOM_TYPES,
  ROGUELITE_STAGE_SCALING,
  createRogueliteMapLayer,
  getRogueliteConnectedNodeIds,
  getRogueliteCycleStage,
  getRogueliteMapNodeId,
  type CharacterId,
  type Player,
  type RogueliteMapNodeSelection,
  type RogueliteMapRoomType,
  type Room,
} from "@career-war/shared";
import {
  getRogueliteBossConfigMap,
  getRogueliteBossPool,
  getRogueliteEnemyConfigMap,
  getRogueliteEnemies,
  type RogueliteBossConfig,
  type RogueliteEnemyConfig,
} from "../rogueliteDataCache.js";

// ---------------------------------------------------------------------------
// Enemy configuration helpers
// ---------------------------------------------------------------------------

export function getRogueliteEnemyConfig(type: string): RogueliteEnemyConfig {
  const configs = getRogueliteEnemyConfigMap();
  const config = configs[type] ?? configs.normal;
  if (!config) throw new Error("肉鸽敌人配置为空");
  return config;
}

export function isRogueliteEnemyType(value: unknown): value is string {
  return typeof value === "string" && value in getRogueliteEnemyConfigMap();
}

export function getRogueliteEnemyConfigByTemplateId(
  value: unknown
): RogueliteEnemyConfig | undefined {
  if (isRogueliteEnemyType(value)) return getRogueliteEnemyConfig(value);
  if (typeof value !== "string") return undefined;
  return getRogueliteEnemies()
    .map((enemy) => getRogueliteEnemyConfig(enemy.id))
    .find((enemy) => enemy.enemyTemplateId === value);
}

// ---------------------------------------------------------------------------
// Identity + logging
// ---------------------------------------------------------------------------

export function getRogueliteEnemyIdentity(config: {
  enemyTemplateId: string;
  displayName: string;
  enemyKind: "monster" | "duelist" | "boss";
  spriteKey?: string;
  portraitKey?: string;
  baseCharacterId?: CharacterId;
}) {
  return {
    enemyTemplateId: config.enemyTemplateId,
    displayName: config.displayName,
    enemyKind: config.enemyKind,
    spriteKey: config.spriteKey,
    portraitKey: config.portraitKey,
    baseCharacterId: config.baseCharacterId,
  };
}

export function logRogueliteMapNodeSelection(
  stage: number,
  mapNode: RogueliteMapNodeSelection | undefined
): void {
  console.info("[roguelite map node]", {
    stage,
    roomType: mapNode?.type ?? "normal",
    nodeId: mapNode?.id ?? `n${stage}-0`,
    enemyTemplateId: mapNode?.enemyTemplateId,
  });
}

export function logRogueliteEnemyTemplateResolution(
  stage: number,
  mapNode: RogueliteMapNodeSelection | undefined,
  template: {
    id: string;
    displayName: string;
    maxHp: number;
    shield: number;
    baseCharacterId?: CharacterId;
  }
): void {
  console.info("[roguelite enemy template]", {
    stage,
    roomType: mapNode?.type ?? "normal",
    templateId: template.id,
    displayName: template.displayName,
    maxHp: template.maxHp,
    shield: template.shield,
    baseCharacterId: template.baseCharacterId,
  });
}

export function logRogueliteEnemyBattleState(
  label: "before_engine" | "after_startGame" | "before_broadcast",
  bot: Room["players"][number]
): void {
  console.info(`[roguelite enemy ${label}]`, {
    name: bot.nickname,
    characterId: bot.characterId,
    hp: bot.hp,
    maxHp: bot.maxHp,
    shield: bot.shield,
    rogueliteEnemyInfo: bot.rogueliteEnemyInfo,
  });
}

// ---------------------------------------------------------------------------
// Enemy stat application
// ---------------------------------------------------------------------------

export function applyRogueliteEnemyStats(
  bot: Room["players"][number],
  enemy: {
    displayName: string;
    maxHp: number;
    shield: number;
    baseCharacterId?: CharacterId;
    rogueliteEnemyInfo: NonNullable<Room["players"][number]["rogueliteEnemyInfo"]>;
  }
): void {
  bot.nickname = enemy.displayName;
  bot.characterId = enemy.baseCharacterId ?? bot.characterId;
  bot.maxHp = enemy.maxHp;
  bot.hp = enemy.maxHp;
  bot.shield = enemy.shield;
  bot.isDead = false;
  bot.guarding = false;
  bot.rogueliteEnemyInfo = enemy.rogueliteEnemyInfo;
}

export function logRogueliteEnemySpawn(
  stage: number,
  mapNode: RogueliteMapNodeSelection | undefined,
  bot: Room["players"][number],
  enemyTemplateId: string
): void {
  console.info("[roguelite enemy spawn]", {
    stage,
    roomType: mapNode?.type ?? "normal",
    enemyTemplateId,
    maxHp: bot.maxHp,
    shield: bot.shield,
  });
}

// ---------------------------------------------------------------------------
// Map node helpers
// ---------------------------------------------------------------------------

export function getDefaultRogueliteMapNode(stage: number): RogueliteMapNodeSelection {
  const draft = createRogueliteMapLayer(stage)[0];
  if (!draft)
    return { id: getRogueliteMapNodeId(stage, 0), stage, type: "normal" };
  return {
    id: draft.id,
    stage: draft.stage,
    type: draft.type,
    enemyTemplateId: draft.enemyTemplateId,
    bossTemplateId: draft.bossTemplateId,
  };
}

export function isCombatRogueliteRoomType(
  type: RogueliteMapRoomType
): type is "normal" | "elite" | "boss" {
  return type === "normal" || type === "elite" || type === "boss";
}

export function normalizeRogueliteMapNode(
  input: unknown,
  fallbackStage: number
): RogueliteMapNodeSelection {
  const raw =
    input && typeof input === "object"
      ? (input as Partial<RogueliteMapNodeSelection>)
      : {};
  const stage =
    typeof raw.stage === "number" &&
    Number.isFinite(raw.stage) &&
    raw.stage > 0
      ? Math.floor(raw.stage)
      : fallbackStage;
  const type =
    raw.type && raw.type in ROGUELITE_ROOM_TYPES ? raw.type : "normal";
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `n${stage}-0`;
  const node: RogueliteMapNodeSelection = { id, stage, type };
  if (typeof raw.enemyTemplateId === "string")
    node.enemyTemplateId = raw.enemyTemplateId;
  if (typeof raw.bossTemplateId === "string")
    node.bossTemplateId = raw.bossTemplateId;
  if (typeof raw.rewardTier === "string") node.rewardTier = raw.rewardTier;
  return node;
}

export function getCanonicalRogueliteMapNode(
  input: unknown,
  expectedStage: number
): RogueliteMapNodeSelection {
  const raw = normalizeRogueliteMapNode(input, expectedStage);
  if (raw.stage !== expectedStage)
    throw new Error("地图节点关卡与当前肉鸽关卡不一致");

  const draft = createRogueliteMapLayer(expectedStage).find(
    (node) => node.id === raw.id
  );
  if (!draft) throw new Error("地图节点不存在");

  return {
    id: draft.id,
    stage: draft.stage,
    type: draft.type,
    enemyTemplateId: draft.enemyTemplateId ?? raw.enemyTemplateId,
    bossTemplateId: draft.bossTemplateId ?? raw.bossTemplateId,
    rewardTier: raw.rewardTier,
  };
}

// ---------------------------------------------------------------------------
// Route state
// ---------------------------------------------------------------------------

export function ensureRogueliteRouteState(
  roguelite: NonNullable<Room["roguelite"]>
): void {
  roguelite.mapRoute ??= {};
  roguelite.consumedMapNodeIds ??= [];
}

export function validateRogueliteNextNode(
  roguelite: NonNullable<Room["roguelite"]>,
  mapNode: RogueliteMapNodeSelection
): void {
  ensureRogueliteRouteState(roguelite);
  if (mapNode.stage !== roguelite.stage)
    throw new Error("地图节点关卡与当前肉鸽关卡不一致");
  if (roguelite.consumedMapNodeIds?.includes(mapNode.id))
    throw new Error("地图节点已处理");

  if (mapNode.stage <= 1) {
    if (mapNode.id !== getRogueliteMapNodeId(1, 0))
      throw new Error("只能选择当前层相连节点");
    return;
  }

  const previousStage = mapNode.stage - 1;
  const previousNodeId =
    roguelite.mapRoute?.[previousStage] ??
    getRogueliteMapNodeId(previousStage, 0);
  const previousNode = createRogueliteMapLayer(previousStage).find(
    (node) => node.id === previousNodeId
  );
  const currentLayer = createRogueliteMapLayer(mapNode.stage);
  if (
    !previousNode ||
    !currentLayer.some((node) => node.id === mapNode.id)
  )
    throw new Error("只能选择当前层相连节点");

  const connectedIds = getRogueliteConnectedNodeIds(previousNode, currentLayer);
  if (!connectedIds.has(mapNode.id))
    throw new Error("只能选择当前层相连节点");
}

export function rememberRogueliteMapNode(
  roguelite: NonNullable<Room["roguelite"]>,
  mapNode: RogueliteMapNodeSelection
): void {
  ensureRogueliteRouteState(roguelite);
  roguelite.mapRoute![mapNode.stage] = mapNode.id;
}

export function consumeRogueliteMapNode(
  roguelite: NonNullable<Room["roguelite"]>,
  mapNode: RogueliteMapNodeSelection
): void {
  ensureRogueliteRouteState(roguelite);
  if (!roguelite.consumedMapNodeIds!.includes(mapNode.id)) {
    roguelite.consumedMapNodeIds!.push(mapNode.id);
  }
}

// ---------------------------------------------------------------------------
// Stage helpers
// ---------------------------------------------------------------------------

export function getRogueliteEarlyStage(
  stage: number
): (typeof ROGUELITE_STAGE_SCALING.earlyStages)[number] | undefined {
  return ROGUELITE_STAGE_SCALING.earlyStages.find((item) => item.stage === stage);
}

export function isRogueliteBossStage(stage: number): boolean {
  const cycleStage = getRogueliteCycleStage(stage);
  return (
    cycleStage === ROGUELITE_STAGE_SCALING.bossInterval || cycleStage === 15
  );
}

export function isRogueliteEliteStage(stage: number): boolean {
  return (
    getRogueliteCycleStage(stage) === 5 &&
    stage >= ROGUELITE_BALANCE_MECHANICS.eliteStartsAtStage
  );
}

export function getRogueliteStageBonus(stage: number): {
  hpBonus: number;
  shieldBonus: number;
} {
  const stage4To6 = ROGUELITE_STAGE_SCALING.stage4To6 as Readonly<
    Partial<Record<number, { hpBonus: number; shieldBonus: number }>>
  >;
  const cycleStage = getRogueliteCycleStage(stage);
  const configured = stage4To6[cycleStage];
  if (configured) return configured;

  let hpBonus = stage * ROGUELITE_STAGE_SCALING.stage7Plus.hpBonusPerStage;
  let shieldBonus =
    Math.floor(
      stage / ROGUELITE_STAGE_SCALING.stage7Plus.shieldStageDivisor
    ) * ROGUELITE_STAGE_SCALING.stage7Plus.shieldBonusPerStep;
  if (isRogueliteBossStage(stage)) {
    hpBonus += ROGUELITE_STAGE_SCALING.stage7Plus.bossExtraHp;
    shieldBonus += ROGUELITE_STAGE_SCALING.stage7Plus.bossExtraShield;
  } else if (isRogueliteEliteStage(stage)) {
    hpBonus += ROGUELITE_STAGE_SCALING.stage7Plus.eliteExtraHp;
    shieldBonus += ROGUELITE_STAGE_SCALING.stage7Plus.eliteExtraShield;
  }
  return { hpBonus, shieldBonus };
}

// ---------------------------------------------------------------------------
// Enemy / boss selection for a given stage
// ---------------------------------------------------------------------------

export function getRogueliteEnemyForStage(
  stage: number
): RogueliteEnemyConfig {
  const isElite = isRogueliteEliteStage(stage);

  if (!isElite) {
    if (stage >= ROGUELITE_BALANCE_MECHANICS.normalEnemyRotationStartsAtStage) {
      const variants = ROGUELITE_BALANCE_MECHANICS.normalEnemyRotation;
      const variant = variants[stage % variants.length] ?? "normal";
      return getRogueliteEnemyConfig(variant);
    }
    if (
      stage >=
        ROGUELITE_BALANCE_MECHANICS.normalGamblerFallbackStartsAtStage &&
      stage % ROGUELITE_BALANCE_MECHANICS.normalGamblerFallbackModulo === 0
    ) {
      return getRogueliteEnemyConfig("normal_gambler");
    }
    return getRogueliteEnemyConfig("normal");
  }

  const eliteCycle = Math.floor(
    (stage - 1) / ROGUELITE_STAGE_SCALING.bossInterval
  );
  const eliteTypes =
    stage >= ROGUELITE_BALANCE_MECHANICS.eliteLatePoolStartsAtStage
      ? ROGUELITE_BALANCE_MECHANICS.eliteLatePool
      : ROGUELITE_BALANCE_MECHANICS.eliteEarlyPool;
  const type = eliteTypes[eliteCycle % eliteTypes.length] ?? "elite_iron_skin";
  return getRogueliteEnemyConfig(type);
}

export function getRogueliteBossForStage(
  stage: number
): RogueliteBossConfig {
  const bossCycleLength = ROGUELITE_STAGE_SCALING.bossInterval;
  const bossPool = getRogueliteBossPool();
  const bossIndex =
    Math.floor((stage - 1) / bossCycleLength) % bossPool.length;
  const bossId = bossPool[bossIndex] ?? bossPool[0];
  const bossConfig = bossId ? getRogueliteBossConfigMap()[bossId] : undefined;
  if (!bossConfig) throw new Error("肉鸽 Boss 配置为空");
  return bossConfig;
}

export function getRogueliteBossHp(
  config: RogueliteBossConfig,
  hpBonus: number
): number {
  return config.fixedHp ?? config.baseHp + hpBonus;
}
