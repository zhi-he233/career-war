import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  characterList,
  chooseCharacter,
  createPlayer,
  resetToLobbyForRematch,
  rollForActivePlayer,
  selectTarget,
  serializeRoom,
  startGame,
  type CharacterId,
  type GameEvent,
  type Room
} from "@career-war/shared";

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get("/health", (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();
const socketToClient = new Map<string, string>();

io.on("connection", (socket) => {
  socket.emit("characters", characterList);

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
      return { roomId, playerId: socket.id, room: serializeRoom(room) };
    });
  });

  socket.on("joinRoom", (payload: { roomId?: string; nickname?: string; clientId?: string }, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const roomId = (payload.roomId ?? "").trim().toUpperCase();
      const room = getRoom(roomId);
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
        return { roomId, playerId: socket.id, room: serializeRoom(room) };
      }

      if (room.phase !== "lobby") throw new Error("游戏已经开始，不能加入");
      if (room.players.length >= 6) throw new Error("房间已满");

      const nickname = sanitizeNickname(payload.nickname);
      const player = createPlayer(socket.id, clientId, nickname, false);
      room.players.push(player);
      bindSocketToRoom(socket.id, clientId, roomId);
      const event = addEvent(room, "system", `${nickname} 加入了房间`);
      broadcastRoom(room, [event]);
      return { roomId, playerId: socket.id, room: serializeRoom(room) };
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
      return { roomId, playerId: socket.id, room: serializeRoom(room) };
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
      const event = chooseCharacter(room, socket.id, payload.characterId);
      room.battleLog.unshift(event);
      broadcastRoom(room, [event]);
      return { ok: true };
    });
  });

  socket.on("startGame", (_payload: unknown, reply?: Ack) => {
    handle(socket.id, reply, () => {
      const room = getSocketRoom(socket.id);
      if (room.hostId !== socket.id) throw new Error("只有房主可以开始游戏");
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
      io.to(room.id).emit("gameStateUpdated", serializeRoom(room));
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
        io.to(room.id).emit("gameStateUpdated", serializeRoom(room));
        return { ok: true, reset: true };
      }

      io.to(room.id).emit("gameStateUpdated", serializeRoom(room));
      return { ok: true };
    });
  });

  socket.on("disconnect", () => {
    markPlayerOffline(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Career War server listening on http://localhost:${PORT}`);
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

function broadcastRoom(room: Room, events: GameEvent[]): void {
  io.to(room.id).emit("gameStateUpdated", serializeRoom(room));
  for (const event of events) {
    io.to(room.id).emit("battleLogAdded", event);
  }
}

function addEvent(room: Room, type: GameEvent["type"], message: string): GameEvent {
  const event: GameEvent = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    type,
    message
  };
  room.battleLog.unshift(event);
  return event;
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
