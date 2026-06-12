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
  createPlayer,
  resetToLobbyForRematch,
  rollForActivePlayer,
  selectTarget,
  serializeRoom,
  startGame,
  type CharacterId,
  type EmoteId,
  type GameEvent,
  type PlayerEmoteEvent,
  type Room,
  type RoomListItem,
  type RoomListStatus,
  type RoomSettings
} from "@career-war/shared";

const MAX_BATTLE_LOG = 80;
const EMOTE_COOLDOWN_MS = 1000;
const ROOM_MAX_PLAYERS_OPTIONS = [2, 3, 4, 5, 6, 7, 8] as const;
const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  allowDuplicateCharacters: true
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
      const roomId = createRoomId();
      const player = createPlayer(socket.id, clientId, nickname, true);
      const room: Room = {
        id: roomId,
        hostId: socket.id,
        phase: "lobby",
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
      return { roomId, playerId: socket.id, room: serializePublicRoom(room) };
    });
  });

  socket.on("joinRoom", (payload: { roomId?: string; nickname?: string; clientId?: string }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const roomId = (payload.roomId ?? "").trim().toUpperCase();
      const room = getRoom(roomId);
      const settings = ensureRoomSettings(room);
      const clientId = sanitizeClientId(payload.clientId);
      const existing = room.players.find((player) => player.clientId === clientId);

      if (existing) {
        const previousId = existing.id;
        existing.id = socket.id;
        existing.isOnline = true;
        rebindPlayerReferences(room, previousId, socket.id);
        bindSocketToRoom(socket.id, clientId, roomId);
        const event = addEvent(room, "system", `${existing.nickname} 已重新连接`);
        broadcastRoom(room, [event]);
        return { roomId, playerId: socket.id, room: serializePublicRoom(room) };
      }

      if (room.phase !== "lobby") throw new Error("游戏已经开始，不能加入");
      if (room.players.length >= settings.maxPlayers) throw new Error("房间已满");

      const nickname = sanitizeNickname(payload.nickname);
      const player = createPlayer(socket.id, clientId, nickname, false);
      room.players.push(player);
      bindSocketToRoom(socket.id, clientId, roomId);
      const event = addEvent(room, "system", `${nickname} 加入了房间`);
      broadcastRoom(room, [event]);
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
      const previousId = player.id;
      player.id = socket.id;
      player.isOnline = true;
      rebindPlayerReferences(room, previousId, socket.id);
      bindSocketToRoom(socket.id, clientId, roomId);
      const event = addEvent(room, "system", `${player.nickname} 已重新连接`);
      broadcastRoom(room, [event]);
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
      validateStartGame(room);
      const events = startGame(room, serverContext);
      broadcastRoom(room, events);
      return { ok: true };
    });
  });

  socket.on("selectTarget", (payload: { targetId?: string }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (!payload.targetId) throw new Error("请选择目标");
      selectTarget(room, socket.id, payload.targetId);
      io.to(room.id).emit("gameStateUpdated", serializePublicRoom(room));
      return { ok: true };
    });
  });

  socket.on("rollDice", (_payload: unknown, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      const result = rollForActivePlayer(room, socket.id, serverContext);
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
  const publicRoom = serializeRoom(room);
  publicRoom.battleLog = publicRoom.battleLog.slice(0, MAX_BATTLE_LOG);
  publicRoom.snapshots = [];
  return publicRoom;
}

function getPublicRoomList(): RoomListItem[] {
  return Array.from(rooms.values())
    .filter((room) => room.phase !== "gameOver")
    .map((room) => {
      const settings = ensureRoomSettings(room);
      const host = room.players.find((player) => player.id === room.hostId) ?? room.players.find((player) => player.isHost);
      return {
        roomId: room.id,
        hostName: host?.nickname ?? "未知房主",
        playerCount: room.players.length,
        maxPlayers: settings.maxPlayers,
        phase: mapRoomPhase(room.phase),
        canJoin: room.phase === "lobby" && room.players.length < settings.maxPlayers
      };
    });
}

function ensureRoomSettings(room: Room): RoomSettings {
  room.settings = {
    ...DEFAULT_ROOM_SETTINGS,
    ...(room.settings ?? {})
  };
  return room.settings;
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

  room.settings = nextSettings;
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

function bindSocketToRoom(socketId: string, clientId: string, roomId: string): void {
  socketToRoom.set(socketId, roomId);
  socketToClient.set(socketId, clientId);
  const socket = io.sockets.sockets.get(socketId);
  socket?.join(roomId);
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
  }

  if (room.players.length === 0) {
    rooms.delete(roomId);
    return;
  }

  if (room.hostId === socketId && leaving) {
    room.hostId = room.players[0].id;
    room.players[0].isHost = true;
  }

  if (room.activePlayerIndex >= room.players.length) {
    room.activePlayerIndex = 0;
  }

  const event = addEvent(room, "system", `${leaving?.nickname ?? "玩家"} 离开了房间`);
  broadcastRoom(room, [event]);
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

  const player = room.players.find((item) => item.id === socketId);
  if (!player) return;
  player.isOnline = false;
  const event = addEvent(room, "system", `${player.nickname} 已离线`);
  broadcastRoom(room, [event]);
}

function rebindPlayerReferences(room: Room, previousId: string, nextId: string): void {
  if (previousId === nextId) return;
  if (room.hostId === previousId) room.hostId = nextId;
  if (room.winnerId === previousId) room.winnerId = nextId;
  room.rematchReadyPlayerIds = room.rematchReadyPlayerIds.map((playerId) => (playerId === previousId ? nextId : playerId));
  if (room.pendingRoll?.playerId === previousId) room.pendingRoll.playerId = nextId;
  if (room.pendingRoll?.targetId === previousId) room.pendingRoll.targetId = nextId;
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
