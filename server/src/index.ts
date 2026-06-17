import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { authMiddleware, authRouter } from "./auth.js";
import {
  EMOTE_IDS,
  beginControllerGuardCheckIfNeeded,
  characterList,
  chooseCharacter,
  confirmRollDecision,
  createPlayer,
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
  type PlayerEmoteEvent,
  type Room,
  type RoomListItem,
  type RoomListStatus,
  type RoomSettings,
  type RogueliteReward,
  type RollActionType,
  type RollDecisionChoice,
  type SummonerSkillId,
  type TeamId
} from "@career-war/shared";

const MAX_BATTLE_LOG = 80;
const EMOTE_COOLDOWN_MS = 1000;
const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000;
const ROOM_CLEANUP_INTERVAL_MS = 30 * 1000;
const ROOM_MAX_PLAYERS_OPTIONS = [2, 3, 4, 5, 6, 7, 8] as const;
const DEFAULT_GAME_MODE: GameMode = "classic";
const DUO_MAX_CONTROLLERS = 2;
const PVE_BOT_ID = "bot";
const PVE_BOT_CLIENT_ID = "bot";
const PVE_BOT_NICKNAME = "AI";
const ROGUELITE_MAX_STAGE = 5;
const ROGUELITE_REWARD_POOL: ReadonlyArray<Omit<RogueliteReward, "id">> = [
  {
    type: "heavy_punch_training",
    name: "重拳训练",
    description: "伤害 +1，最大生命 +2。",
    value: 1
  },
  {
    type: "iron_body",
    name: "铁布衫",
    description: "护甲 +1，每关开始护盾 +2。",
    value: 1
  },
  {
    type: "breathing_recovery",
    name: "战斗喘息",
    description: "恢复 40% 最大生命，最低 8 点，最大生命 +3。",
    value: 40
  },
  {
    type: "blood_punch",
    name: "吸血拳法",
    description: "伤害 +1，造成生命伤害后回复 1 点血。",
    value: 1
  },
  {
    type: "battle_instinct",
    name: "战斗本能",
    description: "伤害 +1，每关胜利后的战后恢复额外 +3，最大生命 +2。",
    value: 1
  },
  {
    type: "guard_training",
    name: "防守训练",
    description: "最大生命 +4，每关开始护盾 +3。",
    value: 4
  },
  {
    type: "vitality_boost",
    name: "生命强化",
    description: "最大生命 +4。",
    value: 4,
    tag: "armor"
  },
  {
    type: "shield_wall",
    name: "护盾壁垒",
    description: "每关开始护盾 +4。拥有护盾时受到伤害 -1。",
    value: 4,
    tag: "shield",
    maxStacks: 3
  },
  {
    type: "first_strike",
    name: "先手优势",
    description: "每关首次攻击伤害 +3。",
    value: 3,
    tag: "burst",
    maxStacks: 3
  },
  {
    type: "low_hp_armor",
    name: "绝境护甲",
    description: "血量低于一半时护甲 +1。最多 3 层。",
    value: 1,
    tag: "low_hp",
    maxStacks: 3
  },
  {
    type: "kill_heal",
    name: "战利品",
    description: "击败敌人后回复 3 生命，溢出转下关护盾。最多 3 层。",
    value: 3,
    tag: "heal",
    maxStacks: 3
  },
  {
    type: "comeback",
    name: "翻盘之力",
    description: "血量低于一半时伤害 +3。最多 2 层。",
    value: 3,
    tag: "low_hp",
    maxStacks: 2
  },
  // ── 护盾流 ──
  {
    type: "low_roll_defense",
    name: "低点防御",
    description: "投到 1 或 2 时，获得 2 护盾。每层 +2。",
    value: 2,
    tag: "shield",
    maxStacks: 3
  },
  {
    type: "shield_strike",
    name: "盾击",
    description: "拥有护盾时攻击伤害 +2。每层 +2。",
    value: 2,
    tag: "shield",
    maxStacks: 3
  },
  {
    type: "shield_overload",
    name: "护盾过载",
    description: "每关首次攻击时，若拥有护盾，消耗最多 6 点护盾，额外造成 floor(消耗/2) 伤害。",
    value: 1,
    tag: "shield",
    maxStacks: 1
  },
  {
    type: "sturdy_bulwark",
    name: "稳固壁垒",
    description: "拥有护盾时护甲 +1。",
    value: 1,
    tag: "shield",
    maxStacks: 1
  },
  // ── 控骰流 ──
  {
    type: "fate_tokens",
    name: "命运筹码",
    description: "每次投到 1，获得 1 筹码。3 筹码时下次投骰 +1（不超过 6），消耗筹码。",
    value: 1,
    tag: "dice",
    maxStacks: 1
  },
  {
    type: "low_roll_charge",
    name: "低点蓄力",
    description: "投到 1/2/3 时获得 1 层蓄力。投到 5/6 攻击时消耗全部蓄力，每层 +2 伤害。跨关清空。",
    value: 1,
    tag: "dice",
    maxStacks: 1
  },
  {
    type: "desperate_reroll",
    name: "孤注一掷",
    description: "每关一次，可重投骰子。若更低则受 2 伤害。TODO: 主动按钮。",
    value: 1,
    tag: "dice",
    maxStacks: 1
  },
  {
    type: "lucky_floor",
    name: "幸运保底",
    description: "连续两次投到 1 或 2 后，下次投骰至少为 4。触发后重置。",
    value: 1,
    tag: "dice",
    maxStacks: 1
  }
];
const ROGUELITE_SKILL_REWARD_POOL: ReadonlyArray<Omit<RogueliteReward, "id">> = [
  {
    type: "gunner_triple_shot",
    name: "枪手技能",
    description: "投到 6 时，攻击造成 3 倍伤害。升级后提高触发和额外伤害。",
    value: 1
  },
  {
    type: "vampire_skill",
    name: "吸血鬼技能",
    description: "造成生命伤害后回复生命，每级回复 +1。",
    value: 1
  },
  {
    type: "zhaoyun_pierce",
    name: "赵子龙技能",
    description: "攻击无视护盾和护甲，升级后穿透伤害额外提高。",
    value: 1
  },
  {
    type: "flame_lord_mark",
    name: "火焰领主技能",
    description: "攻击命中后添加火焰印记，每级添加层数 +1。",
    value: 1
  }
];
const ROGUELITE_BOSS_REWARD_POOL: ReadonlyArray<Omit<RogueliteReward, "id">> = [
  {
    type: "berserker_blood",
    name: "狂怒之血",
    description: "攻击额外造成已损失生命一半的伤害。",
    value: 0
  },
  {
    type: "vampire_instinct",
    name: "吸血本能",
    description: "造成生命伤害后，回复 2 点生命，溢出可转护盾。",
    value: 2
  },
  {
    type: "dragon_courage",
    name: "龙胆之力",
    description: "你的攻击无视护盾和护甲。",
    value: 0
  }
];
const ROGUELITE_STARTER_REWARD_POOL: ReadonlyArray<Omit<RogueliteReward, "id">> = [
  {
    type: "starter_heavy_punch",
    name: "重拳开局",
    description: "伤害 +2，最大生命 +4。",
    value: 2
  },
  {
    type: "starter_blood_punch",
    name: "吸血开局",
    description: "伤害 +1，造成生命伤害后回复 2 点血。",
    value: 1
  },
  {
    type: "starter_iron_wall",
    name: "铁壁开局",
    description: "护甲 +1，最大生命 +6，每关开始护盾 +3。",
    value: 1
  },
  {
    type: "starter_recovery",
    name: "续航开局",
    description: "最大生命 +4，每关胜利后额外恢复 5 点血。",
    value: 4
  }
];
const ROGUELITE_BOSS_POOL = ["boss_boxer_king", "boss_blood_demon", "boss_shield_guard", "boss_god_berserker", "boss_gambler_dealer"] as const;
type RogueliteBossId = (typeof ROGUELITE_BOSS_POOL)[number];

