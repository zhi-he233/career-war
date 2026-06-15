import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import {
  EMOTE_IDS,
  characterList,
  chooseCharacter,
  confirmRollDecision,
  createPlayer,
  resetToLobbyForRematch,
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
  app.use(cors({ origin: CLIENT_ORIGIN }));
}

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

  socket.on("createRoom", (payload: { nickname?: string; clientId?: string }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const nickname = sanitizeNickname(payload.nickname);
      const clientId = sanitizeClientId(payload.clientId);
      removePlayerFromRoom(socket.id);
      removeClientFromRooms(clientId);
      const roomId = createRoomId();
      const player = createPlayer(socket.id, clientId, nickname, true);
      const room: Room = {
        id: roomId,
        hostId: socket.id,
        phase: "lobby",
        gameMode: DEFAULT_GAME_MODE,
        settings: { ...DEFAULT_ROOM_SETTINGS },
        players: [player],
        rematchReadyPlayerIds: [],
        activePlayerIndex: 0,
        effects: [],
        battleLog: [],
        snapshots: [],
        previousFinalDamage: 0
      };

      rooms.set(roomId, room);
      bindSocketToRoom(socket.id, clientId, roomId);
      const event = addEvent(room, "system", `${nickname} 创建了房间 ${roomId}`);
      broadcastRoom(room, [event]);
      broadcastRoomList();
      return { roomId, playerId: socket.id, room: serializePublicRoom(room) };
    });
  });

  socket.on("joinRoom", (payload: { roomId?: string; nickname?: string; clientId?: string }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const roomId = (payload.roomId ?? "").trim().toUpperCase();
      const room = getRoom(roomId);
      const settings = ensureRoomSettings(room);
      const gameMode = ensureRoomGameMode(room);
      const maxPlayers = gameMode === "duo_2v2" ? DUO_MAX_CONTROLLERS : settings.maxPlayers;
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
          return { roomId, playerId: socket.id, room: serializePublicRoom(room) };
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
        return { roomId, playerId: socket.id, room: serializePublicRoom(room) };
      }

      if (room.phase !== "lobby") throw new Error("游戏已经开始，不能加入");
      if (room.players.length >= maxPlayers) throw new Error("房间已满");

      const nickname = sanitizeNickname(payload.nickname);
      const player = createPlayer(socket.id, clientId, nickname, false);
      room.players.push(player);
      ensureDuoSlots(room);
      bindSocketToRoom(socket.id, clientId, roomId);
      const event = addEvent(room, "system", `${nickname} 加入了房间`);
      broadcastRoom(room, [event]);
      broadcastRoomList();
      return { roomId, playerId: socket.id, room: serializePublicRoom(room) };
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
        return { roomId, playerId: socket.id, room: serializePublicRoom(room) };
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
      return { roomId, playerId: socket.id, room: serializePublicRoom(room) };
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
      io.to(room.id).emit("gameStateUpdated", serializePublicRoom(room));
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
      io.to(room.id).emit("gameStateUpdated", serializePublicRoom(room));
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
      io.to(room.id).emit("gameStateUpdated", serializePublicRoom(room));
      return { ok: true };
    });
  });

  socket.on("updateRoomSettings", (payload: Partial<RoomSettings> | undefined, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      updateRoomSettings(room, socket.id, payload ?? {});
      io.to(room.id).emit("gameStateUpdated", serializePublicRoom(room));
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
      if (!payload.actorId) throw new Error("请选择行动角色");
      if (room.pendingRoll || room.pendingRollDecision) throw new Error("请先完成当前投骰流程");

      const actor = room.players.find((player) => player.id === payload.actorId);
      if (!actor) throw new Error("行动角色不存在");
      if (actor.controllerId !== room.activeControllerId) throw new Error("只能选择自己控制的角色");
      if (actor.isDead) throw new Error("死亡角色不能行动");

      room.selectedActorId = actor.id;
      io.to(room.id).emit("gameStateUpdated", serializePublicRoom(room));
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
        io.to(room.id).emit("gameStateUpdated", serializePublicRoom(room));
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
      if (result.gameOver) {
        io.to(room.id).emit("gameOver", result.gameOver);
      }
      return { ok: true };
    });
  });

    socket.on("confirmRollDecision", (payload: { roomId?: string; pendingDecisionId?: string; decisionId?: string; actionType?: RollActionType; choice?: RollDecisionChoice; skillId?: string; summonerSkillId?: SummonerSkillId }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (payload.roomId && payload.roomId !== room.id) throw new Error("房间不匹配");
      const decisionId = payload.pendingDecisionId ?? payload.decisionId;
      const choice = payload.actionType ?? payload.choice;
      const summonerSkillId = payload.summonerSkillId ?? (isSummonerSkillId(payload.skillId) ? payload.skillId : undefined);
      if (!decisionId || !choice) throw new Error("缺少投后选择");
      if (!isRollDecisionChoice(choice)) throw new Error("未知的投后选择");
      const result = ensureRoomGameMode(room) === "duo_2v2"
        ? confirmRollDecision(room, socket.id, decisionId, choice, serverContext, summonerSkillId, socket.id)
        : confirmRollDecision(room, socket.id, decisionId, choice, serverContext, summonerSkillId);
      broadcastRoom(room, result.events);
      if (result.gameOver) {
        io.to(room.id).emit("gameOver", result.gameOver);
      }
      return { ok: true };
    });
  });

  socket.on("readyForRematch", (_payload: unknown, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (room.phase !== "gameOver") throw new Error("只有游戏结束后才能准备再来一局");
      if (!room.rematchReadyPlayerIds.includes(socket.id)) {
        room.rematchReadyPlayerIds.push(socket.id);
      }

      if (room.players.every((player) => room.rematchReadyPlayerIds.includes(player.id))) {
        resetToLobbyForRematch(room);
        io.to(room.id).emit("gameStateUpdated", serializePublicRoom(room));
        return { ok: true, reset: true };
      }

      io.to(room.id).emit("gameStateUpdated", serializePublicRoom(room));
      return { ok: true };
    });
  });

  socket.on("sendEmote", (payload: { emoteId?: unknown } | undefined, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      const player = room.players.find((item) => item.id === socket.id);
      if (!player) throw new Error("玩家不在该房间中");
      const emoteId = payload?.emoteId;
      if (!isEmoteId(emoteId)) throw new Error("无效的表情");

      const now = Date.now();
      const cooldownKey = `${room.id}:${socket.id}`;
      const lastSentAt = emoteCooldowns.get(cooldownKey) ?? 0;
      if (now - lastSentAt < EMOTE_COOLDOWN_MS) return { ok: true, ignored: true };

      emoteCooldowns.set(cooldownKey, now);
      const event: PlayerEmoteEvent = {
        roomId: room.id,
        playerId: socket.id,
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
  io.to(room.id).emit("gameStateUpdated", serializePublicRoom(room));
}

function broadcastRoomList(): void {
  io.emit("roomListUpdated", getPublicRoomList());
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

function getPublicRoomList(): RoomListItem[] {
  cleanupExpiredEmptyRooms();
  return Array.from(rooms.values())
    .filter((room) => room.phase !== "gameOver" && getRoomOnlineCount(room) > 0)
    .map((room) => {
      const settings = ensureRoomSettings(room);
      const gameMode = ensureRoomGameMode(room);
      const maxPlayers = gameMode === "duo_2v2" ? DUO_MAX_CONTROLLERS : settings.maxPlayers;
      const host = room.players.find((player) => player.id === room.hostId) ?? room.players.find((player) => player.isHost);
      return {
        roomId: room.id,
        hostName: host?.nickname ?? "未知房主",
        playerCount: room.players.length,
        maxPlayers,
        phase: mapRoomPhase(room.phase),
        canJoin: room.phase === "lobby" && room.players.length < maxPlayers
      };
    });
}

function ensureRoomSettings(room: Room): RoomSettings {
  const gameMode = ensureRoomGameMode(room);
  room.settings = {
    ...DEFAULT_ROOM_SETTINGS,
    ...(room.settings ?? {}),
    gameMode
  };
  return room.settings;
}

function ensureRoomGameMode(room: Room): GameMode {
  const currentMode = room.gameMode ?? room.settings?.gameMode;
  room.gameMode = isGameMode(currentMode) ? currentMode : DEFAULT_GAME_MODE;
  return room.gameMode;
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
    room.gameMode = payload.gameMode;
    nextSettings.gameMode = payload.gameMode;
    if (payload.gameMode === "duo_2v2") nextSettings.maxPlayers = DUO_MAX_CONTROLLERS;
  }

  if (ensureRoomGameMode(room) === "duo_2v2") {
    nextSettings.maxPlayers = DUO_MAX_CONTROLLERS;
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
  if (room.players.length > settings.maxPlayers) throw new Error("当前玩家数超过房间最大人数");
  if (settings.allowDuplicateCharacters) return;

  const selectedCharacters = room.players.map((player) => player.characterId).filter((characterId): characterId is CharacterId => Boolean(characterId));
  const uniqueCharacters = new Set(selectedCharacters);
  if (uniqueCharacters.size !== selectedCharacters.length) {
    throw new Error("当前已有重复职业，请玩家重新选择");
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
  room.rematchReadyPlayerIds = [];
  room.winnerId = undefined;
  room.winnerTeamId = undefined;
  room.highlight = undefined;
  room.skillHints = undefined;
  room.controllerTurnOrder = [aControllerId, bControllerId];
  room.activeControllerId = aControllerId;
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
      summonerSkillCooldown: 0,
      hp: character.maxHp,
      maxHp: character.maxHp,
      shield: 0,
      zhaoZilongHitCount: 0,
      isDead: false,
      selectedTargetId: undefined
    };
  });

  const activeController = controllerById.get(aControllerId);
  const events = [
    addEvent(room, "startGame", "2V2 V0 开始：已生成 4 个战斗单位"),
    addEvent(room, "turn", `轮到 ${activeController?.nickname ?? "A 队玩家"} 选择行动角色`)
  ];
  return events;
}

function mapRoomPhase(phase: Room["phase"]): RoomListStatus {
  if (phase === "lobby") return "waiting";
  if (phase === "battle") return "playing";
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
  return value === "normal_attack" || value === "settle" || value === "character_skill" || value === "summoner_skill";
}

function isGameMode(value: unknown): value is GameMode {
  return value === "classic" || value === "duo_2v2";
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
