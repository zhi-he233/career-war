import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { authMiddleware, authRouter } from "./auth.js";
import { getCharacterDataStatus, getGameCharacters, refreshCharacterData } from "./characterDataCache.js";
import { loadEditableCharacters, saveEditableCharacters } from "./editor/characterEditor.js";
import { loadEditableRogueliteBalance, saveEditableRogueliteBalance } from "./editor/rogueliteBalanceEditor.js";
import { loadEditableRogueliteEvents, saveEditableRogueliteEvents } from "./editor/rogueliteEventsEditor.js";
import { loadEditableRogueliteRestSites, saveEditableRogueliteRestSites } from "./editor/rogueliteRestSitesEditor.js";
import { loadEditableRogueliteShop, saveEditableRogueliteShop } from "./editor/rogueliteShopEditor.js";
import {
  getRogueliteBossConfigMap,
  getRogueliteBossPool,
  getRogueliteEnemyConfigMap,
  getRogueliteEnemies,
  getRogueliteEvents,
  getRogueliteRewardPools,
  refreshRogueliteBalance,
  refreshRogueliteEvents,
  type RogueliteBossConfig,
  type RogueliteEnemyConfig,
  type RogueliteRewardDraft,
} from "./rogueliteDataCache.js";
import {
  EMOTE_IDS,
  ROGUELITE_BALANCE_MECHANICS,
  ROGUELITE_BOT_BASE,
  ROGUELITE_ROOM_TYPES,
  ROGUELITE_MAX_STAGE,
  ROGUELITE_PLAYER_START,
  ROGUELITE_REST_SITE_ACTIONS,
  ROGUELITE_REWARD_RHYTHM,
  ROGUELITE_STAGE_SCALING,
  getRogueliteShopItemsForStage,
  beginControllerGuardCheckIfNeeded,
  characterList,
  chooseCharacter,
  createRogueliteMapLayer,
  confirmRollDecision,
  createPlayer,
  getRogueliteConnectedNodeIds,
  getRogueliteCycleStage,
  getRogueliteMapNodeId,
  getSummonerSkillInitialCooldown,
  resetToLobbyForRematch,
  resolveGuardCheck,
  rollForActivePlayer,
  selectTarget,
  serializeRoom,
  startGame,
  type CharacterId,
  type DuoCharacterSlot,
  type EmoteId,
  type GameMode,
  type GameEvent,
  type Player,
  type PlayerEmoteEvent,
  type RogueliteMapNodeSelection,
  type RogueliteMapRoomType,
  type RogueliteEventChoiceId,
  type RogueliteEventDraft,
  type RogueliteEventOutcomeDraft,
  type Room,
  type RoomListItem,
  type RoomListStatus,
  type RoomSettings,
  type RogueliteReward,
  type RogueliteEnemyId as BalanceRogueliteEnemyId,
  type RollActionType,
  type RollDecisionChoice,
  type SummonerSkillId,
  type TeamId
} from "@career-war/shared";

// --- New module imports (extracted from this file) ---
import type { ServerContext } from "./context.js";
import * as rm from "./services/roomService.js";
import * as gm from "./services/gameService.js";
import * as eh from "./roguelite/enemyHelpers.js";
import * as rh from "./roguelite/rewardHelpers.js";
import * as rs from "./roguelite/rogueliteService.js";

// These bridge imports only bring in modules that don't conflict with local declarations.
// Constants, handle(), and utils have local declarations that will be migrated later.



const MAX_BATTLE_LOG = 80;
const EMOTE_COOLDOWN_MS = 1000;
const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000;
const ROOM_CLEANUP_INTERVAL_MS = 30 * 1000;
const ROOM_MAX_PLAYERS_OPTIONS = [2, 3, 4, 5, 6, 7, 8] as const;
const DEFAULT_GAME_MODE: GameMode = "classic";
const EDITOR_ENABLED = process.env.NODE_ENV !== "production" || process.env.ENABLE_EDITOR === "true";
const EDITOR_ADMIN_USERS = new Set(
  (process.env.EDITOR_ADMIN_USERS ?? "swh")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
);
const DUO_MAX_CONTROLLERS = 2;
const PVE_BOT_ID = "bot";
const PVE_BOT_CLIENT_ID = "bot";
const PVE_BOT_NICKNAME = "AI";
type RogueliteBossId = RogueliteBossConfig["id"];
type CombatRogueliteRoomType = Extract<RogueliteMapRoomType, "normal" | "elite" | "boss">;
type RogueliteEnemyType = BalanceRogueliteEnemyId;

function getRogueliteEnemyConfig(type: RogueliteEnemyType): RogueliteEnemyConfig {
  const configs = getRogueliteEnemyConfigMap();
  const config = configs[type] ?? configs.normal;
  if (!config) throw new Error("肉鸽敌人配置为空");
  return config;
}

function isRogueliteEnemyType(value: unknown): value is RogueliteEnemyType {
  return typeof value === "string" && value in getRogueliteEnemyConfigMap();
}

function getRogueliteEnemyConfigByTemplateId(value: unknown): RogueliteEnemyConfig | undefined {
  if (isRogueliteEnemyType(value)) return getRogueliteEnemyConfig(value);
  if (typeof value !== "string") return undefined;
  return getRogueliteEnemies()
    .map((enemy) => getRogueliteEnemyConfig(enemy.id))
    .find((enemy) => enemy.enemyTemplateId === value);
}

function getRogueliteEnemyIdentity(config: {
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
    baseCharacterId: config.baseCharacterId
  };
}

function logRogueliteMapNodeSelection(stage: number, mapNode: RogueliteMapNodeSelection | undefined): void {
  console.info("[roguelite map node]", {
    stage,
    roomType: mapNode?.type ?? "normal",
    nodeId: mapNode?.id ?? `n${stage}-0`,
    enemyTemplateId: mapNode?.enemyTemplateId
  });
}

function logRogueliteEnemyTemplateResolution(
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
    baseCharacterId: template.baseCharacterId
  });
}

function logRogueliteEnemyBattleState(
  label: "before_engine" | "after_startGame" | "before_broadcast",
  bot: Room["players"][number]
): void {
  console.info(`[roguelite enemy ${label}]`, {
    name: bot.nickname,
    characterId: bot.characterId,
    hp: bot.hp,
    maxHp: bot.maxHp,
    shield: bot.shield,
    rogueliteEnemyInfo: bot.rogueliteEnemyInfo
  });
}

function applyRogueliteEnemyStats(
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

function logRogueliteEnemySpawn(stage: number, mapNode: RogueliteMapNodeSelection | undefined, bot: Room["players"][number], enemyTemplateId: string): void {
  console.info("[roguelite enemy spawn]", {
    stage,
    roomType: mapNode?.type ?? "normal",
    enemyTemplateId,
    maxHp: bot.maxHp,
    shield: bot.shield
  });
}

function getDefaultRogueliteMapNode(stage: number): RogueliteMapNodeSelection {
  const draft = createRogueliteMapLayer(stage)[0];
  if (!draft) return { id: getRogueliteMapNodeId(stage, 0), stage, type: "normal" };
  return {
    id: draft.id,
    stage: draft.stage,
    type: draft.type,
    enemyTemplateId: draft.enemyTemplateId,
    bossTemplateId: draft.bossTemplateId
  };
}

function reapplyRogueliteEnemyBattleState(room: Room): void {
  if (ensureRoomGameMode(room) !== "pve_roguelite") return;
  const roguelite = ensureRogueliteState(room);
  const stage = roguelite.stage;
  const mapNode = roguelite.currentMapNode ?? getDefaultRogueliteMapNode(stage);
  const forcedRoomType = isCombatRogueliteRoomType(mapNode.type) ? mapNode.type : undefined;
  const bot = room.players.find((player) => player.isBot);
  if (!bot) return;

  logRogueliteMapNodeSelection(stage, mapNode);

  const earlyStage = getRogueliteEarlyStage(stage);
  if (
    (!forcedRoomType || forcedRoomType === "normal") &&
    earlyStage &&
    earlyStage.enemyId &&
    typeof earlyStage.hp === "number" &&
    typeof earlyStage.shield === "number"
  ) {
    const enemyConfig = getRogueliteEnemyConfig(earlyStage.enemyId);
    const rogueliteEnemyInfo: NonNullable<Player["rogueliteEnemyInfo"]> = {
      ...getRogueliteEnemyIdentity(enemyConfig),
      stageType: enemyConfig.type.startsWith("elite_") ? "elite" : "normal",
      hpBonus: 0,
      shieldBonus: earlyStage.shield,
      damageBonus: enemyConfig.damageBonus,
      description: earlyStage.description,
      skillNames: enemyConfig.skills.length > 0 ? enemyConfig.skills : undefined
    };
    logRogueliteEnemyTemplateResolution(stage, mapNode, {
      id: enemyConfig.enemyTemplateId,
      displayName: enemyConfig.displayName,
      maxHp: earlyStage.hp,
      shield: earlyStage.shield,
      baseCharacterId: enemyConfig.baseCharacterId
    });
    applyRogueliteEnemyStats(bot, {
      displayName: enemyConfig.displayName,
      maxHp: earlyStage.hp,
      shield: earlyStage.shield,
      baseCharacterId: enemyConfig.baseCharacterId,
      rogueliteEnemyInfo
    });
    logRogueliteEnemyBattleState("after_startGame", bot);
  }
}

function getRogueliteEnemyForStage(stage: number): RogueliteEnemyConfig {
  const isElite = isRogueliteEliteStage(stage);

  if (!isElite) {
    if (stage >= ROGUELITE_BALANCE_MECHANICS.normalEnemyRotationStartsAtStage) {
      const variants = ROGUELITE_BALANCE_MECHANICS.normalEnemyRotation;
      const variant = variants[stage % variants.length] ?? "normal";
      return getRogueliteEnemyConfig(variant);
    }
    if (stage >= ROGUELITE_BALANCE_MECHANICS.normalGamblerFallbackStartsAtStage && stage % ROGUELITE_BALANCE_MECHANICS.normalGamblerFallbackModulo === 0) {
      return getRogueliteEnemyConfig("normal_gambler");
    }
    return getRogueliteEnemyConfig("normal");
  }

  const eliteCycle = Math.floor((stage - 1) / ROGUELITE_STAGE_SCALING.bossInterval);
  const eliteTypes = stage >= ROGUELITE_BALANCE_MECHANICS.eliteLatePoolStartsAtStage
    ? ROGUELITE_BALANCE_MECHANICS.eliteLatePool
    : ROGUELITE_BALANCE_MECHANICS.eliteEarlyPool;
  const type = eliteTypes[eliteCycle % eliteTypes.length] ?? "elite_iron_skin";
  return getRogueliteEnemyConfig(type);
}

function getRogueliteBossForStage(stage: number): RogueliteBossConfig {
  const bossCycleLength = ROGUELITE_STAGE_SCALING.bossInterval;
  const bossPool = getRogueliteBossPool();
  const bossIndex = Math.floor((stage - 1) / bossCycleLength) % bossPool.length;
  const bossId = bossPool[bossIndex] ?? bossPool[0];
  const bossConfig = bossId ? getRogueliteBossConfigMap()[bossId] : undefined;
  if (!bossConfig) throw new Error("肉鸽 Boss 配置为空");
  return bossConfig;
}

function getRogueliteBossHp(config: RogueliteBossConfig, hpBonus: number): number {
  return config.fixedHp ?? config.baseHp + hpBonus;
}

function isCombatRogueliteRoomType(type: RogueliteMapRoomType): type is CombatRogueliteRoomType {
  return type === "normal" || type === "elite" || type === "boss";
}

function normalizeRogueliteMapNode(input: unknown, fallbackStage: number): RogueliteMapNodeSelection {
  const raw = input && typeof input === "object" ? input as Partial<RogueliteMapNodeSelection> : {};
  const stage = typeof raw.stage === "number" && Number.isFinite(raw.stage) && raw.stage > 0 ? Math.floor(raw.stage) : fallbackStage;
  const type = raw.type && raw.type in ROGUELITE_ROOM_TYPES ? raw.type : "normal";
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `n${stage}-0`;
  const node: RogueliteMapNodeSelection = { id, stage, type };
  if (typeof raw.enemyTemplateId === "string") node.enemyTemplateId = raw.enemyTemplateId;
  if (typeof raw.bossTemplateId === "string") node.bossTemplateId = raw.bossTemplateId;
  if (typeof raw.rewardTier === "string") node.rewardTier = raw.rewardTier;
  return node;
}

function getCanonicalRogueliteMapNode(input: unknown, expectedStage: number): RogueliteMapNodeSelection {
  const raw = normalizeRogueliteMapNode(input, expectedStage);
  if (raw.stage !== expectedStage) throw new Error("地图节点关卡与当前肉鸽关卡不一致");

  const draft = createRogueliteMapLayer(expectedStage).find((node) => node.id === raw.id);
  if (!draft) throw new Error("地图节点不存在");

  return {
    id: draft.id,
    stage: draft.stage,
    type: draft.type,
    enemyTemplateId: draft.enemyTemplateId ?? raw.enemyTemplateId,
    bossTemplateId: draft.bossTemplateId ?? raw.bossTemplateId,
    rewardTier: raw.rewardTier
  };
}

function ensureRogueliteRouteState(roguelite: NonNullable<Room["roguelite"]>): void {
  roguelite.mapRoute ??= {};
  roguelite.consumedMapNodeIds ??= [];
}

function validateRogueliteNextNode(roguelite: NonNullable<Room["roguelite"]>, mapNode: RogueliteMapNodeSelection): void {
  ensureRogueliteRouteState(roguelite);
  if (mapNode.stage !== roguelite.stage) throw new Error("地图节点关卡与当前肉鸽关卡不一致");
  if (roguelite.consumedMapNodeIds?.includes(mapNode.id)) throw new Error("地图节点已处理");

  if (mapNode.stage <= 1) {
    if (mapNode.id !== getRogueliteMapNodeId(1, 0)) throw new Error("只能选择当前层相连节点");
    return;
  }

  const previousStage = mapNode.stage - 1;
  const previousNodeId = roguelite.mapRoute?.[previousStage] ?? getRogueliteMapNodeId(previousStage, 0);
  const previousNode = createRogueliteMapLayer(previousStage).find((node) => node.id === previousNodeId);
  const currentLayer = createRogueliteMapLayer(mapNode.stage);
  if (!previousNode || !currentLayer.some((node) => node.id === mapNode.id)) throw new Error("只能选择当前层相连节点");

  const connectedIds = getRogueliteConnectedNodeIds(previousNode, currentLayer);
  if (!connectedIds.has(mapNode.id)) throw new Error("只能选择当前层相连节点");
}

function rememberRogueliteMapNode(roguelite: NonNullable<Room["roguelite"]>, mapNode: RogueliteMapNodeSelection): void {
  ensureRogueliteRouteState(roguelite);
  roguelite.mapRoute![mapNode.stage] = mapNode.id;
}

function consumeRogueliteMapNode(roguelite: NonNullable<Room["roguelite"]>, mapNode: RogueliteMapNodeSelection): void {
  ensureRogueliteRouteState(roguelite);
  if (!roguelite.consumedMapNodeIds!.includes(mapNode.id)) {
    roguelite.consumedMapNodeIds!.push(mapNode.id);
  }
}

function getRogueliteEarlyStage(stage: number): (typeof ROGUELITE_STAGE_SCALING.earlyStages)[number] | undefined {
  return ROGUELITE_STAGE_SCALING.earlyStages.find((item) => item.stage === stage);
}

function isRogueliteBossStage(stage: number): boolean {
  const cycleStage = getRogueliteCycleStage(stage);
  return cycleStage === ROGUELITE_STAGE_SCALING.bossInterval || cycleStage === 15;
}

function isRogueliteEliteStage(stage: number): boolean {
  return getRogueliteCycleStage(stage) === 5 && stage >= ROGUELITE_BALANCE_MECHANICS.eliteStartsAtStage;
}

function getRogueliteStageBonus(stage: number): { hpBonus: number; shieldBonus: number } {
  const stage4To6 = ROGUELITE_STAGE_SCALING.stage4To6 as Readonly<Partial<Record<number, { hpBonus: number; shieldBonus: number }>>>;
  const cycleStage = getRogueliteCycleStage(stage);
  const configured = stage4To6[cycleStage];
  if (configured) return configured;

  let hpBonus = stage * ROGUELITE_STAGE_SCALING.stage7Plus.hpBonusPerStage;
  let shieldBonus = Math.floor(stage / ROGUELITE_STAGE_SCALING.stage7Plus.shieldStageDivisor) * ROGUELITE_STAGE_SCALING.stage7Plus.shieldBonusPerStep;
  if (isRogueliteBossStage(stage)) {
    hpBonus += ROGUELITE_STAGE_SCALING.stage7Plus.bossExtraHp;
    shieldBonus += ROGUELITE_STAGE_SCALING.stage7Plus.bossExtraShield;
  } else if (isRogueliteEliteStage(stage)) {
    hpBonus += ROGUELITE_STAGE_SCALING.stage7Plus.eliteExtraHp;
    shieldBonus += ROGUELITE_STAGE_SCALING.stage7Plus.eliteExtraShield;
  }
  return { hpBonus, shieldBonus };
}

const REWARD_TO_PERK: Record<string, { perkId: string; levels: number }> = {
  heavy_punch_training: { perkId: "heavy_punch", levels: 1 },
  starter_heavy_punch: { perkId: "heavy_punch", levels: 2 },
  iron_body: { perkId: "iron_body", levels: 1 },
  starter_iron_wall: { perkId: "iron_body", levels: 2 },
  blood_punch: { perkId: "blood_punch", levels: 1 },
  starter_blood_punch: { perkId: "blood_punch", levels: 2 },
  breathing_recovery: { perkId: "breathing_recovery", levels: 1 },
  battle_instinct: { perkId: "battle_instinct", levels: 1 },
  guard_training: { perkId: "guard_training", levels: 1 },
  starter_recovery: { perkId: "starter_recovery", levels: 1 },
  berserker_blood: { perkId: "berserker_blood", levels: 1 },
  vampire_instinct: { perkId: "vampire_instinct", levels: 1 },
  dragon_courage: { perkId: "dragon_courage", levels: 1 },
  gunner_triple_shot: { perkId: "gunner_triple_shot", levels: 1 },
  vampire_skill: { perkId: "vampire_skill", levels: 1 },
  zhaoyun_pierce: { perkId: "zhaoyun_pierce", levels: 1 },
  flame_lord_mark: { perkId: "flame_lord_mark", levels: 1 },
  vitality_boost: { perkId: "vitality_boost", levels: 1 },
  shield_wall: { perkId: "shield_wall", levels: 1 },
  first_strike: { perkId: "first_strike", levels: 1 },
  low_hp_armor: { perkId: "low_hp_armor", levels: 1 },
  kill_heal: { perkId: "kill_heal", levels: 1 },
  drink_blood: { perkId: "drink_blood", levels: 1 },
  comeback: { perkId: "comeback", levels: 1 },
  low_roll_defense: { perkId: "low_roll_defense", levels: 1 },
  shield_strike: { perkId: "shield_strike", levels: 1 },
  shield_overload: { perkId: "shield_overload", levels: 1 },
  sturdy_bulwark: { perkId: "sturdy_bulwark", levels: 1 },
  fate_tokens: { perkId: "fate_tokens", levels: 1 },
  low_roll_charge: { perkId: "low_roll_charge", levels: 1 },
  desperate_reroll: { perkId: "desperate_reroll", levels: 1 },
  lucky_floor: { perkId: "lucky_floor", levels: 1 }
};
const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  allowDuplicateCharacters: true,
  gameMode: DEFAULT_GAME_MODE
};
const PORT = Number(process.env.PORT ?? 3001);
const isLocalDev = process.env.NODE_ENV !== "production" && process.env.npm_lifecycle_event === "dev";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? (isLocalDev ? "http://localhost:5173" : undefined);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const clientIndexPath = path.join(clientDistPath, "index.html");