interface RogueliteBossConfig {
  id: RogueliteBossId;
  name: string;
  baseHp: number;
  baseShield: number;
  skills: string[];
}

const ROGUELITE_BOSS_CONFIGS: Record<RogueliteBossId, RogueliteBossConfig> = {
  boss_boxer_king: {
    id: "boss_boxer_king",
    name: "小Boss：拳王",
    baseHp: 18,
    baseShield: 2,
    skills: ["蓄力：投到 1/2 时蓄力，下次攻击额外伤害", "重拳：消耗蓄力造成额外伤害（每层 +3）", "狂暴：半血后伤害 +2"]
  },
  boss_blood_demon: {
    id: "boss_blood_demon",
    name: "小Boss：血魔",
    baseHp: 16,
    baseShield: 0,
    skills: ["吸血攻击：造成生命伤害后回复 2 点血", "血盾：投到 3 时获得 4 点护盾", "血祭：血量低于 40% 时回复 5 点血并获得 3 点护盾"]
  },
  boss_shield_guard: {
    id: "boss_shield_guard",
    name: "小Boss：山盾守卫",
    baseHp: 14,
    baseShield: 5,
    skills: ["坚守：天生护甲 +1", "架盾：投到 1/2 时获得 5 点护盾并准备减伤", "盾击反击：架盾后受到攻击时反击 2 点伤害"]
  },
  boss_god_berserker: {
    id: "boss_god_berserker",
    name: "神狂战",
    baseHp: 20,
    baseShield: 0,
    skills: ["狂战：已损失生命转化为额外伤害", "生命阈值：15 / 10 / 5 / 1（一次伤害只触发一个）", "濒死一击：1 血后完成最后一次攻击才会倒下"]
  },
  boss_gambler_dealer: {
    id: "boss_gambler_dealer",
    name: "赌命庄家",
    baseHp: 16,
    baseShield: 3,
    skills: ["骰子操控：投到 1-3 时重投一次（必须接受新结果）", "赌注：玩家投到 6 时，庄家获得 3 点护盾", "庄家通吃：血量低于 30% 时，每次攻击额外造成 3 伤害"]
  }
};