const app = express();
if (CLIENT_ORIGIN) {
  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
}

app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware);
app.use(authRouter);

function ensureEditorAccess(req: express.Request, res: express.Response): boolean {
  if (!EDITOR_ENABLED) {
    res.status(403).json({ error: "编辑器未启用" });
    return false;
  }
  if (!req.currentUser) {
    res.status(401).json({ error: "请先登录管理员账号" });
    return false;
  }
  if (!EDITOR_ADMIN_USERS.has(req.currentUser.username)) {
    res.status(403).json({ error: "当前账号没有编辑器权限" });
    return false;
  }
  return true;
}

app.get("/api/game/characters", (_req, res) => {
  res.json({ characters: getGameCharacters() });
});

app.get("/api/editor/characters", async (req, res) => {
  if (!ensureEditorAccess(req, res)) return;
  try {
    const characters = await loadEditableCharacters();
    res.json({ characters });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取失败";
    res.status(500).json({ error: message });
  }
});

app.post("/api/editor/characters", async (req, res) => {
  if (!ensureEditorAccess(req, res)) return;
  try {
    const characters = await saveEditableCharacters(req.body?.characters);
    await refreshCharacterData();
    res.json({ ok: true, characters });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    res.status(400).json({ error: message });
  }
});

app.get("/api/editor/roguelite/events", async (req, res) => {
  if (!ensureEditorAccess(req, res)) return;
  try {
    const events = await loadEditableRogueliteEvents();
    res.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取失败";
    res.status(500).json({ error: message });
  }
});