type RogueliteEnemyType = "normal" | "normal_shield_breaker" | "normal_armor_piercer" | "normal_gambler" | "elite_iron_skin" | "elite_berserker" | "elite_reaper" | "elite_armor_piercing";

interface RogueliteEnemyConfig {
  type: RogueliteEnemyType;
  name: string;
  hpBonus: number;
  shieldBonus: number;
  damageBonus: number;
  skills: string[];
}

function getRogueliteEnemyForStage(stage: number): RogueliteEnemyConfig {
  const isElite = stage % 3 === 2 && stage >= 5;

  // Normal enemies — add variant types from stage 4+
  if (!isElite) {
    if (stage >= 7) {
      // Rotate through normal variants
      const variants: RogueliteEnemyType[] = ["normal", "normal_gambler", "normal_shield_breaker", "normal_armor_piercer"];
      const idx = stage % variants.length;
      const variant = variants[idx];
      if (variant === "normal_shield_breaker") return { type: variant, name: "破盾兵", hpBonus: 0, shieldBonus: 0, damageBonus: 0, skills: ["破盾：攻击护盾时额外 +2 伤害"] };
      if (variant === "normal_armor_piercer") return { type: variant, name: "穿甲兵", hpBonus: 0, shieldBonus: 0, damageBonus: 0, skills: ["穿甲：攻击无视 1 点护甲"] };
      if (variant === "normal_gambler") return { type: variant, name: "赌徒", hpBonus: 0, shieldBonus: 0, damageBonus: 0, skills: ["赌徒：投 1 自伤 1，投 6 伤害 +2"] };
    }
    if (stage >= 4) {
      // 25% chance of gambler
      if (stage % 4 === 0) return { type: "normal_gambler", name: "赌徒", hpBonus: 0, shieldBonus: 0, damageBonus: 0, skills: ["赌徒：投 1 自伤 1，投 6 伤害 +2"] };
    }
    return { type: "normal", name: "AI", hpBonus: 0, shieldBonus: 0, damageBonus: 0, skills: [] };
  }

  // Elite enemies — rotate with expanded pool from stage 10+
  const eliteCycle = Math.floor((stage - 1) / 3);
  const eliteTypesEarly: RogueliteEnemyType[] = ["elite_iron_skin", "elite_berserker"];
  const eliteTypesLate: RogueliteEnemyType[] = ["elite_iron_skin", "elite_berserker", "elite_reaper", "elite_armor_piercing"];
  const eliteTypes = stage >= 10 ? eliteTypesLate : eliteTypesEarly;
  const type = eliteTypes[eliteCycle % eliteTypes.length];

  if (type === "elite_iron_skin") return { type, name: "铁皮精英", hpBonus: 0, shieldBonus: 0, damageBonus: 0, skills: ["铁皮：天生护甲 +1，每回合开始获得 2 护盾"] };
  if (type === "elite_berserker") return { type, name: "狂暴精英", hpBonus: 0, shieldBonus: 0, damageBonus: 0, skills: ["狂暴：血量低于一半时伤害 +3"] };
  if (type === "elite_reaper") return { type, name: "收割精英", hpBonus: 0, shieldBonus: 0, damageBonus: 0, skills: ["收割：玩家生命低于 40% 时，伤害 +2"] };
  return { type, name: "穿甲精英", hpBonus: 0, shieldBonus: 0, damageBonus: 0, skills: ["强穿甲：无视 1 护甲，半血后无视 2 护甲"] };
}