app.post("/api/editor/roguelite/events", async (req, res) => {
  if (!ensureEditorAccess(req, res)) return;
  try {
    const events = await saveEditableRogueliteEvents(req.body?.events);
    await refreshRogueliteEvents();
    res.json({ ok: true, events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    res.status(400).json({ error: message });
  }
});

app.get("/api/editor/roguelite/balance", async (req, res) => {
  if (!ensureEditorAccess(req, res)) return;
  try {
    const balance = await loadEditableRogueliteBalance();
    res.json({ balance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取失败";
    res.status(500).json({ error: message });
  }
});

app.post("/api/editor/roguelite/balance", async (req, res) => {
  if (!ensureEditorAccess(req, res)) return;
  try {
    const balance = await saveEditableRogueliteBalance(req.body?.balance);
    await refreshRogueliteBalance();
    res.json({ ok: true, balance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    res.status(400).json({ error: message });
  }
});

app.get("/api/editor/roguelite/shop", async (req, res) => {
  if (!ensureEditorAccess(req, res)) return;
  try {
    const shop = await loadEditableRogueliteShop();
    res.json({ shop });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取失败";
    res.status(500).json({ error: message });
  }
});

app.post("/api/editor/roguelite/shop", async (req, res) => {
  if (!ensureEditorAccess(req, res)) return;
  try {
    const shop = await saveEditableRogueliteShop(req.body?.shop);
    res.json({ ok: true, shop });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    res.status(400).json({ error: message });
  }
});

app.get("/api/editor/roguelite/rest-sites", async (req, res) => {
  if (!ensureEditorAccess(req, res)) return;
  try {
    const restSites = await loadEditableRogueliteRestSites();
    res.json({ restSites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取失败";
    res.status(500).json({ error: message });
  }
});

app.post("/api/editor/roguelite/rest-sites", async (req, res) => {
  if (!ensureEditorAccess(req, res)) return;
  try {
    const restSites = await saveEditableRogueliteRestSites(req.body?.restSites);
    res.json({ ok: true, restSites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    res.status(400).json({ error: message });
  }
});

app.get("/health", (_req, res) => {
  const characterData = getCharacterDataStatus();
  res.json({ ok: characterData.ok, rooms: rooms.size, characterData });
});

if (!isLocalDev) {
  app.use(express.static(clientDistPath));
  app.get(/^\/(?!health$).*/, (_req, res) => {
    res.sendFile(clientIndexPath);
  });
}

const httpServer = createServer(app);
const io = new Server(
  httpServer,
  CLIENT_ORIGIN
    ? {
        cors: {
          origin: CLIENT_ORIGIN,
          methods: ["GET", "POST"]
        }
      }
    : {}
);

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();
const socketToClient = new Map<string, string>();
const emoteCooldowns = new Map<string, number>();
const allowedEmoteIds = new Set<string>(EMOTE_IDS);
const botTurnTimers = new Map<string, ReturnType<typeof setTimeout>>();

io.on("connection", (socket) => {
  socket.emit("characters", getGameCharacters());

  socket.on("clientPing", (payload: { clientSentAt?: unknown } | undefined) => {
    const clientSentAt = typeof payload?.clientSentAt === "number" ? payload.clientSentAt : Date.now();
    socket.emit("clientPong", {
      clientSentAt,
      serverReceivedAt: Date.now()
    });
  });

  socket.on("requestRoomList", (_payload: unknown, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const roomList = getPublicRoomList();
      socket.emit("roomListUpdated", roomList);
      return { roomList };
    });
  });

  socket.on("createRoom", (payload: { nickname?: string; clientId?: string; userId?: string; gameMode?: GameMode }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const nickname = sanitizeNickname(payload.nickname);
      const clientId = sanitizeClientId(payload.clientId);
      const userId = sanitizeOptionalId(payload.userId);
      const gameMode = isGameMode(payload.gameMode) ? payload.gameMode : DEFAULT_GAME_MODE;
      removePlayerFromRoom(socket.id);
      removeClientFromRooms(clientId);
      const roomId = createRoomId();
      const player = createPlayer(socket.id, clientId, nickname, true);
      if (userId) player.userId = userId;
      const room: Room = {
        id: roomId,
        hostId: socket.id,
        phase: "lobby",
        gameMode,
        settings: {
          ...DEFAULT_ROOM_SETTINGS,
          gameMode,
          maxPlayers: gameMode === "duo_2v2" ? DUO_MAX_CONTROLLERS : isSinglePlayerPveGameMode(gameMode) ? 1 : DEFAULT_ROOM_SETTINGS.maxPlayers
        },
        players: [player],
        rematchReadyPlayerIds: [],
        activePlayerIndex: 0,
        effects: [],
        battleLog: [],
        snapshots: [],
        previousFinalDamage: 0
      };

      ensureDuoSlots(room);
      rooms.set(roomId, room);
      bindSocketToRoom(socket.id, clientId, roomId);
      const event = addEvent(room, "system", `${nickname} 创建了房间 ${roomId}`);
      broadcastRoom(room, [event]);
      broadcastRoomList();
      return { roomId, playerId: socket.id, room: serializeRoomForViewer(room, socket.id, clientId) };
    });
  });

  socket.on("joinRoom", (payload: { roomId?: string; nickname?: string; clientId?: string; playerId?: string; userId?: string; gameMode?: GameMode }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const roomId = (payload.roomId ?? "").trim().toUpperCase();
      const room = getRoom(roomId);
      const gameMode = ensureRoomGameMode(room);
      if (payload.gameMode !== undefined && payload.gameMode !== gameMode) throw new Error("房间模式与当前入口不匹配");
      const maxPlayers = getRoomMaxPlayers(room);
      const clientId = sanitizeClientId(payload.clientId);
      const userId = sanitizeOptionalId(payload.userId);
      const existing = findReconnectPlayer(room, sanitizeOptionalId(payload.playerId), clientId, userId);

      if (existing) {
        if (gameMode === "duo_2v2" && room.phase !== "lobby") {
          const previousControllerId = existing.controllerId;
          const previousClientId = existing.clientId;
          if (!previousControllerId) throw new Error("没有可恢复的 2V2 控制者身份");
          rebindDuoControllerReferences(room, previousControllerId, socket.id, clientId, userId);
          unbindClientSocketsFromRoom(previousClientId, roomId);
          if (previousClientId !== clientId) unbindClientSocketsFromRoom(clientId, roomId);
          bindSocketToRoom(socket.id, clientId, roomId);
          const event = addEvent(room, "system", `${existing.nickname} 已重新连接`);
          broadcastRoom(room, [event]);
          broadcastRoomList();
          return { roomId, playerId: socket.id, room: serializeRoomForViewer(room, socket.id, clientId) };
        }
        const previousId = existing.id;
        const previousClientId = existing.clientId;
        existing.id = socket.id;
        existing.clientId = clientId;
        if (userId) existing.userId = userId;
        existing.isOnline = true;
        rebindPlayerReferences(room, previousId, socket.id);
        ensureDuoSlots(room);
        unbindClientSocketsFromRoom(previousClientId, roomId);
        if (previousClientId !== clientId) unbindClientSocketsFromRoom(clientId, roomId);
        dedupeRoomPlayersForIdentity(room, socket.id, clientId, userId);
        bindSocketToRoom(socket.id, clientId, roomId);
        const event = addEvent(room, "system", `${existing.nickname} 已重新连接`);
        broadcastRoom(room, [event]);
        broadcastRoomList();
        return { roomId, playerId: socket.id, room: serializeRoomForViewer(room, socket.id, clientId) };
      }

      if (room.phase !== "lobby") throw new Error("游戏已经开始，不能加入");
      if (isSinglePlayerPveGameMode(gameMode)) throw new Error("单人 PVE 房间不支持加入");
      if (getRoomParticipantCount(room) >= maxPlayers) throw new Error("房间已满");

      const nickname = sanitizeNickname(payload.nickname);
      const player = createPlayer(socket.id, clientId, nickname, false);
      if (userId) player.userId = userId;
      room.players.push(player);
      ensureDuoSlots(room);
      bindSocketToRoom(socket.id, clientId, roomId);
      const event = addEvent(room, "system", `${nickname} 加入了房间`);
      broadcastRoom(room, [event]);
      broadcastRoomList();
      return { roomId, playerId: socket.id, room: serializeRoomForViewer(room, socket.id, clientId) };
    });
  });

  socket.on("resumeRoom", (payload: { roomId?: string; clientId?: string; playerId?: string; userId?: string }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const roomId = (payload.roomId ?? "").trim().toUpperCase();
      const clientId = sanitizeClientId(payload.clientId);
      const userId = sanitizeOptionalId(payload.userId);
      const room = getRoom(roomId);
      const player = findReconnectPlayer(room, sanitizeOptionalId(payload.playerId), clientId, userId);
      if (!player) throw new Error("没有可恢复的房间身份");
      if (ensureRoomGameMode(room) === "duo_2v2" && room.phase !== "lobby") {
        const previousControllerId = player.controllerId;
        const previousClientId = player.clientId;
        if (!previousControllerId) throw new Error("没有可恢复的 2V2 控制者身份");
        rebindDuoControllerReferences(room, previousControllerId, socket.id, clientId, userId);
        unbindClientSocketsFromRoom(previousClientId, roomId);
        if (previousClientId !== clientId) unbindClientSocketsFromRoom(clientId, roomId);
        bindSocketToRoom(socket.id, clientId, roomId);
        const event = addEvent(room, "system", `${player.nickname} 已重新连接`);
        broadcastRoom(room, [event]);
        broadcastRoomList();
        return { roomId, playerId: socket.id, room: serializeRoomForViewer(room, socket.id, clientId) };
      }
      const previousId = player.id;
      const previousClientId = player.clientId;
      player.id = socket.id;
      player.clientId = clientId;
      if (userId) player.userId = userId;
      player.isOnline = true;
      rebindPlayerReferences(room, previousId, socket.id);
      ensureDuoSlots(room);
      unbindClientSocketsFromRoom(previousClientId, roomId);
      if (previousClientId !== clientId) unbindClientSocketsFromRoom(clientId, roomId);
      dedupeRoomPlayersForIdentity(room, socket.id, clientId, userId);
      bindSocketToRoom(socket.id, clientId, roomId);
      const event = addEvent(room, "system", `${player.nickname} 已重新连接`);
      broadcastRoom(room, [event]);
      broadcastRoomList();
      return { roomId, playerId: socket.id, room: serializeRoomForViewer(room, socket.id, clientId) };
    });
  });

  socket.on("leaveRoom", (_payload: unknown, reply?: Ack) => {
    handle(socket.id, reply, () => {
      removePlayerFromRoom(socket.id);
      return { ok: true };
    });
  });

  socket.on("kickPlayer", (payload: { playerId?: string }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (room.phase !== "lobby") throw new Error("Can only kick players in lobby");
      const requesterClientId = socketToClient.get(socket.id);
      const requester = room.players.find((player) => player.id === socket.id || Boolean(requesterClientId && player.clientId === requesterClientId));
      if (!requester || (room.hostId !== requester.id && !requester.isHost)) throw new Error("Only host can kick players");

      const targetPlayerId = sanitizeOptionalId(payload?.playerId);
      const target = room.players.find((player) => player.id === targetPlayerId);
      if (!target || target.isBot) throw new Error("Player not found");
      if (target.id === requester.id) throw new Error("Host cannot kick self");

      room.players = room.players.filter((player) => player.id !== target.id);
      room.rematchReadyPlayerIds = room.rematchReadyPlayerIds.filter((playerId) => playerId !== target.id);
      room.duoSlots = room.duoSlots?.filter((slot) => slot.controllerId !== target.id);
      if (room.activePlayerIndex >= room.players.length) {
        room.activePlayerIndex = 0;
      }
      ensureDuoSlots(room);

      for (const [socketId, mappedClientId] of Array.from(socketToClient.entries())) {
        if (mappedClientId !== target.clientId || socketToRoom.get(socketId) !== room.id) continue;
        const targetSocket = io.sockets.sockets.get(socketId);
        targetSocket?.emit("kickedFromRoom", { roomId: room.id });
        targetSocket?.leave(room.id);
        socketToRoom.delete(socketId);
        socketToClient.delete(socketId);
      }

      const event = addEvent(room, "system", `${target.nickname} was kicked by host`);
      refreshRoomEmptySince(room);
      broadcastRoom(room, [event]);
      broadcastRoomList();
      return { ok: true };
    });
  });

  socket.on("chooseCharacter", (payload: { characterId?: CharacterId }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (room.phase !== "lobby") throw new Error("游戏开始后不能更换职业");
      if (!payload.characterId) throw new Error("请选择职业");
      validateCharacterChoice(room, socket.id, payload.characterId);
      const event = chooseCharacter(room, socket.id, payload.characterId);
      room.battleLog.unshift(event);
      trimBattleLog(room);
      broadcastRoom(room, [event]);
      return { ok: true };
    });
  });

  socket.on("chooseSummonerSkill", (payload: { summonerSkillId?: SummonerSkillId }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (room.phase !== "lobby") throw new Error("游戏开始后不能更换召唤师技能");
      if (!payload.summonerSkillId || !isSummonerSkillId(payload.summonerSkillId)) throw new Error("请选择召唤师技能");
      const player = room.players.find((item) => item.id === socket.id);
      if (!player) throw new Error("玩家不存在");
      player.summonerSkillId = payload.summonerSkillId;
      player.summonerSkillCooldown = 0;
      emitRoomToParticipants(room);
      return { ok: true };
    });
  });

  socket.on("chooseDuoSlotCharacter", (payload: { slotIndex?: 0 | 1; characterId?: CharacterId }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (ensureRoomGameMode(room) !== "duo_2v2") throw new Error("当前房间不是 2V2 模式");
      if (room.phase !== "lobby") throw new Error("游戏开始后不能更换职业");
      if (payload.slotIndex !== 0 && payload.slotIndex !== 1) throw new Error("2V2 槽位无效");
      if (!payload.characterId || !isCharacterId(payload.characterId)) throw new Error("请选择有效职业");
      chooseDuoSlotCharacter(room, socket.id, payload.slotIndex, payload.characterId);
      emitRoomToParticipants(room);
      broadcastRoomList();
      return { ok: true };
    });
  });

  socket.on("chooseDuoSlotSummonerSkill", (payload: { slotIndex?: 0 | 1; summonerSkillId?: SummonerSkillId }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (ensureRoomGameMode(room) !== "duo_2v2") throw new Error("当前房间不是 2V2 模式");
      if (room.phase !== "lobby") throw new Error("游戏开始后不能更换召唤师技能");
      if (payload.slotIndex !== 0 && payload.slotIndex !== 1) throw new Error("2V2 槽位无效");
      if (!payload.summonerSkillId || !isSummonerSkillId(payload.summonerSkillId)) throw new Error("请选择有效召唤师技能");
      chooseDuoSlotSummonerSkill(room, socket.id, payload.slotIndex, payload.summonerSkillId);
      emitRoomToParticipants(room);
      return { ok: true };
    });
  });

  socket.on("updateRoomSettings", (payload: Partial<RoomSettings> | undefined, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      updateRoomSettings(room, socket.id, payload ?? {});
      emitRoomToParticipants(room);
      return { ok: true };
    });
  });

  socket.on("startGame", (_payload: unknown, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (room.hostId !== socket.id) throw new Error("只有房主可以开始游戏");
      if (ensureRoomGameMode(room) === "duo_2v2") {
        const events = startDuoGameV0(room);
        broadcastRoom(room, events);
        broadcastRoomList();
        return { ok: true };
      }
      if (isSinglePlayerPveMode(room)) {
        validatePveStartGame(room, socket.id);
        if (ensureRoomGameMode(room) === "pve_roguelite") {
          room.roguelite = { stage: 1, maxStage: ROGUELITE_MAX_STAGE, appliedRewards: [], battleRound: 1, fatigueBonus: 0, fatigueAnnouncedBonus: 0 };
          room.roguelite.currentMapNode = getDefaultRogueliteMapNode(1);
          logRogueliteMapNodeSelection(1, room.roguelite.currentMapNode);
        }
        ensurePveBot(room);
        validateStartGame(room);
        const events = startGame(room, serverContext);
        if (ensureRoomGameMode(room) === "pve_roguelite") {
          reapplyRogueliteEnemyBattleState(room);
          const humanPlayer = room.players.find((player) => !player.isBot);
          if (humanPlayer) {
            humanPlayer.summonerSkillId = undefined;
            humanPlayer.summonerSkillCooldown = 0;
          }
          const playerIndex = room.players.findIndex((player) => !player.isBot);
          if (playerIndex >= 0) room.activePlayerIndex = playerIndex;
        }
        broadcastRoom(room, events);
        broadcastRoomList();
        scheduleBotTurnIfNeeded(room);
        return { ok: true };
      }
      validateStartGame(room);
      const events = startGame(room, serverContext);
      broadcastRoom(room, events);
      return { ok: true };
    });
  });

  socket.on("selectActor", (payload: { actorId?: string }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (ensureRoomGameMode(room) !== "duo_2v2") throw new Error("当前房间不是 2V2 模式");
      if (room.phase !== "battle") throw new Error("2V2 尚未进入战斗阶段");
      if (room.activeControllerId !== socket.id) throw new Error("轮到你时才能选择行动角色");
      if (beginControllerGuardCheckIfNeeded(room, socket.id)) {
        emitRoomToParticipants(room);
        throw new Error("请先完成架盾判定");
      }
      if (!payload.actorId) throw new Error("请选择行动角色");
      if (room.pendingRoll || room.pendingRollDecision || room.pendingGuardCheck) throw new Error("请先完成当前投骰流程");

      const actor = room.players.find((player) => player.id === payload.actorId);
      if (!actor) throw new Error("行动角色不存在");
      if (actor.controllerId !== room.activeControllerId) throw new Error("只能选择自己控制的角色");
      if (actor.isDead) throw new Error("死亡角色不能行动");

      room.selectedActorId = actor.id;
      emitRoomToParticipants(room);
      return { ok: true };
    });
  });

    socket.on("selectTarget", (payload: { targetId?: string }, reply?: Ack) => {
      handle(socket.id, reply, () => {
        const room = getSocketRoom(socket.id);
        if (!payload.targetId) throw new Error("请选择目标");
        if (ensureRoomGameMode(room) === "duo_2v2") {
          selectTarget(room, socket.id, payload.targetId, socket.id);
        } else {
          selectTarget(room, socket.id, payload.targetId);
        }
        emitRoomToParticipants(room);
        return { ok: true };
      });
    });

    socket.on("rollDice", (_payload: unknown, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      const result = ensureRoomGameMode(room) === "duo_2v2"
        ? rollForActivePlayer(room, socket.id, serverContext, socket.id)
        : rollForActivePlayer(room, socket.id, serverContext);
      broadcastRoom(room, result.events);
      emitGameOverIfNeeded(room, result);
      scheduleBotTurnIfNeeded(room);
      return { ok: true };
    });
  });

  socket.on("rollGuardCheck", (_payload: unknown, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (room.phase !== "battle") throw new Error("游戏尚未开始");
      const pending = room.pendingGuardCheck;
      if (!pending) throw new Error("当前没有需要结算的架盾判定");
      const actor = room.players.find((player) => player.id === pending.actorId);
      if (!actor) throw new Error("架盾判定角色不存在");
      if (actor.characterId !== "mountain_shield") throw new Error("只有山盾需要架盾判定");
      if (!actor.guarding) throw new Error("山盾当前不在架盾状态");
      if (ensureRoomGameMode(room) === "duo_2v2") {
        if (room.activeControllerId !== socket.id || pending.controllerId !== socket.id || actor.controllerId !== socket.id) {
          throw new Error("只有当前控制者可以进行架盾判定");
        }
      } else {
        if (actor.id !== socket.id || room.players[room.activePlayerIndex]?.id !== actor.id) {
          throw new Error("只有当前山盾玩家可以进行架盾判定");
        }
      }

      const result = resolveGuardCheck(room, actor.id, serverContext);
      broadcastRoom(room, result.events);
      emitGameOverIfNeeded(room, result);
      scheduleBotTurnIfNeeded(room);
      return { ok: true };
    });
  });

    socket.on("confirmRollDecision", (payload: { roomId?: string; pendingDecisionId?: string; decisionId?: string; actionType?: RollActionType; choice?: RollDecisionChoice; skillId?: string; summonerSkillId?: SummonerSkillId; selfDamageAmount?: number }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (payload.roomId && payload.roomId !== room.id) throw new Error("房间不匹配");
      const decisionId = payload.pendingDecisionId ?? payload.decisionId;
      const choice = payload.actionType ?? payload.choice;
      const summonerSkillId = payload.summonerSkillId ?? (isSummonerSkillId(payload.skillId) ? payload.skillId : undefined);
      if (!decisionId || !choice) throw new Error("缺少投后选择");
      if (!isRollDecisionChoice(choice)) throw new Error("未知的投后选择");
      const result = ensureRoomGameMode(room) === "duo_2v2"
        ? confirmRollDecision(room, socket.id, decisionId, choice, serverContext, summonerSkillId, payload.selfDamageAmount, socket.id)
        : confirmRollDecision(room, socket.id, decisionId, choice, serverContext, summonerSkillId, payload.selfDamageAmount);
      broadcastRoom(room, result.events);
      emitGameOverIfNeeded(room, result);
      scheduleBotTurnIfNeeded(room);
      return { ok: true };
    });
  });

  socket.on("readyForRematch", (_payload: unknown, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (room.phase !== "gameOver") throw new Error("只有游戏结束后才能准备再来一局");
      if (shouldCleanupDuoRoom(room)) {
        deleteRoomAndUnbindSockets(room.id);
        broadcastRoomList();
        return { ok: true, removed: true };
      }
      const rematchPlayerId = getRematchPlayerIdForSocket(room, socket.id, socketToClient.get(socket.id));
      if (!room.rematchReadyPlayerIds.includes(rematchPlayerId)) {
        room.rematchReadyPlayerIds.push(rematchPlayerId);
      }

      const requiredPlayerIds = getRematchRequiredPlayerIds(room);
      if (ensureRoomGameMode(room) === "duo_2v2" && requiredPlayerIds.length < DUO_MAX_CONTROLLERS) {
        deleteRoomAndUnbindSockets(room.id);
        broadcastRoomList();
        return { ok: true, removed: true };
      }
      if (requiredPlayerIds.length > 0 && requiredPlayerIds.every((playerId) => room.rematchReadyPlayerIds.includes(playerId))) {
        resetToLobbyForRematch(room);
        removePveBotsForLobby(room);
        emitRoomToParticipants(room);
        return { ok: true, reset: true };
      }

        emitRoomToParticipants(room);
      return { ok: true };
    });
  });

  socket.on("chooseRogueliteReward", (payload: { rewardId?: string }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (ensureRoomGameMode(room) !== "pve_roguelite") throw new Error("当前房间不是肉鸽挑战");
      if (room.phase !== "reward") throw new Error("当前不能选择奖励");
      const player = room.players.find((item) => item.id === socket.id && !item.isBot);
      if (!player) throw new Error("玩家不存在");
      const choices = room.roguelite?.rewardChoices ?? [];
      const reward = choices.find((item) => item.id === payload.rewardId);
      if (!reward) throw new Error("奖励不存在");

      applyRogueliteReward(player, reward);
      room.roguelite ??= { stage: 1, maxStage: ROGUELITE_MAX_STAGE, appliedRewards: [] };
      room.roguelite.appliedRewards = [...(room.roguelite.appliedRewards ?? []), reward];
      room.roguelite.stage += 1;
      room.roguelite.rewardChoices = undefined;

      // Perk gained/upgraded feedback
      const perkMapping = REWARD_TO_PERK[reward.type];
      if (perkMapping) {
        const currentLevel = player.roguelitePerkStacks?.[perkMapping.perkId] ?? 0;
        const verb = currentLevel > perkMapping.levels ? "升级" : "获得";
        addEvent(room, "system", `${verb}词条：${reward.name} Lv.${currentLevel}`);
      }

      if (isRogueliteSkillRewardType(reward.type)) {
        const currentLevel = player.rogueliteSkillStacks?.[reward.type] ?? 0;
        const verb = currentLevel > 1 ? "升级" : "获得";
        addEvent(room, "system", `${verb}角色技能：${reward.name} Lv.${currentLevel}`);
      }

      room.phase = "roguelite_continue";
      const event = addEvent(room, "system", `${player.nickname} 选择奖励：${reward.name}，请选择第 ${room.roguelite.stage} 关路线`);
      broadcastRoom(room, [event]);
      return { ok: true };
    });
  });

  socket.on("chooseRogueliteEventOption", (payload: { choiceId?: RogueliteEventChoiceId }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (ensureRoomGameMode(room) !== "pve_roguelite") throw new Error("当前房间不是肉鸽挑战");
      if (room.phase !== "roguelite_event") throw new Error("当前不能选择事件选项");
      const player = room.players.find((item) => item.id === socket.id && !item.isBot);
      if (!player) throw new Error("玩家不存在");

      const roguelite = ensureRogueliteState(room);
      const pendingEvent = roguelite.pendingEvent;
      if (!pendingEvent) throw new Error("当前没有待处理事件");
      const choiceId = payload.choiceId;
      if (choiceId !== "a" && choiceId !== "b") throw new Error("请选择事件选项");
      const choiceIndex = choiceId === "a" ? 0 : 1;
      const eventDraft = getRogueliteEvents().find((event) => event.id === pendingEvent.id);
      const choiceDraft = eventDraft?.choices[choiceIndex];
      const publicChoice = pendingEvent.choices[choiceIndex];
      if (!eventDraft || !choiceDraft || !publicChoice) throw new Error("事件配置不存在");

      const result = applyRogueliteEventChoice(room, player, eventDraft, choiceDraft);
      roguelite.pendingEvent = undefined;
      addEvent(room, "system", `${player.nickname} 在「${pendingEvent.name}」中选择：${publicChoice.label}`);

      if (result.playerDied) {
        room.phase = "gameOver";
        room.winnerId = PVE_BOT_ID;
        addEvent(room, "death", `${player.nickname} 已死亡`);
        addEvent(room, "victory", `${player.nickname} 挑战失败`);
        emitRoomToParticipants(room);
        io.to(room.id).emit("gameOver", { winnerId: PVE_BOT_ID, winnerName: "AI" });
      } else if (result.opensRewardChoice) {
        // TODO: 事件里标记为角色技能池、Boss 能力池或稀有奖励池时，当前先降级为基础成长池。
        roguelite.rewardChoices = createRogueliteBasicRewardChoices(player.roguelitePerkStacks);
        room.phase = "reward";
        addEvent(room, "system", `事件奖励：从基础成长池选择 1 个奖励`);
      } else {
        roguelite.stage += 1;
        room.phase = "roguelite_continue";
        addEvent(room, "system", `事件结算完成，请选择第 ${roguelite.stage} 关路线`);
      }

      emitRoomToParticipants(room);
      return { ok: true };
    });
  });

  socket.on("chooseRogueliteContinue", (payload: { choice?: "finish" | "continue"; mapNode?: unknown }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (ensureRoomGameMode(room) !== "pve_roguelite") throw new Error("当前房间不是肉鸽挑战");
      if (room.phase !== "roguelite_continue") throw new Error("当前不能选择结束或继续");
      const player = room.players.find((item) => item.id === socket.id && !item.isBot);
      if (!player) throw new Error("玩家不存在");
      const choice = payload.choice;
      if (choice !== "finish" && choice !== "continue") throw new Error("请选择结束挑战或继续挑战");

      if (choice === "finish") {
        room.phase = "gameOver";
        room.winnerId = player.id;
        const victoryEvent = addEvent(room, "victory", `${player.nickname} 挑战成功！`);
        broadcastRoom(room, [victoryEvent]);
        io.to(room.id).emit("gameOver", { winnerId: player.id, winnerName: player.nickname });
        return { ok: true };
      }

      const roguelite = ensureRogueliteState(room);
      const mapNode = getCanonicalRogueliteMapNode(payload.mapNode, roguelite.stage);
      validateRogueliteNextNode(roguelite, mapNode);

      if (mapNode.type === "event") {
        startRogueliteEventRoom(room, player, roguelite, mapNode);
        const event = addEvent(room, "system", `${player.nickname} 进入第 ${mapNode.stage} 关 · ${ROGUELITE_ROOM_TYPES[mapNode.type].label}`);
        broadcastRoom(room, [event]);
        return { ok: true };
      }

      if (!isCombatRogueliteRoomType(mapNode.type)) {
        rememberRogueliteMapNode(roguelite, mapNode);
        consumeRogueliteMapNode(roguelite, mapNode);
        roguelite.currentMapNode = mapNode;
        if (mapNode.type === "shop") {
          roguelite.shopPurchasedIds = []; // reset per-visit purchase tracking
          room.phase = "roguelite_shop";
          const event = addEvent(room, "system", `${player.nickname} 进入第 ${mapNode.stage} 关 · 商店`);
          broadcastRoom(room, [event]);
          return { ok: true };
        }
        if (mapNode.type === "rest") {
          room.phase = "roguelite_rest";
          const event = addEvent(room, "system", `${player.nickname} 进入第 ${mapNode.stage} 关 · 休息点`);
          broadcastRoom(room, [event]);
          return { ok: true };
        }
        // reward nodes still skip
        roguelite.stage += 1;
        room.phase = "roguelite_continue";
        const event = addEvent(room, "system", `${player.nickname} 完成第 ${mapNode.stage} 关 · ${ROGUELITE_ROOM_TYPES[mapNode.type].label}，请选择第 ${roguelite.stage} 关路线`);
        broadcastRoom(room, [event]);
        return { ok: true };
      }

      // continue
      prepareNextRogueliteStage(room, player, mapNode);
      const event = addEvent(room, "system", `${player.nickname} 继续挑战，进入第 ${mapNode.stage} 关 · ${ROGUELITE_ROOM_TYPES[mapNode.type].label}`);
      broadcastRoom(room, [event]);
      scheduleBotTurnIfNeeded(room);
      return { ok: true };
    });
  });

  // ── Roguelite shop ──
  socket.on("buyRogueliteShopItem", (payload: { itemId?: unknown }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (ensureRoomGameMode(room) !== "pve_roguelite") throw new Error("当前房间不是肉鸽挑战");
      if (room.phase !== "roguelite_shop") throw new Error("当前不在商店阶段");
      const player = room.players.find((p) => p.id === socket.id && !p.isBot);
      if (!player) throw new Error("玩家不存在");
      const roguelite = ensureRogueliteState(room);
      const itemId = typeof payload?.itemId === "string" ? payload.itemId : "";
      // Validate item against stage filter + active whitelist, not raw list
      const availableItems = getRogueliteShopItemsForStage(roguelite.stage);
      const item = availableItems.find((i) => i.id === itemId);
      if (!item) throw new Error("商品不存在或当前阶段不可购买");

      // Per-visit purchase limit: "每次商店 1 次" items can only be bought once
      roguelite.shopPurchasedIds ??= [];
      if (item.limit.includes("1 次") && roguelite.shopPurchasedIds.includes(itemId)) {
        throw new Error("该商品本次商店已购买过");
      }

      const gold = roguelite.runGold ?? 0;
      if (gold < item.price) throw new Error(`金币不足（需要 ${item.price}，当前 ${gold}）`);

      roguelite.runGold = gold - item.price;
      roguelite.shopPurchasedIds.push(itemId);
      addEvent(room, "system", `${player.nickname} 花费 ${item.price} 金币购买了「${item.name}」：${item.effect}`);

      // Apply item effect
      if (item.type === "heal") {
        const healAmt = item.id === "large_healing_potion" ? 14 : 6;
        const healed = Math.min(player.maxHp - player.hp, healAmt);
        if (healed > 0) {
          player.hp += healed;
          const ev = addEvent(room, "heal", `${player.nickname} 使用${item.name}回复 ${healed} 生命`);
          ev.playerId = player.id;
          ev.healing = healed;
        }
      } else if (item.type === "relic") {
        if (item.id === "shield_patch") {
          roguelite.nextBattleShieldBonus = (roguelite.nextBattleShieldBonus ?? 0) + 6;
        }
        addEvent(room, "system", `${player.nickname} 获得遗物「${item.name}」：${item.effect}`);
      } else if (item.type === "perk" || item.type === "skill") {
        addEvent(room, "system", `${player.nickname} 购买「${item.name}」：${item.effect}（占位效果）`);
      }

      broadcastRoom(room, []);
      return { ok: true };
    });
  });

  socket.on("leaveRogueliteRoom", (_payload: unknown, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (ensureRoomGameMode(room) !== "pve_roguelite") throw new Error("当前房间不是肉鸽挑战");
      if (room.phase !== "roguelite_shop") throw new Error("当前不在商店阶段");
      const player = room.players.find((p) => p.id === socket.id && !p.isBot);
      if (!player) throw new Error("玩家不存在");
      const roguelite = ensureRogueliteState(room);
      roguelite.stage += 1;
      room.phase = "roguelite_continue";
      const event = addEvent(room, "system", `${player.nickname} 离开，请选择第 ${roguelite.stage} 关路线`);
      broadcastRoom(room, [event]);
      return { ok: true };
    });
  });

  // ── Roguelite rest ──
  socket.on("useRogueliteRestAction", (payload: { actionId?: unknown }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (ensureRoomGameMode(room) !== "pve_roguelite") throw new Error("当前房间不是肉鸽挑战");
      if (room.phase !== "roguelite_rest") throw new Error("当前不在休息阶段");
      const player = room.players.find((p) => p.id === socket.id && !p.isBot);
      if (!player) throw new Error("玩家不存在");
      const roguelite = ensureRogueliteState(room);
      const actionId = typeof payload?.actionId === "string" ? payload.actionId : "";
      const action = ROGUELITE_REST_SITE_ACTIONS.find((a) => a.id === actionId);
      if (!action) throw new Error("休息动作不存在");

      if (actionId === "campfire_heal") {
        const healAmt = Math.floor(player.maxHp * 0.25);
        const healed = Math.min(player.maxHp - player.hp, healAmt);
        if (healed > 0) { player.hp += healed; addEvent(room, "heal", `${player.nickname} 在篝火旁回复 ${healed} 生命`); }
        else { addEvent(room, "system", `${player.nickname} 生命已满，篝火未生效`); }
      } else if (actionId === "weapon_drill") {
        roguelite.nextBattleDamageBonus = (roguelite.nextBattleDamageBonus ?? 0) + 3;
        addEvent(room, "system", `${player.nickname} 磨砺武器，下一场战斗伤害 +3`);
      } else if (actionId === "shield_repair") {
        roguelite.nextBattleShieldBonus = (roguelite.nextBattleShieldBonus ?? 0) + 5;
        addEvent(room, "system", `${player.nickname} 修补护盾，下一场战斗开始获得 5 护盾`);
      } else if (actionId === "blood_meditation") {
        const healAmt = Math.floor(player.maxHp * 0.15);
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        roguelite.nextBattleDamageBonus = (roguelite.nextBattleDamageBonus ?? 0) + 1;
        addEvent(room, "system", `${player.nickname} 血之冥想：回复 ${healAmt} 生命，下场伤害 +1`);
      } else if (actionId === "dice_prayer") {
        addEvent(room, "system", `${player.nickname} 向骰子祈祷——命运筹码 +2（占位效果）`);
      } else if (actionId === "sharpen_first_hit") {
        addEvent(room, "system", `${player.nickname} 磨利首击——下一场战斗首次攻击伤害 +4（占位效果）`);
      } else if (actionId === "reinforce_armor") {
        addEvent(room, "system", `${player.nickname} 强化护甲——本局获得 1 层护甲（占位效果）`);
      } else {
        addEvent(room, "system", `${player.nickname} 执行「${action.name}」——${action.effect}（占位效果）`);
      }

      // Rest actions consume the rest site
      roguelite.stage += 1;
      room.phase = "roguelite_continue";
      const event = addEvent(room, "system", `${player.nickname} 休息完毕，请选择第 ${roguelite.stage} 关路线`);
      broadcastRoom(room, [event]);
      return { ok: true };
    });
  });

  socket.on("sendEmote", (payload: { emoteId?: unknown } | undefined, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      const clientId = socketToClient.get(socket.id);
      const player = findRoomParticipantForSocket(room, socket.id, clientId);
      if (!player) throw new Error("玩家不在该房间中");
      const emoteId = payload?.emoteId;
      if (!isEmoteId(emoteId)) throw new Error("无效的表情");

      const now = Date.now();
      const emotePlayerId = ensureRoomGameMode(room) === "duo_2v2" ? player.controllerId ?? socket.id : player.id;
      const cooldownKey = `${room.id}:${emotePlayerId}`;
      const lastSentAt = emoteCooldowns.get(cooldownKey) ?? 0;
      if (now - lastSentAt < EMOTE_COOLDOWN_MS) return { ok: true, ignored: true };

      emoteCooldowns.set(cooldownKey, now);
      const event: PlayerEmoteEvent = {
        roomId: room.id,
        playerId: emotePlayerId,
        emoteId,
        createdAt: now
      };
      emitEmoteToRoomPeers(room.id, socket.id, event);
      return { ok: true };
    });
  });

  socket.on("disconnect", () => {
    markPlayerOffline(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Career War server listening on port ${PORT}`);
});

setInterval(() => {
  if (cleanupExpiredEmptyRooms()) {
    broadcastRoomList();
  }
}, ROOM_CLEANUP_INTERVAL_MS);

type Ack = (response: { ok: true; [key: string]: unknown } | { ok: false; error: string }) => void;

const serverContext = {
  now: () => Date.now(),
  makeId: () => crypto.randomUUID(),
  rollDice: () => Math.floor(Math.random() * 6) + 1
};

function handle(socketId: string, reply: Ack | undefined, fn: () => Record<string, unknown>): void {
  try {
    const result = fn();
    reply?.({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    io.to(socketId).emit("errorMessage", message);
    reply?.({ ok: false, error: message });
  }
}

// --- ServerContext (assembled from existing globals; used by new modules) ---
const _allowedEmoteIds = new Set<string>(EMOTE_IDS);
const ctx: ServerContext = { rooms, socketToRoom, socketToClient, emoteCooldowns, botTurnTimers, allowedEmoteIds: _allowedEmoteIds, io, now: serverContext.now, makeId: serverContext.makeId, rollDice: serverContext.rollDice };

// Thin wrappers: delegate to new module functions, closing over ctx.
// Prefix _ avoids shadowing existing function declarations while migrating.
const _addEvent = (room: Room, type: GameEvent["type"], msg: string) => rm.addEvent(room, type, msg);
const _getRoom = (roomId: string) => rm.getRoom(roomId, ctx);
const _emitRoomToParticipants = (room: Room) => rm.emitRoomToParticipants(room, ctx);
const _broadcastRoomList = () => rm.broadcastRoomList(ctx);
const _broadcastRoom = (room: Room, events: GameEvent[]) => rm.broadcastRoom(room, events, ctx);
const _getPublicRoomList = () => rm.getPublicRoomList(ctx);
const _cleanupExpiredEmptyRooms = (now?: number) => rm.cleanupExpiredEmptyRooms(ctx, now);
const _handleRogueliteBattleEnd = (room: Room, go: { winnerId: string; winnerName: string }) => rs.handleRogueliteBattleEnd(room, go, ctx);
const _emitEmoteToRoomPeers = (roomId: string, senderSocketId: string, event: PlayerEmoteEvent) => rm.emitEmoteToRoomPeers(roomId, senderSocketId, event, ctx);
const _bindSocketToRoom = (sid: string, cid: string, rid: string) => rm.bindSocketToRoom(sid, cid, rid, ctx);
const _removePlayerFromRoom = (sid: string) => rm.removePlayerFromRoom(sid, ctx);
const _removeClientFromRooms = (cid: string) => rm.removeClientFromRooms(cid, ctx);
const _markPlayerOffline = (sid: string) => rm.markPlayerOffline(sid, ctx);
const _deleteRoomAndUnbindSockets = (rid: string) => rm.deleteRoomAndUnbindSockets(rid, ctx);
const _rebindPlayerReferences = (room: Room, prev: string, next: string) => rm.rebindPlayerReferences(room, prev, next);
const _rebindDuoControllerReferences = (room: Room, prev: string, next: string, cid: string, uid?: string) => rm.rebindDuoControllerReferences(room, prev, next, cid, uid);
const _getSocketRoom = (sid: string) => rm.getSocketRoom(sid, ctx);
const _ensureRoomGameMode = (room: Room) => rm.ensureRoomGameMode(room);
const _ensureRoomSettings = (room: Room) => rm.ensureRoomSettings(room);
const _isSinglePlayerPveMode = (room: Room) => rm.isSinglePlayerPveMode(room);

const broadcastRoom = _broadcastRoom;

const emitRoomToParticipants = _emitRoomToParticipants;

const broadcastRoomList = _broadcastRoomList;

const emitEmoteToRoomPeers = _emitEmoteToRoomPeers;

function scheduleBotTurnIfNeeded(room: Room): void {
  if (!isSinglePlayerPveMode(room) || room.phase !== "battle") return;
  const activePlayer = room.players[room.activePlayerIndex];
  if (!activePlayer?.isBot) return;
  if (botTurnTimers.has(room.id)) return;

  const delayMs = 800 + Math.floor(Math.random() * 401);
  const timer = setTimeout(() => {
    botTurnTimers.delete(room.id);
    const currentRoom = rooms.get(room.id);
    if (!currentRoom) return;
    try {
      runBotTurn(currentRoom);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 行动失败";
      addEvent(currentRoom, "system", `AI 行动失败：${message}`);
      emitRoomToParticipants(currentRoom);
    }
  }, delayMs);
  botTurnTimers.set(room.id, timer);
}

function runBotTurn(room: Room): void {
  if (!isSinglePlayerPveMode(room) || room.phase !== "battle") return;
  const bot = room.players[room.activePlayerIndex];
  if (!bot?.isBot || bot.isDead) return;
  const target = room.players.find((player) => !player.isBot && !player.isDead);
  if (!target) return;

  bot.selectedTargetId = target.id;
  const rollResult = rollForActivePlayer(room, bot.id, serverContext);
  broadcastRoom(room, rollResult.events);
  if (emitGameOverIfNeeded(room, rollResult)) return;

  const decision = room.pendingRollDecision;
  if (!decision || decision.actorId !== bot.id) {
    scheduleBotTurnIfNeeded(room);
    return;
  }

  const characterSkillAction = decision.availableActions?.find((action) => action.id === "character_skill" && action.enabled && !action.requiresSelfDamageAmount);
  const choice: RollDecisionChoice = characterSkillAction ? "character_skill" : "normal_attack";
  const confirmResult = confirmRollDecision(room, bot.id, decision.id, choice, serverContext);
  broadcastRoom(room, confirmResult.events);
  if (emitGameOverIfNeeded(room, confirmResult)) return;
  scheduleBotTurnIfNeeded(room);
}

function emitGameOverIfNeeded(room: Room, result: { gameOver?: { winnerId: string; winnerName: string } }): boolean {
  if (!result.gameOver) return false;
  if (_handleRogueliteBattleEnd(room, result.gameOver)) return true;
  io.to(room.id).emit("gameOver", result.gameOver);
  return true;
}

const handleRogueliteBattleEnd = _handleRogueliteBattleEnd;

function ensureRogueliteState(room: Room): NonNullable<Room["roguelite"]> {
  room.roguelite ??= { stage: 1, maxStage: ROGUELITE_MAX_STAGE, appliedRewards: [] };
  room.roguelite.maxStage = room.roguelite.maxStage || ROGUELITE_MAX_STAGE;
  room.roguelite.appliedRewards ??= [];
  room.roguelite.mapRoute ??= {};
  room.roguelite.consumedMapNodeIds ??= [];
  room.roguelite.runGold ??= 0;
  room.roguelite.nextBattleShieldBonus ??= 0;
  room.roguelite.nextBattleDamageBonus ??= 0;
  room.roguelite.battleRound ??= 1;
  room.roguelite.fatigueBonus ??= 0;
  room.roguelite.fatigueAnnouncedBonus ??= 0;
  return room.roguelite;
}

function getRogueliteBattleGoldReward(stage: number, stageType: "normal" | "elite" | "boss"): number {
  const cycle = Math.floor((stage - 1) / 15);
  if (stageType === "boss") return 60 + cycle * 12;
  if (stageType === "elite") return 35 + cycle * 7;
  return 18 + cycle * 4;
}

type RogueliteEventChoiceDraft = RogueliteEventDraft["choices"][number];

function startRogueliteEventRoom(room: Room, player: Room["players"][number], roguelite: NonNullable<Room["roguelite"]>, mapNode: RogueliteMapNodeSelection): void {
  rememberRogueliteMapNode(roguelite, mapNode);
  consumeRogueliteMapNode(roguelite, mapNode);
  const pendingEvent = toPendingRogueliteEvent(pickRogueliteEventForStage(mapNode.stage));
  roguelite.currentMapNode = mapNode;
  roguelite.pendingEvent = pendingEvent;
  roguelite.rewardChoices = undefined;
  room.phase = "roguelite_event";
  addEvent(room, "system", `${player.nickname} 遇到问号事件：${pendingEvent.name}`);
}

function pickRogueliteEventForStage(stage: number): RogueliteEventDraft {
  const stageBand = getRogueliteEventStageBand(stage);
  const events = getRogueliteEvents();
  const candidates = events.filter((event) => event.stage === "any" || event.stage === stageBand);
  const event = pickOne(candidates) ?? events[0];
  if (!event) throw new Error("肉鸽事件配置为空");
  return event;
}

function getRogueliteEventStageBand(stage: number): "early" | "mid" | "late" {
  if (stage <= 3) return "early";
  if (stage <= 9) return "mid";
  return "late";
}

function toPendingRogueliteEvent(event: RogueliteEventDraft): NonNullable<NonNullable<Room["roguelite"]>["pendingEvent"]> {
  return {
    id: event.id,
    name: event.name,
    rarity: event.rarity,
    stage: event.stage,
    description: event.description,
    choices: event.choices.slice(0, 2).map((choice, index) => ({
      id: index === 0 ? "a" : "b",
      label: choice.label,
      effect: choice.effect,
      cost: choice.cost
    }))
  };
}

function applyRogueliteEventChoice(room: Room, player: Room["players"][number], eventDraft: RogueliteEventDraft, choiceDraft: RogueliteEventChoiceDraft): { opensRewardChoice: boolean; playerDied: boolean } {
  let opensRewardChoice = false;
  let playerDied = false;
  const outcomes = [...(choiceDraft.effects ?? []), ...(choiceDraft.costs ?? [])];
  if (outcomes.length === 0) {
    addEvent(room, "system", `事件「${eventDraft.name}」的选项暂未配置可执行效果，已安全跳过`);
  }

  for (const outcome of outcomes) {
    const applied = applyRogueliteEventOutcome(room, player, outcome);
    opensRewardChoice ||= applied.opensRewardChoice;
    playerDied ||= applied.playerDied;
    if (playerDied) break;
  }

  return { opensRewardChoice, playerDied };
}

function applyRogueliteEventOutcome(room: Room, player: Room["players"][number], outcome: RogueliteEventOutcomeDraft): { opensRewardChoice: boolean; playerDied: boolean } {
  const roguelite = ensureRogueliteState(room);
  const value = Math.max(0, Math.floor(outcome.value ?? 0));

  if (outcome.type === "heal") {
    const healed = Math.min(player.maxHp - player.hp, value);
    if (healed > 0) {
      player.hp += healed;
      const event = addEvent(room, "heal", `${player.nickname} 通过事件回复 ${healed} 点生命`);
      event.playerId = player.id;
      event.healing = healed;
    }
    return { opensRewardChoice: false, playerDied: false };
  }

  if (outcome.type === "lose_hp") {
    const lost = Math.min(Math.max(0, player.hp), value);
    if (lost > 0) {
      player.hp -= lost;
      const event = addEvent(room, "damage", `${player.nickname} 通过事件失去 ${lost} 点生命`);
      event.targetId = player.id;
      event.damage = lost;
      if (player.hp <= 0) {
        player.hp = 0;
        player.isDead = true;
      }
    }
    return { opensRewardChoice: false, playerDied: player.isDead };
  }

  if (outcome.type === "gain_gold") {
    roguelite.runGold = (roguelite.runGold ?? 0) + value;
    addEvent(room, "system", `${player.nickname} 获得 ${value} 金币，当前金币 ${roguelite.runGold}`);
    return { opensRewardChoice: false, playerDied: false };
  }

  if (outcome.type === "lose_gold") {
    const currentGold = roguelite.runGold ?? 0;
    const lost = Math.min(currentGold, value);
    roguelite.runGold = currentGold - lost;
    addEvent(room, "system", `${player.nickname} 失去 ${lost} 金币，当前金币 ${roguelite.runGold}`);
    return { opensRewardChoice: false, playerDied: false };
  }

  if (outcome.type === "gain_start_shield_next_battle") {
    roguelite.nextBattleShieldBonus = (roguelite.nextBattleShieldBonus ?? 0) + value;
    addEvent(room, "system", `${player.nickname} 下一场战斗开始获得 ${value} 护盾`);
    return { opensRewardChoice: false, playerDied: false };
  }

  if (outcome.type === "gain_start_damage_next_battle") {
    roguelite.nextBattleDamageBonus = (roguelite.nextBattleDamageBonus ?? 0) + value;
    addEvent(room, "system", `${player.nickname} 下一场战斗开始获得 ${value} 伤害加成`);
    return { opensRewardChoice: false, playerDied: false };
  }

  if (outcome.type === "reward_choice") {
    if (outcome.rewardPool && outcome.rewardPool !== "growth") {
      addEvent(room, "system", outcome.note ?? "TODO: 非基础成长奖励池暂未接入，本次降级为基础成长池");
    }
    return { opensRewardChoice: true, playerDied: false };
  }

  if (outcome.type === "start_battle") {
    resetRogueliteBattleState(room, player);
    ensurePveBot(room);
    const bot = room.players.find((p) => p.isBot);
    const enemyLabel = outcome.enemyId ?? (bot?.nickname ?? "敌人");
    room.activePlayerIndex = room.players.findIndex((p) => !p.isBot);
    addEvent(room, "system", `${player.nickname} 被卷入战斗！对手：${enemyLabel}`);
    return { opensRewardChoice: false, playerDied: false };
  }

  if (outcome.type === "todo") {
    addEvent(room, "system", outcome.note ?? "TODO: 该事件效果暂未接入，已安全跳过");
    return { opensRewardChoice: false, playerDied: false };
  }

  return { opensRewardChoice: false, playerDied: false };
}

function getRogueliteRewardRhythm(stageKey: string): (typeof ROGUELITE_REWARD_RHYTHM)[number] | undefined {
  return ROGUELITE_REWARD_RHYTHM.find((item) => item.stage === stageKey);
}

const ROGUELITE_BASIC_REWARD_STAGE = Number(getRogueliteRewardRhythm("1")?.stage ?? 1);
const ROGUELITE_ARCHETYPE_REWARD_STAGE = Number(getRogueliteRewardRhythm("2")?.stage ?? 2);
const ROGUELITE_CORE_REWARD_STAGE = Number(getRogueliteRewardRhythm("3")?.stage ?? 3);
const ROGUELITE_BOSS_REWARD_STAGE = ROGUELITE_BALANCE_MECHANICS.bossAbilityRewardStage;
const ROGUELITE_TAG_BIAS_STAGE_RANGE = (getRogueliteRewardRhythm("4-6")?.stage ?? "4-6")
  .split("-")
  .map((value) => Number(value));
const ROGUELITE_TAG_BIAS_STAGE_START = ROGUELITE_TAG_BIAS_STAGE_RANGE[0] ?? 4;
const ROGUELITE_TAG_BIAS_STAGE_END = ROGUELITE_TAG_BIAS_STAGE_RANGE[1] ?? ROGUELITE_TAG_BIAS_STAGE_START;
const BASIC_REWARD_TYPES: ReadonlyArray<RogueliteReward["type"]> = getRogueliteRewardRhythm("1")?.rewardTypes ?? [];

function resetRogueliteBattleState(room: Room, player: Room["players"][number]): void {
  const roguelite = ensureRogueliteState(room);
  room.phase = "battle";
  room.effects = [];
  room.snapshots = [];
  room.previousFinalDamage = 0;
  room.pendingRoll = undefined;
  room.pendingRollDecision = undefined;
  room.pendingGuardCheck = undefined;
  room.guardCheckCompletedForActorId = undefined;
  room.winnerId = undefined;
  room.winnerTeamId = undefined;
  room.highlight = undefined;
  room.skillHints = undefined;
  roguelite.battleRound = 1;
  roguelite.fatigueBonus = 0;
  roguelite.fatigueAnnouncedBonus = 0;
  player.isDead = false;
  player.isOnline = true;
  player.selectedTargetId = undefined;
  player.guarding = false;
  player.flameMarks = 0;
  player.zhaoZilongHitCount = 0;
  player.summonerSkillId = undefined;
  player.summonerSkillCooldown = 0;
  player.rogueliteSummonerCooldownReduction = 0;

  const nextBattleShieldBonus = roguelite.nextBattleShieldBonus ?? 0;
  player.shield = (player.rogueliteStartShield ?? 0) + nextBattleShieldBonus;
  if (nextBattleShieldBonus > 0) {
    addEvent(room, "system", `事件护盾生效：${player.nickname} 获得 ${nextBattleShieldBonus} 护盾`);
    roguelite.nextBattleShieldBonus = 0;
  }

  const nextBattleDamageBonus = roguelite.nextBattleDamageBonus ?? 0;
  if (nextBattleDamageBonus > 0) {
    player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + nextBattleDamageBonus;
    addEvent(room, "system", `事件伤害生效：${player.nickname} 获得 ${nextBattleDamageBonus} 伤害加成`);
    roguelite.nextBattleDamageBonus = 0;
  }

  // Reset per-stage abilities.
  player.rogueliteShieldOverloadUsed = false;
  player.rogueliteLowRollCharge = 0;
  player.rogueliteConsecutiveLowRolls = 0;
}
const ARCHETYPE_STARTER_TYPES: ReadonlyArray<RogueliteReward["type"]> = getRogueliteRewardRhythm("2")?.rewardTypes ?? [];
const CORE_REWARD_TYPES: ReadonlyArray<RogueliteReward["type"]> = getRogueliteRewardRhythm("3")?.rewardTypes ?? [];

function createRogueliteRewardChoices(currentStacks?: Record<string, number>, appliedRewards: readonly RogueliteReward[] = [], stage = 1): RogueliteReward[] {
  const rewardPools = getRogueliteRewardPools();
  const pool = getAvailableRogueliteDrafts([...rewardPools.characterSkill, ...rewardPools.growth], currentStacks);
  const choices: RogueliteReward[] = [];
  const preferredTags = stage >= ROGUELITE_TAG_BIAS_STAGE_START && stage <= ROGUELITE_TAG_BIAS_STAGE_END ? getPreferredRogueliteTags(appliedRewards) : [];
  for (const tag of preferredTags.slice(0, 2)) {
    const taggedIndex = pool.findIndex((draft) => draft.tag === tag);
    if (taggedIndex < 0) continue;
    const [draft] = pool.splice(taggedIndex, 1);
    if (draft) choices.push({ ...draft, id: crypto.randomUUID() });
  }
  while (choices.length < 3 && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const [draft] = pool.splice(index, 1);
    if (!draft) continue;
    choices.push({ ...draft, id: crypto.randomUUID() });
  }
  return choices;
}

function isBossRewardType(type: string): boolean {
  return type === "berserker_blood" || type === "vampire_instinct" || type === "dragon_courage";
}

function isRogueliteSkillRewardType(type: string): boolean {
  return type === "gunner_triple_shot" || type === "vampire_skill" || type === "zhaoyun_pierce" || type === "flame_lord_mark";
}

function createRogueliteBossRewardChoices(): RogueliteReward[] {
  return getRogueliteRewardPools().bossAbility.map((draft) => ({ ...draft, id: crypto.randomUUID() }));
}

function createRogueliteBasicRewardChoices(currentStacks?: Record<string, number>): RogueliteReward[] {
  return createRogueliteChoicesFromTypes(BASIC_REWARD_TYPES, currentStacks);
}

function createRogueliteArchetypeStarterChoices(currentStacks?: Record<string, number>): RogueliteReward[] {
  const pool = getAvailableRogueliteDrafts(getRogueliteDraftsByType(ARCHETYPE_STARTER_TYPES), currentStacks);
  const choices: RogueliteReward[] = [];
  const usedTags = new Set<string>();
  while (choices.length < 3 && pool.length > 0) {
    const candidates = pool.filter((draft) => draft.tag && !usedTags.has(draft.tag));
    const draft = removeRandomRogueliteDraft(pool, candidates.length > 0 ? candidates : pool);
    if (!draft) break;
    if (draft.tag) usedTags.add(draft.tag);
    choices.push({ ...draft, id: crypto.randomUUID() });
  }
  return fillRogueliteChoices(choices, pool);
}

function createRogueliteCoreRewardChoices(currentStacks?: Record<string, number>): RogueliteReward[] {
  const choices = createRogueliteChoicesFromTypes(CORE_REWARD_TYPES, currentStacks);
  if (choices.length >= 3) return choices;
  const rewardPools = getRogueliteRewardPools();
  return fillRogueliteChoices(choices, getAvailableRogueliteDrafts([...rewardPools.characterSkill, ...rewardPools.growth], currentStacks));
}

function createRogueliteChoicesFromTypes(types: readonly RogueliteReward["type"][], currentStacks?: Record<string, number>): RogueliteReward[] {
  return fillRogueliteChoices([], getAvailableRogueliteDrafts(getRogueliteDraftsByType(types), currentStacks));
}

function fillRogueliteChoices(choices: RogueliteReward[], pool: RogueliteRewardDraft[]): RogueliteReward[] {
  while (choices.length < 3 && pool.length > 0) {
    const draft = removeRandomRogueliteDraft(pool);
    if (!draft) continue;
    if (choices.some((choice) => choice.type === draft.type)) continue;
    choices.push({ ...draft, id: crypto.randomUUID() });
  }
  return choices;
}

function getRogueliteDraftsByType(types: readonly RogueliteReward["type"][]): RogueliteRewardDraft[] {
  const rewardPools = getRogueliteRewardPools();
  const allDrafts = [...rewardPools.characterSkill, ...rewardPools.growth, ...rewardPools.starter, ...rewardPools.bossAbility];
  return types
    .map((type) => allDrafts.find((draft) => draft.type === type))
    .filter((draft): draft is RogueliteRewardDraft => Boolean(draft));
}

function getAvailableRogueliteDrafts(drafts: readonly RogueliteRewardDraft[], currentStacks?: Record<string, number>): RogueliteRewardDraft[] {
  return drafts.filter((draft) => {
    if (!draft.maxStacks) return true;
    const perkId = REWARD_TO_PERK[draft.type]?.perkId ?? draft.type;
    const current = currentStacks?.[perkId] ?? 0;
    return current < draft.maxStacks;
  });
}

function getPreferredRogueliteTags(appliedRewards: readonly RogueliteReward[]): Array<NonNullable<RogueliteReward["tag"]>> {
  const counts = new Map<NonNullable<RogueliteReward["tag"]>, number>();
  for (const reward of appliedRewards) {
    if (!reward.tag) continue;
    counts.set(reward.tag, (counts.get(reward.tag) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([tag]) => tag);
}

function removeRandomRogueliteDraft(pool: RogueliteRewardDraft[], source: readonly RogueliteRewardDraft[] = pool): RogueliteRewardDraft | undefined {
  if (source.length === 0) return undefined;
  const selected = source[Math.floor(Math.random() * source.length)];
  const index = pool.findIndex((draft) => draft.type === selected?.type);
  if (index < 0) return undefined;
  const [draft] = pool.splice(index, 1);
  return draft;
}

function pickOne<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

function applyRogueliteReward(player: Room["players"][number], reward: RogueliteReward): void {
  // Increment perk stacks
  const mapping = REWARD_TO_PERK[reward.type];
  if (mapping) {
    player.roguelitePerkStacks ??= {};
    player.roguelitePerkStacks[mapping.perkId] = (player.roguelitePerkStacks[mapping.perkId] ?? 0) + mapping.levels;
  }

  if (isRogueliteSkillRewardType(reward.type)) {
    player.rogueliteSkillStacks ??= {};
    player.rogueliteSkillStacks[reward.type] = (player.rogueliteSkillStacks[reward.type] ?? 0) + 1;
    return;
  }

  // Starter rewards
  if (reward.type === "starter_heavy_punch") {
    player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + 2;
    player.maxHp += 4;
    player.hp = Math.min(player.maxHp, player.hp + 4);
    return;
  }
  if (reward.type === "starter_blood_punch") {
    player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + 1;
    player.roguelitePassiveIds ??= [];
    if (!player.roguelitePassiveIds.includes("starter_blood_punch")) {
      player.roguelitePassiveIds = [...player.roguelitePassiveIds, "starter_blood_punch"];
    }
    return;
  }
  if (reward.type === "starter_iron_wall") {
    player.rogueliteArmorBonus = (player.rogueliteArmorBonus ?? 0) + 1;
    player.maxHp += 6;
    player.hp = Math.min(player.maxHp, player.hp + 6);
    player.rogueliteStartShield = (player.rogueliteStartShield ?? 0) + 3;
    return;
  }
  if (reward.type === "starter_recovery") {
    player.maxHp += 8;
    player.hp = Math.min(player.maxHp, player.hp + 8);
    player.roguelitePostBattleHealBonus = (player.roguelitePostBattleHealBonus ?? 0) + 5;
    return;
  }
  // Growth rewards
  if (reward.type === "heavy_punch_training") {
    player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + 1;
    player.maxHp += 2;
    player.hp = Math.min(player.maxHp, player.hp + 2);
    return;
  }
  if (reward.type === "iron_body") {
    player.rogueliteArmorBonus = (player.rogueliteArmorBonus ?? 0) + 1;
    player.rogueliteStartShield = (player.rogueliteStartShield ?? 0) + 2;
    return;
  }
  if (reward.type === "breathing_recovery") {
    player.maxHp += 3;
    player.hp = Math.min(player.maxHp, player.hp + 3);
    const healAmount = Math.max(8, Math.floor(player.maxHp * reward.value / 100));
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    return;
  }
  if (reward.type === "blood_punch") {
    player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + 1;
    player.roguelitePassiveIds ??= [];
    if (!player.roguelitePassiveIds.includes("blood_punch")) {
      player.roguelitePassiveIds = [...player.roguelitePassiveIds, "blood_punch"];
    }
    return;
  }
  if (reward.type === "battle_instinct") {
    player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + 1;
    player.roguelitePostBattleHealBonus = (player.roguelitePostBattleHealBonus ?? 0) + 2;
    player.maxHp += 2;
    player.hp = Math.min(player.maxHp, player.hp + 2);
    return;
  }
  if (reward.type === "guard_training") {
    player.maxHp += 4;
    player.hp = Math.min(player.maxHp, player.hp + 4);
    player.rogueliteStartShield = (player.rogueliteStartShield ?? 0) + 3;
    return;
  }
  // New perks
  if (reward.type === "vitality_boost") {
    player.maxHp += 6;
    player.hp = Math.min(player.maxHp, player.hp + 4);
    return;
  }
  if (reward.type === "shield_wall") {
    player.shield += 4;
    player.rogueliteStartShield = (player.rogueliteStartShield ?? 0) + 4;
    return;
  }
  if (reward.type === "first_strike") {
    player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + reward.value;
    return;
  }
  if (reward.type === "low_hp_armor") {
    player.rogueliteLowHpArmor = (player.rogueliteLowHpArmor ?? 0) + 2;
    return;
  }
  if (reward.type === "kill_heal") {
    // Perk "战利品": on-kill upgrades a random growth perk (engine handles trigger)
    return;
  }
  if (reward.type === "drink_blood") {
    // Engine hook in finishAction: heal 3 on direct attack HP damage
    return;
  }
  if (reward.type === "comeback") {
    player.rogueliteComebackDamage = (player.rogueliteComebackDamage ?? 0) + reward.value;
    return;
  }
  // ── 护盾流 ──
  if (reward.type === "low_roll_defense") {
    player.rogueliteLowRollDefenseShield = (player.rogueliteLowRollDefenseShield ?? 0) + reward.value;
    return;
  }
  if (reward.type === "shield_strike") {
    player.rogueliteShieldStrikeBonus = (player.rogueliteShieldStrikeBonus ?? 0) + reward.value;
    return;
  }
  if (reward.type === "shield_overload") {
    // Passive flag, engine checks per-stage
    return;
  }
  if (reward.type === "sturdy_bulwark") {
    // Engine checks shield > 0 → armor +1
    return;
  }
  // ── 控骰流 ──
  if (reward.type === "fate_tokens" || reward.type === "low_roll_charge" || reward.type === "desperate_reroll" || reward.type === "lucky_floor") {
    // Engine hooks handle these via perkStacks
    return;
  }
  // Roguelite character skills — stored in both rogueliteSkillStacks and perkStacks
  if (reward.type === "gunner_triple_shot" || reward.type === "vampire_skill" || reward.type === "zhaoyun_pierce" || reward.type === "flame_lord_mark") {
    player.rogueliteSkillStacks ??= {};
    const skillId = reward.type;
    player.rogueliteSkillStacks[skillId] = (player.rogueliteSkillStacks[skillId] ?? 0) + 1;
    // Also populate perkStacks for engine access
    player.roguelitePerkStacks ??= {};
    player.roguelitePerkStacks[skillId] = (player.roguelitePerkStacks[skillId] ?? 0) + 1;
    return;
  }
  if (reward.type === "berserker_blood" || reward.type === "vampire_instinct" || reward.type === "dragon_courage") {
    player.rogueliteBossAbilities ??= [];
    if (!player.rogueliteBossAbilities.includes(reward.type)) {
      player.rogueliteBossAbilities = [...player.rogueliteBossAbilities, reward.type];
    }
    // perkStacks handles stacking above; flat boss abilities list preserved for compatibility
  }
}

function prepareNextRogueliteStage(room: Room, player: Room["players"][number], mapNode?: RogueliteMapNodeSelection): void {
  const roguelite = ensureRogueliteState(room);
  if (mapNode) {
    roguelite.stage = mapNode.stage;
    roguelite.currentMapNode = mapNode;
    rememberRogueliteMapNode(roguelite, mapNode);
    consumeRogueliteMapNode(roguelite, mapNode);
  } else {
    roguelite.currentMapNode = normalizeRogueliteMapNode(undefined, roguelite.stage);
    rememberRogueliteMapNode(roguelite, roguelite.currentMapNode);
    consumeRogueliteMapNode(roguelite, roguelite.currentMapNode);
  }
  resetRogueliteBattleState(room, player);
  ensurePveBot(room);
  const playerIndex = room.players.findIndex((item) => item.id === player.id);
  room.activePlayerIndex = Math.max(0, playerIndex);
  const roomTypeLabel = ROGUELITE_ROOM_TYPES[roguelite.currentMapNode.type].label;
  addEvent(room, "turn", `第 ${roguelite.stage} 关 · ${roomTypeLabel}开始，轮到 ${player.nickname} 行动`);
  trimBattleLog(room);
}

const addEvent = _addEvent;

function serializePublicRoom(room: Room): Room {
  ensureRoomSettings(room);
  ensureRoomGameMode(room);
  ensureDuoSlots(room);
  const publicRoom = serializeRoom(room);
  publicRoom.battleLog = publicRoom.battleLog.slice(0, MAX_BATTLE_LOG);
  publicRoom.snapshots = [];
  return publicRoom;
}

function serializeRoomForViewer(room: Room, viewerSocketId: string, viewerClientId: string | undefined): Room {
  const publicRoom = serializePublicRoom(room);
  if (room.phase !== "lobby") return publicRoom;

  if (ensureRoomGameMode(room) !== "duo_2v2") {
    publicRoom.players = publicRoom.players.map((player) => {
      if (player.id === viewerSocketId || Boolean(viewerClientId && player.clientId === viewerClientId)) {
        return {
          ...player,
          characterSelected: Boolean(player.characterId),
          summonerSkillSelected: Boolean(player.summonerSkillId)
        };
      }

      const sanitized = { ...player };
      delete sanitized.characterId;
      delete sanitized.summonerSkillId;
      return {
        ...sanitized,
        characterSelected: Boolean(player.characterId),
        summonerSkillSelected: Boolean(player.summonerSkillId)
      };
    });
    return publicRoom;
  }

  const viewerControllerId = getViewerDuoControllerId(room, viewerSocketId, viewerClientId);
  publicRoom.duoSlots = publicRoom.duoSlots?.map((slot) => {
    if (slot.controllerId === viewerControllerId) {
      return {
        ...slot,
        characterSelected: Boolean(slot.characterId),
        summonerSkillSelected: Boolean(slot.summonerSkillId)
      };
    }

    const rest = { ...slot };
    delete rest.characterId;
    delete rest.summonerSkillId;
    return {
      ...rest,
      characterSelected: Boolean(slot.characterId),
      summonerSkillSelected: Boolean(slot.summonerSkillId)
    };
  });
  return publicRoom;
}

function getViewerDuoControllerId(room: Room, viewerSocketId: string, viewerClientId: string | undefined): string | undefined {
  const player = room.players.find((item) => item.id === viewerSocketId || item.controllerId === viewerSocketId || Boolean(viewerClientId && item.clientId === viewerClientId));
  return player?.controllerId ?? player?.id;
}

const getPublicRoomList = _getPublicRoomList;

function getRoomParticipantCount(room: Room): number {
  if (isSinglePlayerPveMode(room)) return room.players.filter((player) => !player.isBot).length;
  if (ensureRoomGameMode(room) !== "duo_2v2") return room.players.length;
  return getRoomControllers(room).length;
}

function getRoomMaxPlayers(room: Room): number {
  if (ensureRoomGameMode(room) === "duo_2v2") return DUO_MAX_CONTROLLERS;
  if (isSinglePlayerPveMode(room)) return 1;
  return ensureRoomSettings(room).maxPlayers;
}

function getRoomControllers(room: Room): string[] {
  if (ensureRoomGameMode(room) !== "duo_2v2") return room.players.map((player) => player.id);
  const controllers = new Set<string>();
  for (const player of room.players) {
    controllers.add(player.controllerId ?? player.id);
  }
  return Array.from(controllers);
}

function getRoomHost(room: Room): Room["players"][number] | undefined {
  return room.players.find((player) => player.id === room.hostId || player.controllerId === room.hostId) ?? room.players.find((player) => player.isHost);
}

const ensureRoomSettings = _ensureRoomSettings;

const ensureRoomGameMode = _ensureRoomGameMode;

const isSinglePlayerPveMode = _isSinglePlayerPveMode;

function isSinglePlayerPveGameMode(gameMode: GameMode): boolean {
  return gameMode === "pve_1v1" || gameMode === "pve_roguelite";
}

function ensureDuoSlots(room: Room): void {
  if (ensureRoomGameMode(room) !== "duo_2v2") return;
  if (room.phase !== "lobby") return;

  const activeControllerIds = new Set(room.players.slice(0, DUO_MAX_CONTROLLERS).map((player) => player.id));
  const existingSlots = new Map<string, DuoCharacterSlot>();
  for (const slot of room.duoSlots ?? []) {
    if (activeControllerIds.has(slot.controllerId)) {
      existingSlots.set(duoSlotKey(slot.controllerId, slot.slotIndex), slot);
    }
  }

  const nextSlots: DuoCharacterSlot[] = [];
  for (const [playerIndex, player] of room.players.slice(0, DUO_MAX_CONTROLLERS).entries()) {
    const teamId: TeamId = playerIndex === 0 ? "A" : "B";
    for (const slotIndex of [0, 1] as const) {
      const existing = existingSlots.get(duoSlotKey(player.id, slotIndex));
      nextSlots.push({
        controllerId: player.id,
        teamId,
        slotIndex,
        characterId: existing?.characterId,
        summonerSkillId: existing?.summonerSkillId ?? "lucky_plus_one"
      });
    }
  }

  room.duoSlots = nextSlots;
}

function chooseDuoSlotCharacter(room: Room, controllerId: string, slotIndex: 0 | 1, characterId: CharacterId): void {
  ensureDuoSlots(room);
  const slot = getDuoSlotOrThrow(room, controllerId, slotIndex);
  const settings = ensureRoomSettings(room);
  if (!settings.allowDuplicateCharacters) {
    const takenByOtherSlot = (room.duoSlots ?? []).some(
      (item) => !(item.controllerId === controllerId && item.slotIndex === slotIndex) && item.characterId === characterId
    );
    if (takenByOtherSlot) throw new Error("该职业已被其他 2V2 槽位选择");
  }
  slot.characterId = characterId;
}

function chooseDuoSlotSummonerSkill(room: Room, controllerId: string, slotIndex: 0 | 1, summonerSkillId: SummonerSkillId): void {
  ensureDuoSlots(room);
  const slot = getDuoSlotOrThrow(room, controllerId, slotIndex);
  slot.summonerSkillId = summonerSkillId;
}

function getDuoSlotOrThrow(room: Room, controllerId: string, slotIndex: 0 | 1): DuoCharacterSlot {
  const slot = room.duoSlots?.find((item) => item.controllerId === controllerId && item.slotIndex === slotIndex);
  if (!slot) throw new Error("2V2 槽位不存在");
  return slot;
}

function duoSlotKey(controllerId: string, slotIndex: 0 | 1): string {
  return `${controllerId}:${slotIndex}`;
}

function updateRoomSettings(room: Room, actorId: string, payload: Partial<RoomSettings>): void {
  const currentSettings = ensureRoomSettings(room);
  if (room.hostId !== actorId) throw new Error("只有房主可以修改房间设置");
  if (room.phase !== "lobby") throw new Error("游戏开始后不能修改房间设置");

  const nextSettings: RoomSettings = { ...currentSettings };
  if (payload.maxPlayers !== undefined) {
    if (!Number.isInteger(payload.maxPlayers) || !ROOM_MAX_PLAYERS_OPTIONS.includes(payload.maxPlayers as (typeof ROOM_MAX_PLAYERS_OPTIONS)[number])) {
      throw new Error("最大人数必须在 2 到 8 之间");
    }
    if (payload.maxPlayers < room.players.length) throw new Error("最大人数不能小于当前玩家数");
    nextSettings.maxPlayers = payload.maxPlayers;
  }

  if (payload.allowDuplicateCharacters !== undefined) {
    if (typeof payload.allowDuplicateCharacters !== "boolean") throw new Error("重复职业设置无效");
    nextSettings.allowDuplicateCharacters = payload.allowDuplicateCharacters;
  }

  if (payload.gameMode !== undefined) {
    if (!isGameMode(payload.gameMode)) throw new Error("游戏模式设置无效");
    if (payload.gameMode === "duo_2v2" && room.players.length > DUO_MAX_CONTROLLERS) throw new Error("2V2 模式最多支持 2 名玩家");
    if (isSinglePlayerPveGameMode(payload.gameMode) && room.players.filter((player) => !player.isBot).length > 1) throw new Error("单人 PVE 只支持 1 名真实玩家");
    room.gameMode = payload.gameMode;
    nextSettings.gameMode = payload.gameMode;
    if (payload.gameMode === "duo_2v2") nextSettings.maxPlayers = DUO_MAX_CONTROLLERS;
    if (isSinglePlayerPveGameMode(payload.gameMode)) nextSettings.maxPlayers = 1;
  }

  if (ensureRoomGameMode(room) === "duo_2v2") {
    nextSettings.maxPlayers = DUO_MAX_CONTROLLERS;
  }
  if (isSinglePlayerPveMode(room)) {
    nextSettings.maxPlayers = 1;
  }

  room.settings = nextSettings;
  ensureDuoSlots(room);
}

function validateCharacterChoice(room: Room, actorId: string, characterId: CharacterId): void {
  const settings = ensureRoomSettings(room);
  if (settings.allowDuplicateCharacters) return;
  const takenByOther = room.players.some((player) => player.id !== actorId && player.characterId === characterId);
  if (takenByOther) throw new Error("该职业已被其他玩家选择");
}

function validateStartGame(room: Room): void {
  const settings = ensureRoomSettings(room);
  const participantCount = isSinglePlayerPveMode(room) ? room.players.filter((player) => !player.isBot).length : room.players.length;
  if (participantCount > settings.maxPlayers) throw new Error("当前玩家数超过房间最大人数");
  if (settings.allowDuplicateCharacters) return;

  const selectedCharacters = room.players
    .filter((player) => !isSinglePlayerPveMode(room) || !player.isBot)
    .map((player) => player.characterId)
    .filter((characterId): characterId is CharacterId => Boolean(characterId));
  const uniqueCharacters = new Set(selectedCharacters);
  if (uniqueCharacters.size !== selectedCharacters.length) {
    throw new Error("当前已有重复职业，请玩家重新选择");
  }
}

function validatePveStartGame(room: Room, actorId: string): void {
  if (!isSinglePlayerPveMode(room)) throw new Error("当前房间不是单人 PVE 模式");
  const player = room.players.find((item) => item.id === actorId && !item.isBot);
  if (!player) throw new Error("玩家不存在");

  if (ensureRoomGameMode(room) === "pve_roguelite") {
    player.characterId = ROGUELITE_PLAYER_START.characterId;
    const boxerCharacter = characterList.find((item) => item.id === ROGUELITE_PLAYER_START.characterId);
    if (!boxerCharacter) throw new Error("拳手职业配置不存在");
    player.maxHp = boxerCharacter.maxHp;
    player.hp = boxerCharacter.maxHp;
    player.shield = 0;
    player.summonerSkillId = undefined;
    player.summonerSkillCooldown = 0;
    player.rogueliteSummonerCooldownReduction = 0;
  } else {
    if (!player.characterId) throw new Error("请先选择职业");
    if (!player.summonerSkillId) throw new Error("请先选择召唤师技能");
  }

  const humanPlayers = room.players.filter((item) => !item.isBot);
  if (humanPlayers.length !== 1) throw new Error("单人 PVE 只支持 1 名真实玩家");
}

function ensurePveBot(room: Room): void {
  if (!isSinglePlayerPveMode(room)) return;
  room.players = room.players.filter((player) => !player.isBot);

  const botCharacterId = ensureRoomGameMode(room) === "pve_roguelite" ? ROGUELITE_BOT_BASE.characterId : "boxer";
  const character = characterList.find((item) => item.id === botCharacterId);
  if (!character) throw new Error("AI 职业配置不存在");
  const roguelite = ensureRoomGameMode(room) === "pve_roguelite" ? ensureRogueliteState(room) : undefined;
  const stage = roguelite?.stage ?? 1;
  const mapNode = roguelite?.currentMapNode;
  const forcedRoomType = mapNode && isCombatRogueliteRoomType(mapNode.type) ? mapNode.type : undefined;
  logRogueliteMapNodeSelection(stage, mapNode);

  // Early fixed stages: beginner-friendly difficulty from roguelite balance.
  const earlyStage = getRogueliteEarlyStage(stage);
  if (forcedRoomType === "boss") {
    const bossConfigs = getRogueliteBossConfigMap();
    const bossConfig = mapNode?.bossTemplateId && mapNode.bossTemplateId in bossConfigs
      ? bossConfigs[mapNode.bossTemplateId as RogueliteBossId]
      : getRogueliteBossForStage(stage);
    if (!bossConfig) throw new Error("肉鸽 Boss 配置为空");
    const bonus = forcedRoomType === "boss" ? getRogueliteStageBonus(stage) : { hpBonus: 0, shieldBonus: 0 };
    const bossHp = getRogueliteBossHp(bossConfig, bonus.hpBonus);
    const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, bossConfig.displayName, false);
    bot.isBot = true;
    bot.isOnline = true;
    bot.controllerId = PVE_BOT_ID;
    bot.characterId = bossConfig.baseCharacterId ?? botCharacterId;
    bot.summonerSkillId = "first_aid";
    bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
    bot.maxHp = bossHp;
    bot.hp = bossHp;
    bot.shield = bossConfig.baseShield + bonus.shieldBonus;
    bot.rogueliteBossId = bossConfig.id;
    bot.rogueliteBossState = bossConfig.id === "boss_god_berserker"
      ? { t15: true, t10: true, t5: true, t1: true, dyingAfterAttack: false }
      : bossConfig.id === "boss_gambler_dealer"
      ? { lowHpMode: false }
      : {};
    bot.rogueliteEnemyInfo = { ...getRogueliteEnemyIdentity(bossConfig), stageType: "boss", hpBonus: Math.max(0, bossHp - bossConfig.baseHp), shieldBonus: bonus.shieldBonus, damageBonus: 0, skillNames: bossConfig.skills };
    logRogueliteEnemySpawn(stage, mapNode, bot, bossConfig.enemyTemplateId);
    room.players.push(bot);
    addEvent(room, "system", `Boss 出现：${bossConfig.name}！${bossConfig.skills.join("；")}`);
    return;
  }

  if (
    (!forcedRoomType || forcedRoomType === "normal") &&
    earlyStage &&
    "enemyId" in earlyStage &&
    earlyStage.enemyId &&
    typeof earlyStage.hp === "number" &&
    typeof earlyStage.shield === "number"
  ) {
    const enemyConfig = getRogueliteEnemyConfig(earlyStage.enemyId);
    logRogueliteEnemyTemplateResolution(stage, mapNode, {
      id: enemyConfig.enemyTemplateId,
      displayName: enemyConfig.displayName,
      maxHp: earlyStage.hp,
      shield: earlyStage.shield,
      baseCharacterId: enemyConfig.baseCharacterId
    });
    const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, enemyConfig.displayName, false);
    bot.isBot = true;
    bot.isOnline = true;
    bot.controllerId = PVE_BOT_ID;
    bot.characterId = enemyConfig.baseCharacterId ?? botCharacterId;
    bot.summonerSkillId = "first_aid";
    bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
    applyRogueliteEnemyStats(bot, {
      displayName: enemyConfig.displayName,
      maxHp: earlyStage.hp,
      shield: earlyStage.shield,
      baseCharacterId: enemyConfig.baseCharacterId,
      rogueliteEnemyInfo: {
        ...getRogueliteEnemyIdentity(enemyConfig),
        stageType: enemyConfig.type.startsWith("elite_") ? "elite" : "normal",
        hpBonus: Math.max(0, earlyStage.hp - character.maxHp),
        shieldBonus: earlyStage.shield,
        damageBonus: enemyConfig.damageBonus,
        description: earlyStage.description,
        skillNames: enemyConfig.skills.length > 0 ? enemyConfig.skills : undefined
      }
    });
    logRogueliteEnemySpawn(stage, mapNode, bot, enemyConfig.enemyTemplateId);
    logRogueliteEnemyBattleState("before_engine", bot);
    room.players.push(bot);
    return;
  }

  // Stages 4+: formula-based scaling from roguelite balance.
  const { hpBonus: bonusHp, shieldBonus: bonusShield } = getRogueliteStageBonus(stage);

  if (!forcedRoomType && isRogueliteBossStage(stage)) {
    // Boss stage (6+): use boss config with scaling
    const bossConfig = getRogueliteBossForStage(stage);
    const bossHp = getRogueliteBossHp(bossConfig, bonusHp);
    const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, bossConfig.displayName, false);
    bot.isBot = true;
    bot.isOnline = true;
    bot.controllerId = PVE_BOT_ID;
    bot.characterId = bossConfig.baseCharacterId ?? botCharacterId;
    bot.summonerSkillId = "first_aid";
    bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
    bot.maxHp = bossHp;
    bot.hp = bossHp;
    bot.shield = bossConfig.baseShield + bonusShield;
    bot.rogueliteBossId = bossConfig.id;
    bot.rogueliteBossState = bossConfig.id === "boss_god_berserker"
      ? { t15: true, t10: true, t5: true, t1: true, dyingAfterAttack: false }
      : bossConfig.id === "boss_gambler_dealer"
      ? { lowHpMode: false }
      : {};
    bot.rogueliteEnemyInfo = { ...getRogueliteEnemyIdentity(bossConfig), stageType: "boss", hpBonus: Math.max(0, bossHp - bossConfig.baseHp), shieldBonus: bonusShield, damageBonus: 0, skillNames: bossConfig.skills };
    logRogueliteEnemySpawn(stage, mapNode, bot, bossConfig.enemyTemplateId);
    room.players.push(bot);
    addEvent(room, "system", `Boss 出现：${bossConfig.name}！`);
    return;
  }

  const isElite = forcedRoomType === "elite" || (!forcedRoomType && isRogueliteEliteStage(stage));
  const enemyConfig = getRogueliteEnemyConfigByTemplateId(mapNode?.enemyTemplateId)
    ?? (
      forcedRoomType === "normal"
      ? getRogueliteEnemyConfig("normal")
      : forcedRoomType === "elite"
      ? getRogueliteEnemyConfig("elite_iron_skin")
      : getRogueliteEnemyForStage(stage)
    );

  const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, enemyConfig.displayName, false);
  bot.isBot = true;
  bot.isOnline = true;
  bot.controllerId = PVE_BOT_ID;
  bot.characterId = enemyConfig.baseCharacterId ?? botCharacterId;
  bot.summonerSkillId = "first_aid";
  bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
  bot.maxHp = character.maxHp + bonusHp + enemyConfig.hpBonus;
  bot.hp = character.maxHp + bonusHp + enemyConfig.hpBonus;
  bot.shield = bonusShield + enemyConfig.shieldBonus;
  bot.rogueliteEnemyInfo = { ...getRogueliteEnemyIdentity(enemyConfig), stageType: isElite ? "elite" : "normal", hpBonus: bonusHp, shieldBonus: bonusShield, damageBonus: enemyConfig.damageBonus, skillNames: enemyConfig.skills.length > 0 ? enemyConfig.skills : undefined };
  if (enemyConfig.type !== "normal") {
    bot.rogueliteBossId = enemyConfig.type;
    bot.rogueliteBossState = {};
  }
  logRogueliteEnemySpawn(stage, mapNode, bot, enemyConfig.enemyTemplateId);
  room.players.push(bot);
}

function removePveBotsForLobby(room: Room): void {
  if (!isSinglePlayerPveMode(room)) return;
  room.players = room.players.filter((player) => !player.isBot);
  if (ensureRoomGameMode(room) === "pve_roguelite") {
    room.roguelite = undefined;
    for (const player of room.players) {
      player.rogueliteSummonerCooldownReduction = undefined;
      player.rogueliteSkillStacks = undefined;
      player.rogueliteBossAbilities = undefined;
      player.roguelitePerkStacks = undefined;
      player.rogueliteBossId = undefined;
      player.rogueliteBossState = undefined;
      player.rogueliteStageStartHeal = undefined;
      player.rogueliteDamageBonus = undefined;
      player.rogueliteArmorBonus = undefined;
      player.rogueliteStartShield = undefined;
      player.roguelitePostBattleHealBonus = undefined;
      player.roguelitePassiveIds = undefined;
      player.rogueliteFirstStrikeUsed = undefined;
      player.rogueliteLowHpArmor = undefined;
      player.rogueliteKillHeal = undefined;
      player.rogueliteComebackDamage = undefined;
      player.rogueliteFateTokens = undefined;
      player.rogueliteLowRollCharge = undefined;
      player.rogueliteConsecutiveLowRolls = undefined;
      player.rogueliteShieldOverloadUsed = undefined;
      player.rogueliteShieldStrikeBonus = undefined;
      player.rogueliteLowRollDefenseShield = undefined;
      player.summonerSkillId = undefined;
      player.summonerSkillCooldown = 0;
    }
  }
  const host = room.players[0];
  if (host) {
    room.hostId = host.id;
    host.isHost = true;
  }
}

function validateDuoStartGame(room: Room): DuoCharacterSlot[] {
  if (ensureRoomGameMode(room) !== "duo_2v2") throw new Error("当前房间不是 2V2 模式");
  if (room.players.length !== DUO_MAX_CONTROLLERS) throw new Error("2V2 需要 2 名玩家");

  ensureDuoSlots(room);
  const slots = room.duoSlots ?? [];
  const aSlots = slots.filter((slot) => slot.teamId === "A");
  const bSlots = slots.filter((slot) => slot.teamId === "B");
  if (aSlots.length !== 2 || bSlots.length !== 2) throw new Error("请完成 4 个角色槽位选择");
  if (slots.length !== 4 || slots.some((slot) => !slot.characterId)) throw new Error("请完成 4 个角色槽位选择");
  if (slots.some((slot) => !slot.summonerSkillId)) throw new Error("请为所有角色选择召唤师技能");

  const settings = ensureRoomSettings(room);
  if (!settings.allowDuplicateCharacters) {
    const selectedCharacters = slots.map((slot) => slot.characterId).filter((characterId): characterId is CharacterId => Boolean(characterId));
    const uniqueCharacters = new Set(selectedCharacters);
    if (uniqueCharacters.size !== selectedCharacters.length) throw new Error("当前设置不允许重复职业");
  }

  return slots;
}

function startDuoGameV0(room: Room): GameEvent[] {
  const slots = validateDuoStartGame(room);
  const controllers = [...room.players];
  const controllerById = new Map(controllers.map((player) => [player.id, player]));
  const sortedSlots = [...slots].sort((left, right) => left.teamId.localeCompare(right.teamId) || left.slotIndex - right.slotIndex);
  const aControllerId = sortedSlots.find((slot) => slot.teamId === "A")?.controllerId;
  const bControllerId = sortedSlots.find((slot) => slot.teamId === "B")?.controllerId;
  if (!aControllerId || !bControllerId) throw new Error("2V2 队伍信息不完整");

  room.phase = "battle";
  room.activePlayerIndex = 0;
  room.effects = [];
  room.snapshots = [];
  room.previousFinalDamage = 0;
  room.pendingRoll = undefined;
  room.pendingRollDecision = undefined;
  room.pendingGuardCheck = undefined;
  room.guardCheckCompletedForActorId = undefined;
  room.rematchReadyPlayerIds = [];
  room.winnerId = undefined;
  room.winnerTeamId = undefined;
  room.highlight = undefined;
  room.skillHints = undefined;
  const controllerTurnOrder = [aControllerId, bControllerId];
  if (Math.floor(Math.random() * controllerTurnOrder.length) === 1) {
    controllerTurnOrder.reverse();
  }
  room.controllerTurnOrder = controllerTurnOrder;
  room.activeControllerId = controllerTurnOrder[0];
  room.selectedActorId = undefined;

  room.players = sortedSlots.map((slot) => {
    const controller = controllerById.get(slot.controllerId);
    const character = characterList.find((item) => item.id === slot.characterId);
    if (!controller || !character || !slot.characterId || !slot.summonerSkillId) throw new Error("2V2 战斗单位初始化失败");

    return {
      id: `${slot.controllerId}-slot-${slot.slotIndex}`,
      clientId: controller.clientId,
      controllerId: slot.controllerId,
      teamId: slot.teamId,
      slotIndex: slot.slotIndex,
      nickname: `${controller.nickname} 角色${slot.slotIndex + 1}`,
      isHost: controller.isHost,
      isOnline: controller.isOnline,
      characterId: slot.characterId,
      summonerSkillId: slot.summonerSkillId,
      summonerSkillCooldown: getSummonerSkillInitialCooldown(slot.summonerSkillId),
      hp: slot.characterId === "crescent_moon" ? 3 : character.maxHp,
      maxHp: character.maxHp,
      shield: 0,
      zhaoZilongHitCount: 0,
      flameMarks: 0,
      guarding: false,
      isDead: false,
      selectedTargetId: undefined
    };
  });

  const activeController = controllerById.get(room.activeControllerId);
  const activeTeamId = sortedSlots.find((slot) => slot.controllerId === room.activeControllerId)?.teamId;
  const activeTeamName = activeTeamId === "B" ? "B 队" : "A 队";
  const events = [
    addEvent(room, "startGame", "2V2 V0 开始：已生成 4 个战斗单位"),
    addEvent(room, "turn", `随机先手：${activeTeamName}`),
    addEvent(room, "turn", `轮到 ${activeController?.nickname ?? "A 队玩家"} 选择行动角色`)
  ];
  return events;
}

function mapRoomPhase(phase: Room["phase"]): RoomListStatus {
  if (phase === "lobby") return "waiting";
  if (phase === "battle" || phase === "reward" || phase === "roguelite_event" || phase === "roguelite_shop" || phase === "roguelite_rest" || phase === "roguelite_continue") return "playing";
  return "ended";
}

function trimBattleLog(room: Room): void {
  if (room.battleLog.length > MAX_BATTLE_LOG) {
    room.battleLog.length = MAX_BATTLE_LOG;
  }
}

const getSocketRoom = _getSocketRoom;

const getRoom = _getRoom;

function findReconnectPlayer(room: Room, playerId: string | undefined, clientId: string, userId: string | undefined): Room["players"][number] | undefined {
  const players = room.players.filter((player) => !player.isBot);
  if (playerId) {
    const byPlayerId = players.find((player) => player.id === playerId || player.controllerId === playerId);
    if (byPlayerId) return byPlayerId;
  }

  const byClientId = players.find((player) => player.clientId === clientId);
  if (byClientId) return byClientId;

  if (userId) {
    return players.find((player) => player.userId === userId);
  }

  return undefined;
}

function dedupeRoomPlayersForIdentity(room: Room, keptPlayerId: string, clientId: string, userId: string | undefined): void {
  if (ensureRoomGameMode(room) === "duo_2v2" && room.phase !== "lobby") return;

  const removedIds = new Set<string>();
  room.players = room.players.filter((player) => {
    if (player.id === keptPlayerId || player.isBot) return true;
    const duplicated = player.clientId === clientId || Boolean(userId && player.userId === userId);
    if (duplicated) removedIds.add(player.id);
    return !duplicated;
  });

  if (removedIds.size === 0) return;

  room.rematchReadyPlayerIds = room.rematchReadyPlayerIds.filter((playerId) => !removedIds.has(playerId));
  room.duoSlots = room.duoSlots?.filter((slot) => !removedIds.has(slot.controllerId));
  if (removedIds.has(room.hostId)) {
    room.hostId = room.players[0]?.id ?? room.hostId;
  }
  if (room.activePlayerIndex >= room.players.length) {
    room.activePlayerIndex = 0;
  }
  for (const player of room.players) {
    player.isHost = player.id === room.hostId;
  }
}

function findRoomParticipantForSocket(room: Room, socketId: string, clientId: string | undefined): Room["players"][number] | undefined {
  if (ensureRoomGameMode(room) === "duo_2v2") {
    return room.players.find((player) => player.controllerId === socketId || Boolean(clientId && player.clientId === clientId));
  }
  return room.players.find((player) => player.id === socketId || Boolean(clientId && player.clientId === clientId));
}

function getRematchPlayerIdForSocket(room: Room, socketId: string, clientId: string | undefined): string {
  if (ensureRoomGameMode(room) !== "duo_2v2") {
    const player = findRoomParticipantForSocket(room, socketId, clientId);
    if (!player) throw new Error("玩家不在该房间中");
    return player.id;
  }

  const participant = findRoomParticipantForSocket(room, socketId, clientId);
  const controllerId = participant?.controllerId ?? (room.controllerTurnOrder?.includes(socketId) ? socketId : undefined);
  if (!controllerId) throw new Error("玩家不在该房间中");
  return controllerId;
}

function getRematchRequiredPlayerIds(room: Room): string[] {
  if (isSinglePlayerPveMode(room)) return room.players.filter((player) => !player.isBot).map((player) => player.id);
  if (ensureRoomGameMode(room) !== "duo_2v2") return room.players.map((player) => player.id);
  const orderedControllers = (room.controllerTurnOrder ?? []).filter((controllerId) => getRoomControllers(room).includes(controllerId));
  return orderedControllers.length > 0 ? orderedControllers : getRoomControllers(room);
}

function isEmoteId(value: unknown): value is EmoteId {
  return typeof value === "string" && allowedEmoteIds.has(value);
}

function isSummonerSkillId(value: unknown): value is SummonerSkillId {
  return value === "lucky_plus_one" || value === "first_aid" || value === "iron_wall" || value === "fate_reroll" || value === "last_stand";
}

function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && characterList.some((character) => character.id === value);
}

function isRollDecisionChoice(value: unknown): value is RollDecisionChoice {
  return value === "normal_attack" || value === "settle" || value === "character_skill" || value === "summoner_skill" || value === "roguelite_skill";
}

function isGameMode(value: unknown): value is GameMode {
  return value === "classic" || value === "duo_2v2" || value === "pve_1v1" || value === "pve_roguelite";
}

const bindSocketToRoom = _bindSocketToRoom;

const removePlayerFromRoom = _removePlayerFromRoom;

function removeClientFromRooms(clientId: string): void {
  let changed = false;

  for (const room of Array.from(rooms.values())) {
    const leaving = room.players.find((player) => player.clientId === clientId);
    if (!leaving) continue;

    changed = true;
    unbindClientSocketsFromRoom(clientId, room.id);
    if (shouldUseDuoControllerLeave(room)) {
      const controllerId = leaving.controllerId ?? room.controllerTurnOrder?.find((id) => id === leaving.id);
      if (!controllerId) continue;
      const nickname = getDuoControllerDisplayName(room, controllerId);
      removeDuoControllerFromRoom(room, controllerId);
      if (shouldCleanupDuoRoom(room)) {
        deleteRoomAndUnbindSockets(room.id);
        continue;
      }
      const event = addEvent(room, "system", `${nickname} 离开了房间`);
      refreshRoomEmptySince(room);
      broadcastRoom(room, [event]);
      continue;
    }

    room.players = room.players.filter((player) => player.clientId !== clientId);
    room.rematchReadyPlayerIds = room.rematchReadyPlayerIds.filter((playerId) => playerId !== leaving.id);
    room.duoSlots = room.duoSlots?.filter((slot) => slot.controllerId !== leaving.id);

    if (room.players.length === 0) {
      rooms.delete(room.id);
      continue;
    }

    if (room.hostId === leaving.id) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }

    if (room.activePlayerIndex >= room.players.length) {
      room.activePlayerIndex = 0;
    }
    ensureDuoSlots(room);

    const event = addEvent(room, "system", `${leaving.nickname} 离开了房间`);
    refreshRoomEmptySince(room);
    broadcastRoom(room, [event]);
  }

  if (changed) broadcastRoomList();
}

function unbindClientSocketsFromRoom(clientId: string, roomId: string): void {
  for (const [socketId, mappedClientId] of Array.from(socketToClient.entries())) {
    if (mappedClientId !== clientId || socketToRoom.get(socketId) !== roomId) continue;
    const socket = io.sockets.sockets.get(socketId);
    socket?.leave(roomId);
    socketToRoom.delete(socketId);
    socketToClient.delete(socketId);
  }
}

function deleteRoomAndUnbindSockets(roomId: string): void {
  const botTimer = botTurnTimers.get(roomId);
  if (botTimer) {
    clearTimeout(botTimer);
    botTurnTimers.delete(roomId);
  }
  for (const [socketId, mappedRoomId] of Array.from(socketToRoom.entries())) {
    if (mappedRoomId !== roomId) continue;
    const socket = io.sockets.sockets.get(socketId);
    socket?.leave(roomId);
    socketToRoom.delete(socketId);
    socketToClient.delete(socketId);
  }
  rooms.delete(roomId);
}

function shouldUseDuoControllerLeave(room: Room): boolean {
  return ensureRoomGameMode(room) === "duo_2v2" && room.phase !== "lobby";
}

function shouldCleanupDuoRoom(room: Room): boolean {
  return shouldUseDuoControllerLeave(room) && getRoomControllers(room).length < DUO_MAX_CONTROLLERS;
}

function removeDuoControllerFromRoom(room: Room, controllerId: string): void {
  const removedCombatantIds = new Set(room.players.filter((player) => player.controllerId === controllerId || player.id === controllerId).map((player) => player.id));
  room.players = room.players.filter((player) => player.controllerId !== controllerId && player.id !== controllerId);
  room.duoSlots = room.duoSlots?.filter((slot) => slot.controllerId !== controllerId);
  room.controllerTurnOrder = room.controllerTurnOrder?.filter((id) => id !== controllerId);
  room.rematchReadyPlayerIds = room.rematchReadyPlayerIds.filter((id) => id !== controllerId && !removedCombatantIds.has(id));

  if (room.activeControllerId === controllerId) {
    room.activeControllerId = room.controllerTurnOrder?.[0];
  }
  if (room.selectedActorId && removedCombatantIds.has(room.selectedActorId)) {
    room.selectedActorId = undefined;
  }
  if (room.pendingRoll && (removedCombatantIds.has(room.pendingRoll.playerId) || Boolean(room.pendingRoll.targetId && removedCombatantIds.has(room.pendingRoll.targetId)))) {
    room.pendingRoll = undefined;
  }
  if (room.pendingRollDecision && (removedCombatantIds.has(room.pendingRollDecision.actorId) || removedCombatantIds.has(room.pendingRollDecision.targetId))) {
    room.pendingRollDecision = undefined;
  }
  if (room.pendingGuardCheck && removedCombatantIds.has(room.pendingGuardCheck.actorId)) {
    room.pendingGuardCheck = undefined;
  }
  if (room.guardCheckCompletedForActorId && removedCombatantIds.has(room.guardCheckCompletedForActorId)) {
    room.guardCheckCompletedForActorId = undefined;
  }

  for (const player of room.players) {
    if (player.selectedTargetId && removedCombatantIds.has(player.selectedTargetId)) {
      player.selectedTargetId = undefined;
    }
  }

  if (room.hostId === controllerId || !room.players.some((player) => player.id === room.hostId || player.controllerId === room.hostId)) {
    room.hostId = getRoomControllers(room)[0] ?? room.players[0]?.id ?? room.hostId;
  }
  for (const player of room.players) {
    player.isHost = player.controllerId === room.hostId || player.id === room.hostId;
  }
}

function getDuoControllerDisplayName(room: Room, controllerId: string): string {
  const player = room.players.find((item) => item.controllerId === controllerId || item.id === controllerId);
  if (!player) return "玩家";
  if (player.slotIndex === undefined) return player.nickname;
  const suffix = ` 角色${player.slotIndex + 1}`;
  return player.nickname.endsWith(suffix) ? player.nickname.slice(0, -suffix.length) : player.nickname;
}

function markPlayerOffline(socketId: string): void {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return;
  const room = rooms.get(roomId);
  const socket = io.sockets.sockets.get(socketId);
  socket?.leave(roomId);
  socketToRoom.delete(socketId);
  socketToClient.delete(socketId);
  if (!room) return;

  const player = room.players.find((item) => item.id === socketId || item.controllerId === socketId);
  if (!player) return;
  for (const item of room.players) {
    if (item.id === socketId || item.controllerId === socketId) item.isOnline = false;
  }
  const event = addEvent(room, "system", `${player.nickname} 已离线`);
  refreshRoomEmptySince(room);
  broadcastRoom(room, [event]);
  broadcastRoomList();
}

function getRoomOnlineCount(room: Room): number {
  if (ensureRoomGameMode(room) === "duo_2v2" && room.phase === "battle") {
    const controllerIds = new Set(room.players.map((player) => player.controllerId).filter((controllerId): controllerId is string => Boolean(controllerId)));
    return Array.from(controllerIds).filter((controllerId) => socketToRoom.get(controllerId) === room.id && io.sockets.sockets.has(controllerId)).length;
  }
  return room.players.filter((player) => socketToRoom.get(player.id) === room.id && socketToClient.get(player.id) === player.clientId && io.sockets.sockets.has(player.id)).length;
}

function refreshRoomEmptySince(room: Room, now = Date.now()): void {
  if (getRoomOnlineCount(room) === 0) {
    room.emptySince ??= now;
    return;
  }

  room.emptySince = undefined;
}

const cleanupExpiredEmptyRooms = _cleanupExpiredEmptyRooms;

function rebindPlayerReferences(room: Room, previousId: string, nextId: string): void {
  if (previousId === nextId) return;
  if (room.hostId === previousId) room.hostId = nextId;
  if (room.winnerId === previousId) room.winnerId = nextId;
  room.rematchReadyPlayerIds = room.rematchReadyPlayerIds.map((playerId) => (playerId === previousId ? nextId : playerId));
  if (room.pendingRoll?.playerId === previousId) room.pendingRoll.playerId = nextId;
  if (room.pendingRoll?.targetId === previousId) room.pendingRoll.targetId = nextId;
  if (room.pendingRollDecision?.actorId === previousId) room.pendingRollDecision.actorId = nextId;
  if (room.pendingRollDecision?.targetId === previousId) room.pendingRollDecision.targetId = nextId;
  if (room.pendingGuardCheck?.actorId === previousId) room.pendingGuardCheck.actorId = nextId;
  if (room.pendingGuardCheck?.controllerId === previousId) room.pendingGuardCheck.controllerId = nextId;
  if (room.guardCheckCompletedForActorId === previousId) room.guardCheckCompletedForActorId = nextId;
  for (const slot of room.duoSlots ?? []) {
    if (slot.controllerId === previousId) slot.controllerId = nextId;
  }
  for (const player of room.players) {
    if (player.selectedTargetId === previousId) player.selectedTargetId = nextId;
  }
  for (const effect of room.effects) {
    if (effect.sourcePlayerId === previousId) effect.sourcePlayerId = nextId;
    if (effect.expiresAtSourceTurnStartPlayerId === previousId) effect.expiresAtSourceTurnStartPlayerId = nextId;
  }
  for (const snapshot of room.snapshots) {
    if (snapshot.currentPlayerId === previousId) snapshot.currentPlayerId = nextId;
    for (const player of snapshot.players) {
      if (player.id === previousId) player.id = nextId;
      if (player.selectedTargetId === previousId) player.selectedTargetId = nextId;
    }
    for (const effect of snapshot.effects) {
      if (effect.sourcePlayerId === previousId) effect.sourcePlayerId = nextId;
      if (effect.expiresAtSourceTurnStartPlayerId === previousId) effect.expiresAtSourceTurnStartPlayerId = nextId;
    }
  }
}

function rebindDuoControllerReferences(room: Room, previousId: string, nextId: string, clientId: string, userId?: string): void {
  if (previousId === nextId) return;
  if (room.hostId === previousId) room.hostId = nextId;
  if (room.activeControllerId === previousId) room.activeControllerId = nextId;
  if (room.pendingGuardCheck?.controllerId === previousId) room.pendingGuardCheck.controllerId = nextId;
  room.controllerTurnOrder = room.controllerTurnOrder?.map((controllerId) => (controllerId === previousId ? nextId : controllerId));
  for (const slot of room.duoSlots ?? []) {
    if (slot.controllerId === previousId) slot.controllerId = nextId;
  }
  for (const player of room.players) {
    if (player.controllerId === previousId || player.clientId === clientId) {
      player.controllerId = nextId;
      player.clientId = clientId;
      if (userId) player.userId = userId;
      player.isOnline = true;
    }
  }
}

function createRoomId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const id = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    if (!rooms.has(id)) return id;
  }
  return crypto.randomUUID().slice(0, 4).toUpperCase();
}

function sanitizeNickname(value: string | undefined): string {
  const nickname = (value ?? "").trim().slice(0, 12);
  if (!nickname) throw new Error("请输入昵称");
  return nickname;
}

function sanitizeClientId(value: string | undefined): string {
  const clientId = (value ?? "").trim().slice(0, 64);
  if (!clientId) throw new Error("缺少玩家标识");
  return clientId;
}

function sanitizeOptionalId(value: unknown): string | undefined {
  const id = typeof value === "string" ? value.trim().slice(0, 64) : "";
  return id || undefined;
}