function getRogueliteBossForStage(stage: number): RogueliteBossConfig {
  const bossCycleLength = 3;
  const bossIndex = Math.floor((stage - 1) / bossCycleLength) % ROGUELITE_BOSS_POOL.length;
  return ROGUELITE_BOSS_CONFIGS[ROGUELITE_BOSS_POOL[bossIndex]];
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

app.get("/health", (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
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
  socket.emit("characters", characterList);

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

  socket.on("createRoom", (payload: { nickname?: string; clientId?: string; gameMode?: GameMode }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const nickname = sanitizeNickname(payload.nickname);
      const clientId = sanitizeClientId(payload.clientId);
      const gameMode = isGameMode(payload.gameMode) ? payload.gameMode : DEFAULT_GAME_MODE;
      removePlayerFromRoom(socket.id);
      removeClientFromRooms(clientId);
      const roomId = createRoomId();
      const player = createPlayer(socket.id, clientId, nickname, true);
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

  socket.on("joinRoom", (payload: { roomId?: string; nickname?: string; clientId?: string; gameMode?: GameMode }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const roomId = (payload.roomId ?? "").trim().toUpperCase();
      const room = getRoom(roomId);
      const gameMode = ensureRoomGameMode(room);
      if (payload.gameMode !== undefined && payload.gameMode !== gameMode) throw new Error("房间模式与当前入口不匹配");
      const maxPlayers = getRoomMaxPlayers(room);
      const clientId = sanitizeClientId(payload.clientId);
      const existing = room.players.find((player) => player.clientId === clientId);

      if (existing) {
        if (gameMode === "duo_2v2" && room.phase === "battle") {
          const previousControllerId = existing.controllerId;
          if (!previousControllerId) throw new Error("没有可恢复的 2V2 控制者身份");
          rebindDuoControllerReferences(room, previousControllerId, socket.id, clientId);
          bindSocketToRoom(socket.id, clientId, roomId);
          const event = addEvent(room, "system", `${existing.nickname} 已重新连接`);
          broadcastRoom(room, [event]);
          broadcastRoomList();
          return { roomId, playerId: socket.id, room: serializeRoomForViewer(room, socket.id, clientId) };
        }
        const previousId = existing.id;
        existing.id = socket.id;
        existing.isOnline = true;
        rebindPlayerReferences(room, previousId, socket.id);
        ensureDuoSlots(room);
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
      room.players.push(player);
      ensureDuoSlots(room);
      bindSocketToRoom(socket.id, clientId, roomId);
      const event = addEvent(room, "system", `${nickname} 加入了房间`);
      broadcastRoom(room, [event]);
      broadcastRoomList();
      return { roomId, playerId: socket.id, room: serializeRoomForViewer(room, socket.id, clientId) };
    });
  });

  socket.on("resumeRoom", (payload: { roomId?: string; clientId?: string }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const roomId = (payload.roomId ?? "").trim().toUpperCase();
      const clientId = sanitizeClientId(payload.clientId);
      const room = getRoom(roomId);
      const player = room.players.find((item) => item.clientId === clientId);
      if (!player) throw new Error("没有可恢复的房间身份");
      if (ensureRoomGameMode(room) === "duo_2v2" && room.phase === "battle") {
        const previousControllerId = player.controllerId;
        if (!previousControllerId) throw new Error("没有可恢复的 2V2 控制者身份");
        rebindDuoControllerReferences(room, previousControllerId, socket.id, clientId);
        bindSocketToRoom(socket.id, clientId, roomId);
        const event = addEvent(room, "system", `${player.nickname} 已重新连接`);
        broadcastRoom(room, [event]);
        broadcastRoomList();
        return { roomId, playerId: socket.id, room: serializeRoomForViewer(room, socket.id, clientId) };
      }
      const previousId = player.id;
      player.id = socket.id;
      player.isOnline = true;
      rebindPlayerReferences(room, previousId, socket.id);
      ensureDuoSlots(room);
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
          room.roguelite = { stage: 1, maxStage: ROGUELITE_MAX_STAGE, appliedRewards: [] };
        }
        ensurePveBot(room);
        validateStartGame(room);
        const events = startGame(room, serverContext);
        if (ensureRoomGameMode(room) === "pve_roguelite") {
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

      if (isBossRewardType(reward.type)) {
        room.phase = "roguelite_continue";
        const event = addEvent(room, "system", `${player.nickname} 选择了 Boss 能力：${reward.name}`);
        broadcastRoom(room, [event]);
        return { ok: true };
      }

      prepareNextRogueliteStage(room, player);
      const event = addEvent(room, "system", `${player.nickname} 选择奖励：${reward.name}，进入第 ${room.roguelite.stage} 关`);
      broadcastRoom(room, [event]);
      scheduleBotTurnIfNeeded(room);
      return { ok: true };
    });
  });

  socket.on("chooseRogueliteContinue", (payload: { choice?: "finish" | "continue" }, reply?: Ack) => {
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

      // continue
      prepareNextRogueliteStage(room, player);
      const event = addEvent(room, "system", `${player.nickname} 继续挑战，进入第 ${room.roguelite?.stage ?? 1} 关`);
      broadcastRoom(room, [event]);
      scheduleBotTurnIfNeeded(room);
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
      io.to(room.id).emit("playerEmote", event);
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

function broadcastRoom(room: Room, _events: GameEvent[]): void {
  trimBattleLog(room);
  emitRoomToParticipants(room);
}

function emitRoomToParticipants(room: Room): void {
  trimBattleLog(room);
  for (const [socketId, roomId] of Array.from(socketToRoom.entries())) {
    if (roomId !== room.id) continue;
    const socket = io.sockets.sockets.get(socketId);
    socket?.emit("gameStateUpdated", serializeRoomForViewer(room, socketId, socketToClient.get(socketId)));
  }
}

function broadcastRoomList(): void {
  io.emit("roomListUpdated", getPublicRoomList());
}

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
  if (handleRogueliteBattleEnd(room, result.gameOver)) return true;
  io.to(room.id).emit("gameOver", result.gameOver);
  return true;
}

function handleRogueliteBattleEnd(room: Room, gameOver: { winnerId: string; winnerName: string }): boolean {
  if (ensureRoomGameMode(room) !== "pve_roguelite") return false;
  const winner = room.players.find((player) => player.id === gameOver.winnerId);
  if (!winner || winner.isBot) return false;

  const roguelite = ensureRogueliteState(room);
  const stage = roguelite.stage;
  const isBossStage = stage % 3 === 0;
  const enemyBot = room.players.find((p) => p.isBot);
  const enemyName = enemyBot?.nickname ?? "敌人";

  // Stage-specific post-battle heal
  let actualHeal = 0;
  if (stage === 1) {
    actualHeal = winner.maxHp - winner.hp;
    winner.hp = winner.maxHp;
    addEvent(room, "heal", `战后恢复至满血（${winner.maxHp} 点）`);
  } else if (stage === 2) {
    const healAmount = Math.max(8, Math.floor(winner.maxHp * 0.5));
    const bonusHeal = winner.roguelitePostBattleHealBonus ?? 0;
    actualHeal = Math.min(winner.maxHp - winner.hp, healAmount + bonusHeal);
    if (actualHeal > 0) {
      winner.hp += actualHeal;
      addEvent(room, "heal", `战后恢复 ${actualHeal} 点生命`);
    }
  } else {
    const baseHeal = Math.max(5, Math.floor(winner.maxHp * 0.3));
    const bonusHeal = winner.roguelitePostBattleHealBonus ?? 0;
    actualHeal = Math.min(winner.maxHp - winner.hp, baseHeal + bonusHeal);
    if (actualHeal > 0) {
      winner.hp += actualHeal;
      addEvent(room, "heal", `战后恢复 ${actualHeal} 点生命`);
    }
  }

  room.phase = "reward";
  room.winnerId = undefined;
  room.rematchReadyPlayerIds = [];

  const stageSummary = {
    defeatedEnemyName: enemyName,
    postBattleHeal: actualHeal,
    hpAfterHeal: winner.hp,
    maxHp: winner.maxHp,
    isBoss: isBossStage
  };

  if (isBossStage) {
    room.roguelite = {
      ...roguelite,
      lastStageSummary: stageSummary,
      rewardChoices: createRogueliteBossRewardChoices()
    };
    addEvent(room, "system", `第 ${stage} 关 Boss 胜利！选择 1 个 Boss 能力`);
  } else if (stage === 1) {
    room.roguelite = {
      ...roguelite,
      lastStageSummary: stageSummary,
      rewardChoices: createRogueliteStarterRewardChoices()
    };
    addEvent(room, "system", `第 1 关胜利！选择 1 个启动礼包`);
  } else {
    room.roguelite = {
      ...roguelite,
      lastStageSummary: stageSummary,
      rewardChoices: createRogueliteRewardChoices(winner.roguelitePerkStacks)
    };
    addEvent(room, "system", `第 ${stage} 关胜利，选择 1 个奖励后进入下一关`);
  }

  emitRoomToParticipants(room);
  return true;
}

function ensureRogueliteState(room: Room): NonNullable<Room["roguelite"]> {
  room.roguelite ??= { stage: 1, maxStage: ROGUELITE_MAX_STAGE, appliedRewards: [] };
  room.roguelite.maxStage = room.roguelite.maxStage || ROGUELITE_MAX_STAGE;
  room.roguelite.appliedRewards ??= [];
  return room.roguelite;
}

function createRogueliteRewardChoices(currentStacks?: Record<string, number>): RogueliteReward[] {
  const fullPool = [...ROGUELITE_SKILL_REWARD_POOL, ...ROGUELITE_REWARD_POOL];
  const pool = fullPool.filter((draft) => {
    if (!draft.maxStacks) return true;
    const perkId = REWARD_TO_PERK[draft.type]?.perkId ?? draft.type;
    const current = currentStacks?.[perkId] ?? 0;
    return current < draft.maxStacks;
  });
  const choices: RogueliteReward[] = [];
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
  return ROGUELITE_BOSS_REWARD_POOL.map((draft) => ({ ...draft, id: crypto.randomUUID() }));
}

function createRogueliteStarterRewardChoices(): RogueliteReward[] {
  const gunner = ROGUELITE_SKILL_REWARD_POOL.find((reward) => reward.type === "gunner_triple_shot");
  const otherSkills = ROGUELITE_SKILL_REWARD_POOL.filter((reward) => reward.type !== "gunner_triple_shot");
  const starterPool = [...ROGUELITE_STARTER_REWARD_POOL];
  const choices: RogueliteReward[] = [];
  if (gunner) choices.push({ ...gunner, id: crypto.randomUUID() });
  const randomSkill = pickOne(otherSkills);
  if (randomSkill) choices.push({ ...randomSkill, id: crypto.randomUUID() });
  const starter = pickOne(starterPool);
  if (starter) choices.push({ ...starter, id: crypto.randomUUID() });
  return choices;
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
    player.maxHp += 4;
    player.hp = Math.min(player.maxHp, player.hp + 4);
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
    player.roguelitePostBattleHealBonus = (player.roguelitePostBattleHealBonus ?? 0) + 3;
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
    player.maxHp += reward.value;
    player.hp = Math.min(player.maxHp, player.hp + reward.value);
    return;
  }
  if (reward.type === "shield_wall") {
    player.rogueliteStartShield = (player.rogueliteStartShield ?? 0) + reward.value;
    return;
  }
  if (reward.type === "first_strike") {
    player.rogueliteDamageBonus = (player.rogueliteDamageBonus ?? 0) + reward.value;
    return;
  }
  if (reward.type === "low_hp_armor") {
    player.rogueliteLowHpArmor = (player.rogueliteLowHpArmor ?? 0) + reward.value;
    return;
  }
  if (reward.type === "kill_heal") {
    player.rogueliteKillHeal = (player.rogueliteKillHeal ?? 0) + reward.value;
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

function prepareNextRogueliteStage(room: Room, player: Room["players"][number]): void {
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
  player.isDead = false;
  player.isOnline = true;
  player.selectedTargetId = undefined;
  player.guarding = false;
  player.flameMarks = 0;
  player.zhaoZilongHitCount = 0;
  player.summonerSkillId = undefined;
  player.summonerSkillCooldown = 0;
  player.rogueliteSummonerCooldownReduction = 0;
  player.shield = player.rogueliteStartShield ?? 0;
  // Reset per-stage abilities
  player.rogueliteShieldOverloadUsed = false;
  player.rogueliteLowRollCharge = 0;
  player.rogueliteConsecutiveLowRolls = 0;
  ensurePveBot(room);
  const playerIndex = room.players.findIndex((item) => item.id === player.id);
  room.activePlayerIndex = Math.max(0, playerIndex);
  addEvent(room, "turn", `第 ${room.roguelite?.stage ?? 1} 关开始，轮到 ${player.nickname} 行动`);
  trimBattleLog(room);
}

function addEvent(room: Room, type: GameEvent["type"], message: string): GameEvent {
  const event: GameEvent = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    type,
    message
  };
  room.battleLog.unshift(event);
  trimBattleLog(room);
  return event;
}

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

function getPublicRoomList(): RoomListItem[] {
  cleanupExpiredEmptyRooms();
  return Array.from(rooms.values())
    .filter((room) => room.phase !== "gameOver" && getRoomOnlineCount(room) > 0)
    .map((room) => {
      const gameMode = ensureRoomGameMode(room);
      const playerCount = getRoomParticipantCount(room);
      const maxPlayers = getRoomMaxPlayers(room);
      const host = getRoomHost(room);
      return {
        roomId: room.id,
        hostName: host?.nickname ?? "未知房主",
        playerCount,
        maxPlayers,
        phase: mapRoomPhase(room.phase),
        canJoin: room.phase === "lobby" && playerCount < maxPlayers,
        gameMode
      };
    });
}

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

function ensureRoomSettings(room: Room): RoomSettings {
  const gameMode = ensureRoomGameMode(room);
  room.settings = {
    ...DEFAULT_ROOM_SETTINGS,
    ...(room.settings ?? {}),
    gameMode,
    maxPlayers: gameMode === "duo_2v2" ? DUO_MAX_CONTROLLERS : isSinglePlayerPveGameMode(gameMode) ? 1 : room.settings?.maxPlayers ?? DEFAULT_ROOM_SETTINGS.maxPlayers
  };
  return room.settings;
}

function ensureRoomGameMode(room: Room): GameMode {
  const currentMode = room.gameMode ?? room.settings?.gameMode;
  room.gameMode = isGameMode(currentMode) ? currentMode : DEFAULT_GAME_MODE;
  return room.gameMode;
}

function isSinglePlayerPveMode(room: Room): boolean {
  return isSinglePlayerPveGameMode(ensureRoomGameMode(room));
}

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
    player.characterId = "boxer";
    const boxerCharacter = characterList.find((item) => item.id === "boxer");
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

  const character = characterList.find((item) => item.id === "boxer");
  if (!character) throw new Error("AI 职业配置不存在");
  const stage = ensureRoomGameMode(room) === "pve_roguelite" ? ensureRogueliteState(room).stage : 1;

  // Stages 1-3: fixed beginner-friendly difficulty
  if (stage === 1) {
    const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, "训练拳手", false);
    bot.isBot = true;
    bot.isOnline = true;
    bot.controllerId = PVE_BOT_ID;
    bot.characterId = "boxer";
    bot.summonerSkillId = "first_aid";
    bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
    bot.maxHp = 8;
    bot.hp = 8;
    bot.shield = 0;
    bot.rogueliteEnemyInfo = { stageType: "normal", hpBonus: 0, shieldBonus: 0, damageBonus: 0, description: "训练关" };
    room.players.push(bot);
    return;
  }
  if (stage === 2) {
    const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, "普通拳手", false);
    bot.isBot = true;
    bot.isOnline = true;
    bot.controllerId = PVE_BOT_ID;
    bot.characterId = "boxer";
    bot.summonerSkillId = "first_aid";
    bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
    bot.maxHp = 12;
    bot.hp = 12;
    bot.shield = 0;
    bot.rogueliteEnemyInfo = { stageType: "normal", hpBonus: 4, shieldBonus: 0, damageBonus: 0, description: "普通关" };
    room.players.push(bot);
    return;
  }
  if (stage === 3) {
    const bossConfig = getRogueliteBossForStage(stage);
    const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, bossConfig.name, false);
    bot.isBot = true;
    bot.isOnline = true;
    bot.controllerId = PVE_BOT_ID;
    bot.characterId = "boxer";
    bot.summonerSkillId = "first_aid";
    bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
    bot.maxHp = bossConfig.baseHp;
    bot.hp = bossConfig.baseHp;
    bot.shield = bossConfig.baseShield;
    bot.rogueliteBossId = bossConfig.id;
    bot.rogueliteBossState = bossConfig.id === "boss_god_berserker"
      ? { t15: true, t10: true, t5: true, t1: true, dyingAfterAttack: false }
      : bossConfig.id === "boss_gambler_dealer"
      ? { lowHpMode: false }
      : {};
    bot.rogueliteEnemyInfo = { stageType: "boss", hpBonus: bossConfig.baseHp - 8, shieldBonus: bossConfig.baseShield, damageBonus: 0, skillNames: bossConfig.skills };
    room.players.push(bot);
    addEvent(room, "system", `Boss 出现：${bossConfig.name}！${bossConfig.skills.join("；")}`);
    return;
  }

  // Stages 4+: formula-based scaling
  let bonusHp = 0;
  let bonusShield = 0;

  if (stage === 4) { bonusHp = 10; bonusShield = 2; }
  else if (stage === 5) { bonusHp = 15; bonusShield = 4; }
  else if (stage === 6) { bonusHp = 25; bonusShield = 8; }
  else {
    bonusHp = stage * 5;
    bonusShield = Math.floor(stage / 2) * 2;
    if (stage % 3 === 0) { bonusHp += 10; bonusShield += 4; }
    else if (stage % 3 === 2) { bonusHp += 3; bonusShield += 2; }
  }

  if (stage % 3 === 0) {
    // Boss stage (6+): use boss config with scaling
    const bossConfig = getRogueliteBossForStage(stage);
    const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, bossConfig.name, false);
    bot.isBot = true;
    bot.isOnline = true;
    bot.controllerId = PVE_BOT_ID;
    bot.characterId = "boxer";
    bot.summonerSkillId = "first_aid";
    bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
    bot.maxHp = bossConfig.baseHp + bonusHp;
    bot.hp = bossConfig.baseHp + bonusHp;
    bot.shield = bossConfig.baseShield + bonusShield;
    bot.rogueliteBossId = bossConfig.id;
    bot.rogueliteBossState = bossConfig.id === "boss_god_berserker"
      ? { t15: true, t10: true, t5: true, t1: true, dyingAfterAttack: false }
      : bossConfig.id === "boss_gambler_dealer"
      ? { lowHpMode: false }
      : {};
    bot.rogueliteEnemyInfo = { stageType: "boss", hpBonus: bonusHp, shieldBonus: bonusShield, damageBonus: 0, skillNames: bossConfig.skills };
    room.players.push(bot);
    addEvent(room, "system", `Boss 出现：${bossConfig.name}！`);
    return;
  }

  const isElite = stage % 3 === 2 && stage >= 5;
  const enemyConfig = getRogueliteEnemyForStage(stage);

  const bot = createPlayer(PVE_BOT_ID, PVE_BOT_CLIENT_ID, enemyConfig.name, false);
  bot.isBot = true;
  bot.isOnline = true;
  bot.controllerId = PVE_BOT_ID;
  bot.characterId = "boxer";
  bot.summonerSkillId = "first_aid";
  bot.summonerSkillCooldown = getSummonerSkillInitialCooldown(bot.summonerSkillId);
  bot.maxHp = character.maxHp + bonusHp + enemyConfig.hpBonus;
  bot.hp = character.maxHp + bonusHp + enemyConfig.hpBonus;
  bot.shield = bonusShield + enemyConfig.shieldBonus;
  bot.rogueliteEnemyInfo = { stageType: isElite ? "elite" : "normal", hpBonus: bonusHp, shieldBonus: bonusShield, damageBonus: enemyConfig.damageBonus, skillNames: enemyConfig.skills.length > 0 ? enemyConfig.skills : undefined };
  if (enemyConfig.type !== "normal") {
    bot.rogueliteBossId = enemyConfig.type;
    bot.rogueliteBossState = {};
  }
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
  if (phase === "battle" || phase === "reward" || phase === "roguelite_continue") return "playing";
  return "ended";
}

function trimBattleLog(room: Room): void {
  if (room.battleLog.length > MAX_BATTLE_LOG) {
    room.battleLog.length = MAX_BATTLE_LOG;
  }
}

function getSocketRoom(socketId: string): Room {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) throw new Error("你还没有加入房间");
  return getRoom(roomId);
}

function getRoom(roomId: string): Room {
  const room = rooms.get(roomId);
  if (!room) throw new Error("房间不存在");
  return room;
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

function bindSocketToRoom(socketId: string, clientId: string, roomId: string): void {
  const previousRoomId = socketToRoom.get(socketId);
  if (previousRoomId && previousRoomId !== roomId) {
    const previousSocket = io.sockets.sockets.get(socketId);
    previousSocket?.leave(previousRoomId);
  }
  socketToRoom.set(socketId, roomId);
  socketToClient.set(socketId, clientId);
  const socket = io.sockets.sockets.get(socketId);
  socket?.join(roomId);
  const room = rooms.get(roomId);
  if (room) refreshRoomEmptySince(room);
}

function removePlayerFromRoom(socketId: string): void {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return;
  const clientId = socketToClient.get(socketId);
  const room = rooms.get(roomId);
  const socket = io.sockets.sockets.get(socketId);
  socket?.leave(roomId);
  socketToRoom.delete(socketId);
  socketToClient.delete(socketId);

  if (!room || !clientId) return;
  if (isSinglePlayerPveMode(room)) {
    deleteRoomAndUnbindSockets(room.id);
    broadcastRoomList();
    return;
  }
  if (shouldUseDuoControllerLeave(room)) {
    const leaving = findRoomParticipantForSocket(room, socketId, clientId);
    const controllerId = leaving?.controllerId ?? (room.controllerTurnOrder?.includes(socketId) ? socketId : undefined);
    if (!controllerId) return;
    const nickname = getDuoControllerDisplayName(room, controllerId);
    removeDuoControllerFromRoom(room, controllerId);
    if (shouldCleanupDuoRoom(room)) {
      deleteRoomAndUnbindSockets(room.id);
      broadcastRoomList();
      return;
    }
    const event = addEvent(room, "system", `${nickname} 离开了房间`);
    refreshRoomEmptySince(room);
    broadcastRoom(room, [event]);
    broadcastRoomList();
    return;
  }

  const leaving = room.players.find((player) => player.clientId === clientId);
  room.players = room.players.filter((player) => player.clientId !== clientId);
  if (leaving) {
    room.rematchReadyPlayerIds = room.rematchReadyPlayerIds.filter((playerId) => playerId !== leaving.id);
    room.duoSlots = room.duoSlots?.filter((slot) => slot.controllerId !== leaving.id);
  }

  if (room.players.length === 0) {
    rooms.delete(roomId);
    broadcastRoomList();
    return;
  }

  if (room.hostId === socketId && leaving) {
    room.hostId = room.players[0].id;
    room.players[0].isHost = true;
  }

  if (room.activePlayerIndex >= room.players.length) {
    room.activePlayerIndex = 0;
  }
  ensureDuoSlots(room);

  const event = addEvent(room, "system", `${leaving?.nickname ?? "玩家"} 离开了房间`);
  refreshRoomEmptySince(room);
  broadcastRoom(room, [event]);
  broadcastRoomList();
}

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

function cleanupExpiredEmptyRooms(now = Date.now()): boolean {
  let removed = false;

  for (const [roomId, room] of Array.from(rooms.entries())) {
    refreshRoomEmptySince(room, now);
    if (room.emptySince !== undefined && now - room.emptySince >= EMPTY_ROOM_TTL_MS && getRoomOnlineCount(room) === 0) {
      rooms.delete(roomId);
      removed = true;
    }
  }

  return removed;
}

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

function rebindDuoControllerReferences(room: Room, previousId: string, nextId: string, clientId: string): void {
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
