import type { Room, RoomListItem, RoomSettings, Player, PlayerEmoteEvent, GameEvent, DuoCharacterSlot, CharacterId, SummonerSkillId, TeamId } from "@career-war/shared";
import { serializeRoom } from "@career-war/shared";
import type { ServerContext } from "../context.js";
import { DUO_MAX_CONTROLLERS, DEFAULT_GAME_MODE, DEFAULT_ROOM_SETTINGS, ROOM_MAX_PLAYERS_OPTIONS, EMPTY_ROOM_TTL_MS, MAX_BATTLE_LOG } from "../constants.js";
import { isGameMode, isSinglePlayerPveGameMode, mapRoomPhase } from "../infrastructure/utils.js";
import { sanitizeNickname, sanitizeClientId, sanitizeOptionalId, createRoomId } from "../infrastructure/utils.js";
import { logRogueliteEnemyBattleState } from "../roguelite/enemyHelpers.js";

// =========================================================================
// Broadcast helpers (defined here to avoid circular imports with broadcast.ts)
// =========================================================================

export function addEvent(room: Room, type: GameEvent["type"], message: string): GameEvent {
  const event: GameEvent = { id: crypto.randomUUID(), createdAt: Date.now(), type, message };
  room.battleLog.unshift(event);
  if (room.battleLog.length > MAX_BATTLE_LOG) room.battleLog.length = MAX_BATTLE_LOG;
  return event;
}

export function trimBattleLog(room: Room): void {
  if (room.battleLog.length > MAX_BATTLE_LOG) room.battleLog.length = MAX_BATTLE_LOG;
}

export function serializePublicRoom(room: Room): Room {
  ensureRoomSettings(room);
  ensureRoomGameMode(room);
  ensureDuoSlots(room);
  const publicRoom = serializeRoom(room);
  publicRoom.battleLog = publicRoom.battleLog.slice(0, MAX_BATTLE_LOG);
  publicRoom.snapshots = [];
  return publicRoom;
}

export function serializeRoomForViewer(room: Room, viewerSocketId: string, viewerClientId: string | undefined): Room {
  const publicRoom = serializePublicRoom(room);
  if (room.phase !== "lobby") return publicRoom;
  if (ensureRoomGameMode(room) !== "duo_2v2") {
    publicRoom.players = publicRoom.players.map((p) => {
      if (p.id === viewerSocketId || Boolean(viewerClientId && p.clientId === viewerClientId)) {
        return { ...p, characterSelected: Boolean(p.characterId), summonerSkillSelected: Boolean(p.summonerSkillId) };
      }
      const s = { ...p }; delete s.characterId; delete s.summonerSkillId;
      return { ...s, characterSelected: Boolean(p.characterId), summonerSkillSelected: Boolean(p.summonerSkillId) };
    });
    return publicRoom;
  }
  const vcid = getViewerDuoControllerId(room, viewerSocketId, viewerClientId);
  publicRoom.duoSlots = publicRoom.duoSlots?.map((slot) => {
    if (slot.controllerId === vcid) return { ...slot, characterSelected: Boolean(slot.characterId), summonerSkillSelected: Boolean(slot.summonerSkillId) };
    const r = { ...slot }; delete r.characterId; delete r.summonerSkillId;
    return { ...r, characterSelected: Boolean(slot.characterId), summonerSkillSelected: Boolean(slot.summonerSkillId) };
  });
  return publicRoom;
}

export function getViewerDuoControllerId(room: Room, viewerSocketId: string, viewerClientId: string | undefined): string | undefined {
  const player = room.players.find((p) => p.id === viewerSocketId || p.controllerId === viewerSocketId || Boolean(viewerClientId && p.clientId === viewerClientId));
  return player?.controllerId ?? player?.id;
}

export function getPublicRoomList(ctx: ServerContext): RoomListItem[] {
  cleanupExpiredEmptyRooms(ctx);
  return Array.from(ctx.rooms.values())
    .filter((room) => room.phase !== "gameOver" && getRoomOnlineCount(room, ctx) > 0)
    .map((room) => {
      const gameMode = ensureRoomGameMode(room);
      const pc = getRoomParticipantCount(room);
      const mp = getRoomMaxPlayers(room);
      const host = getRoomHost(room);
      return { roomId: room.id, hostName: host?.nickname ?? "未知房主", playerCount: pc, maxPlayers: mp, phase: mapRoomPhase(room.phase), canJoin: room.phase === "lobby" && pc < mp, gameMode };
    });
}

export function broadcastRoom(room: Room, _events: GameEvent[], ctx: ServerContext): void {
  trimBattleLog(room);
  emitRoomToParticipants(room, ctx);
}

export function emitRoomToParticipants(room: Room, ctx: ServerContext): void {
  trimBattleLog(room);
  if (ensureRoomGameMode(room) === "pve_roguelite" && room.phase === "battle") {
    const enemy = room.players.find((p) => p.isBot);
    if (enemy) logRogueliteEnemyBattleState("before_broadcast", enemy);
  }
  for (const [sid, rid] of Array.from(ctx.socketToRoom.entries())) {
    if (rid !== room.id) continue;
    const socket = ctx.io.sockets.sockets.get(sid);
    socket?.emit("gameStateUpdated", serializeRoomForViewer(room, sid, ctx.socketToClient.get(sid)));
  }
}

export function broadcastRoomList(ctx: ServerContext): void {
  ctx.io.emit("roomListUpdated", getPublicRoomList(ctx));
}

export function emitEmoteToRoomPeers(roomId: string, senderSocketId: string, event: PlayerEmoteEvent, ctx: ServerContext): void {
  const targetSocketIds = new Set<string>();
  for (const [sid, rid] of Array.from(ctx.socketToRoom.entries())) { if (rid === roomId) targetSocketIds.add(sid); }
  for (const sid of ctx.io.sockets.adapter.rooms.get(roomId) ?? []) { targetSocketIds.add(sid); }
  targetSocketIds.delete(senderSocketId);
  for (const sid of targetSocketIds) { ctx.io.sockets.sockets.get(sid)?.emit("playerEmote", event); }
}

// =========================================================================
// Room helpers
// =========================================================================

export function getRoom(roomId: string, ctx: ServerContext): Room { const room = ctx.rooms.get(roomId); if (!room) throw new Error("房间不存在"); return room; }
export function getSocketRoom(socketId: string, ctx: ServerContext): Room { const rid = ctx.socketToRoom.get(socketId); if (!rid) throw new Error("你还没有加入房间"); return getRoom(rid, ctx); }

export function ensureRoomGameMode(room: Room): Room["gameMode"] & string {
  const currentMode = room.gameMode ?? room.settings?.gameMode;
  room.gameMode = isGameMode(currentMode) ? currentMode : DEFAULT_GAME_MODE;
  return room.gameMode;
}

export function ensureRoomSettings(room: Room): RoomSettings {
  const gameMode = ensureRoomGameMode(room);
  room.settings = { ...DEFAULT_ROOM_SETTINGS, ...(room.settings ?? {}), gameMode, maxPlayers: gameMode === "duo_2v2" ? DUO_MAX_CONTROLLERS : isSinglePlayerPveGameMode(gameMode) ? 1 : room.settings?.maxPlayers ?? DEFAULT_ROOM_SETTINGS.maxPlayers };
  return room.settings;
}

export function isSinglePlayerPveMode(room: Room): boolean { return isSinglePlayerPveGameMode(ensureRoomGameMode(room)); }

export function getRoomControllers(room: Room): string[] {
  if (ensureRoomGameMode(room) !== "duo_2v2") return room.players.map((p) => p.id);
  const ctrls = new Set<string>(); for (const p of room.players) ctrls.add(p.controllerId ?? p.id); return Array.from(ctrls);
}

export function getRoomHost(room: Room): Room["players"][number] | undefined {
  return room.players.find((p) => p.id === room.hostId || p.controllerId === room.hostId) ?? room.players.find((p) => p.isHost);
}

export function getRoomParticipantCount(room: Room): number {
  if (isSinglePlayerPveMode(room)) return room.players.filter((p) => !p.isBot).length;
  if (ensureRoomGameMode(room) !== "duo_2v2") return room.players.length;
  return getRoomControllers(room).length;
}

export function getRoomMaxPlayers(room: Room): number {
  if (ensureRoomGameMode(room) === "duo_2v2") return DUO_MAX_CONTROLLERS;
  if (isSinglePlayerPveMode(room)) return 1;
  return ensureRoomSettings(room).maxPlayers;
}

export function getRoomOnlineCount(room: Room, ctx: ServerContext): number {
  if (ensureRoomGameMode(room) === "duo_2v2" && room.phase === "battle") {
    const cids = new Set(room.players.map((p) => p.controllerId).filter((c): c is string => Boolean(c)));
    return Array.from(cids).filter((cid) => ctx.socketToRoom.get(cid) === room.id && ctx.io.sockets.sockets.has(cid)).length;
  }
  return room.players.filter((p) => ctx.socketToRoom.get(p.id) === room.id && ctx.socketToClient.get(p.id) === p.clientId && ctx.io.sockets.sockets.has(p.id)).length;
}

// =========================================================================
// Duo / 2V2 slot helpers
// =========================================================================

function duoSlotKey(controllerId: string, slotIndex: 0 | 1): string { return `${controllerId}:${slotIndex}`; }

export function ensureDuoSlots(room: Room): void {
  if (ensureRoomGameMode(room) !== "duo_2v2") return;
  if (room.phase !== "lobby") return;
  const activeIds = new Set(room.players.slice(0, DUO_MAX_CONTROLLERS).map((p) => p.id));
  const existing = new Map<string, DuoCharacterSlot>();
  for (const slot of room.duoSlots ?? []) { if (activeIds.has(slot.controllerId)) existing.set(duoSlotKey(slot.controllerId, slot.slotIndex), slot); }
  const next: DuoCharacterSlot[] = [];
  for (const [pi, player] of room.players.slice(0, DUO_MAX_CONTROLLERS).entries()) {
    const tid: TeamId = pi === 0 ? "A" : "B";
    for (const si of [0, 1] as const) {
      const e = existing.get(duoSlotKey(player.id, si));
      next.push({ controllerId: player.id, teamId: tid, slotIndex: si, characterId: e?.characterId, summonerSkillId: e?.summonerSkillId ?? "lucky_plus_one" });
    }
  }
  room.duoSlots = next;
}

function getDuoSlotOrThrow(room: Room, controllerId: string, slotIndex: 0 | 1): DuoCharacterSlot {
  const slot = room.duoSlots?.find((s) => s.controllerId === controllerId && s.slotIndex === slotIndex);
  if (!slot) throw new Error("2V2 槽位不存在"); return slot;
}

export function chooseDuoSlotCharacter(room: Room, controllerId: string, slotIndex: 0 | 1, characterId: CharacterId): void {
  ensureDuoSlots(room); const slot = getDuoSlotOrThrow(room, controllerId, slotIndex);
  if (!ensureRoomSettings(room).allowDuplicateCharacters) {
    if ((room.duoSlots ?? []).some((s) => !(s.controllerId === controllerId && s.slotIndex === slotIndex) && s.characterId === characterId)) throw new Error("该职业已被其他 2V2 槽位选择");
  }
  slot.characterId = characterId;
}

export function chooseDuoSlotSummonerSkill(room: Room, controllerId: string, slotIndex: 0 | 1, summonerSkillId: SummonerSkillId): void {
  ensureDuoSlots(room); getDuoSlotOrThrow(room, controllerId, slotIndex).summonerSkillId = summonerSkillId;
}

export function updateRoomSettings(room: Room, actorId: string, payload: Partial<RoomSettings>): void {
  const cur = ensureRoomSettings(room);
  if (room.hostId !== actorId) throw new Error("只有房主可以修改房间设置");
  if (room.phase !== "lobby") throw new Error("游戏开始后不能修改房间设置");
  const next: RoomSettings = { ...cur };
  if (payload.maxPlayers !== undefined) {
    if (!Number.isInteger(payload.maxPlayers) || !ROOM_MAX_PLAYERS_OPTIONS.includes(payload.maxPlayers as (typeof ROOM_MAX_PLAYERS_OPTIONS)[number])) throw new Error("最大人数必须在 2 到 8 之间");
    if (payload.maxPlayers < room.players.length) throw new Error("最大人数不能小于当前玩家数");
    next.maxPlayers = payload.maxPlayers;
  }
  if (payload.allowDuplicateCharacters !== undefined) { if (typeof payload.allowDuplicateCharacters !== "boolean") throw new Error("重复职业设置无效"); next.allowDuplicateCharacters = payload.allowDuplicateCharacters; }
  if (payload.gameMode !== undefined) {
    if (!isGameMode(payload.gameMode)) throw new Error("游戏模式设置无效");
    if (payload.gameMode === "duo_2v2" && room.players.length > DUO_MAX_CONTROLLERS) throw new Error("2V2 模式最多支持 2 名玩家");
    if (isSinglePlayerPveGameMode(payload.gameMode) && room.players.filter((p) => !p.isBot).length > 1) throw new Error("单人 PVE 只支持 1 名真实玩家");
    room.gameMode = payload.gameMode; next.gameMode = payload.gameMode;
    if (payload.gameMode === "duo_2v2") next.maxPlayers = DUO_MAX_CONTROLLERS;
    if (isSinglePlayerPveGameMode(payload.gameMode)) next.maxPlayers = 1;
  }
  if (ensureRoomGameMode(room) === "duo_2v2") next.maxPlayers = DUO_MAX_CONTROLLERS;
  if (isSinglePlayerPveMode(room)) next.maxPlayers = 1;
  room.settings = next; ensureDuoSlots(room);
}

export function validateCharacterChoice(room: Room, actorId: string, characterId: CharacterId): void {
  if (ensureRoomSettings(room).allowDuplicateCharacters) return;
  if (room.players.some((p) => p.id !== actorId && p.characterId === characterId)) throw new Error("该职业已被其他玩家选择");
}

// =========================================================================
// Reconnect helpers
// =========================================================================

export function findReconnectPlayer(room: Room, playerId: string | undefined, clientId: string, userId: string | undefined): Room["players"][number] | undefined {
  const players = room.players.filter((p) => !p.isBot);
  if (playerId) { const byId = players.find((p) => p.id === playerId || p.controllerId === playerId); if (byId) return byId; }
  const byClient = players.find((p) => p.clientId === clientId); if (byClient) return byClient;
  if (userId) return players.find((p) => p.userId === userId);
  return undefined;
}

export function findRoomParticipantForSocket(room: Room, socketId: string, clientId: string | undefined): Room["players"][number] | undefined {
  if (ensureRoomGameMode(room) === "duo_2v2") return room.players.find((p) => p.controllerId === socketId || Boolean(clientId && p.clientId === clientId));
  return room.players.find((p) => p.id === socketId || Boolean(clientId && p.clientId === clientId));
}

export function dedupeRoomPlayersForIdentity(room: Room, keptPlayerId: string, clientId: string, userId: string | undefined): void {
  if (ensureRoomGameMode(room) === "duo_2v2" && room.phase !== "lobby") return;
  const removed = new Set<string>();
  room.players = room.players.filter((p) => { if (p.id === keptPlayerId || p.isBot) return true; if (p.clientId === clientId || Boolean(userId && p.userId === userId)) { removed.add(p.id); return false; } return true; });
  if (removed.size === 0) return;
  room.rematchReadyPlayerIds = room.rematchReadyPlayerIds.filter((pid) => !removed.has(pid));
  room.duoSlots = room.duoSlots?.filter((s) => !removed.has(s.controllerId));
  if (removed.has(room.hostId)) room.hostId = room.players[0]?.id ?? room.hostId;
  if (room.activePlayerIndex >= room.players.length) room.activePlayerIndex = 0;
  for (const p of room.players) p.isHost = p.id === room.hostId;
}

export function getRematchPlayerIdForSocket(room: Room, socketId: string, clientId: string | undefined): string {
  if (ensureRoomGameMode(room) !== "duo_2v2") { const p = findRoomParticipantForSocket(room, socketId, clientId); if (!p) throw new Error("玩家不在该房间中"); return p.id; }
  const participant = findRoomParticipantForSocket(room, socketId, clientId);
  const cid = participant?.controllerId ?? (room.controllerTurnOrder?.includes(socketId) ? socketId : undefined);
  if (!cid) throw new Error("玩家不在该房间中"); return cid;
}

export function getRematchRequiredPlayerIds(room: Room): string[] {
  if (isSinglePlayerPveMode(room)) return room.players.filter((p) => !p.isBot).map((p) => p.id);
  if (ensureRoomGameMode(room) !== "duo_2v2") return room.players.map((p) => p.id);
  const ordered = (room.controllerTurnOrder ?? []).filter((cid) => getRoomControllers(room).includes(cid));
  return ordered.length > 0 ? ordered : getRoomControllers(room);
}

// =========================================================================
// Room lifecycle
// =========================================================================

export function refreshRoomEmptySince(room: Room, ctx: ServerContext, now = Date.now()): void {
  if (getRoomOnlineCount(room, ctx) === 0) { room.emptySince ??= now; return; }
  room.emptySince = undefined;
}

export function bindSocketToRoom(socketId: string, clientId: string, roomId: string, ctx: ServerContext): void {
  const prev = ctx.socketToRoom.get(socketId);
  if (prev && prev !== roomId) { ctx.io.sockets.sockets.get(socketId)?.leave(prev); }
  ctx.socketToRoom.set(socketId, roomId); ctx.socketToClient.set(socketId, clientId);
  ctx.io.sockets.sockets.get(socketId)?.join(roomId);
  const room = ctx.rooms.get(roomId); if (room) refreshRoomEmptySince(room, ctx);
}

export function unbindClientSocketsFromRoom(clientId: string, roomId: string, ctx: ServerContext): void {
  for (const [sid, cid] of Array.from(ctx.socketToClient.entries())) { if (cid !== clientId || ctx.socketToRoom.get(sid) !== roomId) continue; ctx.io.sockets.sockets.get(sid)?.leave(roomId); ctx.socketToRoom.delete(sid); ctx.socketToClient.delete(sid); }
}

export function deleteRoomAndUnbindSockets(roomId: string, ctx: ServerContext): void {
  const timer = ctx.botTurnTimers.get(roomId); if (timer) { clearTimeout(timer); ctx.botTurnTimers.delete(roomId); }
  for (const [sid, rid] of Array.from(ctx.socketToRoom.entries())) { if (rid !== roomId) continue; ctx.io.sockets.sockets.get(sid)?.leave(roomId); ctx.socketToRoom.delete(sid); ctx.socketToClient.delete(sid); }
  ctx.rooms.delete(roomId);
}

export function removePlayerFromRoom(socketId: string, ctx: ServerContext): void {
  const roomId = ctx.socketToRoom.get(socketId); if (!roomId) return;
  const clientId = ctx.socketToClient.get(socketId);
  const room = ctx.rooms.get(roomId);
  ctx.io.sockets.sockets.get(socketId)?.leave(roomId);
  ctx.socketToRoom.delete(socketId); ctx.socketToClient.delete(socketId);
  if (!room || !clientId) return;
  if (isSinglePlayerPveMode(room)) { deleteRoomAndUnbindSockets(room.id, ctx); broadcastRoomList(ctx); return; }
  if (shouldUseDuoControllerLeave(room)) {
    const leaving = findRoomParticipantForSocket(room, socketId, clientId);
    const cid = leaving?.controllerId ?? (room.controllerTurnOrder?.includes(socketId) ? socketId : undefined);
    if (!cid) return;
    const nick = getDuoControllerDisplayName(room, cid);
    removeDuoControllerFromRoom(room, cid);
    if (shouldCleanupDuoRoom(room)) { deleteRoomAndUnbindSockets(room.id, ctx); broadcastRoomList(ctx); return; }
    const evt = addEvent(room, "system", `${nick} 离开了房间`); refreshRoomEmptySince(room, ctx); broadcastRoom(room, [evt], ctx); broadcastRoomList(ctx); return;
  }
  const leaving = room.players.find((p) => p.clientId === clientId);
  room.players = room.players.filter((p) => p.clientId !== clientId);
  if (leaving) { room.rematchReadyPlayerIds = room.rematchReadyPlayerIds.filter((pid) => pid !== leaving.id); room.duoSlots = room.duoSlots?.filter((s) => s.controllerId !== leaving.id); }
  if (room.players.length === 0) { ctx.rooms.delete(roomId); broadcastRoomList(ctx); return; }
  if (room.hostId === socketId && leaving) { room.hostId = room.players[0].id; room.players[0].isHost = true; }
  if (room.activePlayerIndex >= room.players.length) room.activePlayerIndex = 0;
  ensureDuoSlots(room);
  const evt = addEvent(room, "system", `${leaving?.nickname ?? "玩家"} 离开了房间`); refreshRoomEmptySince(room, ctx); broadcastRoom(room, [evt], ctx); broadcastRoomList(ctx);
}

export function removeClientFromRooms(clientId: string, ctx: ServerContext): void {
  let changed = false;
  for (const room of Array.from(ctx.rooms.values())) {
    const leaving = room.players.find((p) => p.clientId === clientId); if (!leaving) continue;
    changed = true; unbindClientSocketsFromRoom(clientId, room.id, ctx);
    if (shouldUseDuoControllerLeave(room)) {
      const cid = leaving.controllerId ?? room.controllerTurnOrder?.find((id) => id === leaving.id); if (!cid) continue;
      const nick = getDuoControllerDisplayName(room, cid); removeDuoControllerFromRoom(room, cid);
      if (shouldCleanupDuoRoom(room)) { deleteRoomAndUnbindSockets(room.id, ctx); continue; }
      const evt = addEvent(room, "system", `${nick} 离开了房间`); refreshRoomEmptySince(room, ctx); broadcastRoom(room, [evt], ctx); continue;
    }
    room.players = room.players.filter((p) => p.clientId !== clientId);
    room.rematchReadyPlayerIds = room.rematchReadyPlayerIds.filter((pid) => pid !== leaving.id);
    room.duoSlots = room.duoSlots?.filter((s) => s.controllerId !== leaving.id);
    if (room.players.length === 0) { ctx.rooms.delete(room.id); continue; }
    if (room.hostId === leaving.id) { room.hostId = room.players[0].id; room.players[0].isHost = true; }
    if (room.activePlayerIndex >= room.players.length) room.activePlayerIndex = 0;
    ensureDuoSlots(room);
    const evt = addEvent(room, "system", `${leaving.nickname} 离开了房间`); refreshRoomEmptySince(room, ctx); broadcastRoom(room, [evt], ctx);
  }
  if (changed) broadcastRoomList(ctx);
}

export function markPlayerOffline(socketId: string, ctx: ServerContext): void {
  const roomId = ctx.socketToRoom.get(socketId); if (!roomId) return;
  const room = ctx.rooms.get(roomId);
  ctx.io.sockets.sockets.get(socketId)?.leave(roomId); ctx.socketToRoom.delete(socketId); ctx.socketToClient.delete(socketId);
  if (!room) return;
  const player = room.players.find((p) => p.id === socketId || p.controllerId === socketId); if (!player) return;
  for (const p of room.players) { if (p.id === socketId || p.controllerId === socketId) p.isOnline = false; }
  const evt = addEvent(room, "system", `${player.nickname} 已离线`); refreshRoomEmptySince(room, ctx); broadcastRoom(room, [evt], ctx); broadcastRoomList(ctx);
}

export function cleanupExpiredEmptyRooms(ctx: ServerContext, now = Date.now()): boolean {
  let removed = false;
  for (const [rid, room] of Array.from(ctx.rooms.entries())) {
    refreshRoomEmptySince(room, ctx, now);
    if (room.emptySince !== undefined && now - room.emptySince >= EMPTY_ROOM_TTL_MS && getRoomOnlineCount(room, ctx) === 0) { ctx.rooms.delete(rid); removed = true; }
  }
  return removed;
}

// =========================================================================
// Duo leave helpers
// =========================================================================

export function shouldUseDuoControllerLeave(room: Room): boolean { return ensureRoomGameMode(room) === "duo_2v2" && room.phase !== "lobby"; }
export function shouldCleanupDuoRoom(room: Room): boolean { return shouldUseDuoControllerLeave(room) && getRoomControllers(room).length < DUO_MAX_CONTROLLERS; }

export function getDuoControllerDisplayName(room: Room, controllerId: string): string {
  const player = room.players.find((p) => p.controllerId === controllerId || p.id === controllerId);
  if (!player) return "玩家";
  if (player.slotIndex === undefined) return player.nickname;
  const suffix = ` 角色${player.slotIndex + 1}`;
  return player.nickname.endsWith(suffix) ? player.nickname.slice(0, -suffix.length) : player.nickname;
}

export function removeDuoControllerFromRoom(room: Room, controllerId: string): void {
  const removedCombatantIds = new Set(room.players.filter((p) => p.controllerId === controllerId || p.id === controllerId).map((p) => p.id));
  room.players = room.players.filter((p) => p.controllerId !== controllerId && p.id !== controllerId);
  room.duoSlots = room.duoSlots?.filter((s) => s.controllerId !== controllerId);
  room.controllerTurnOrder = room.controllerTurnOrder?.filter((id) => id !== controllerId);
  room.rematchReadyPlayerIds = room.rematchReadyPlayerIds.filter((id) => id !== controllerId && !removedCombatantIds.has(id));
  if (room.activeControllerId === controllerId) room.activeControllerId = room.controllerTurnOrder?.[0];
  if (room.selectedActorId && removedCombatantIds.has(room.selectedActorId)) room.selectedActorId = undefined;
  if (room.pendingRoll && (removedCombatantIds.has(room.pendingRoll.playerId) || Boolean(room.pendingRoll.targetId && removedCombatantIds.has(room.pendingRoll.targetId)))) room.pendingRoll = undefined;
  if (room.pendingRollDecision && (removedCombatantIds.has(room.pendingRollDecision.actorId) || removedCombatantIds.has(room.pendingRollDecision.targetId))) room.pendingRollDecision = undefined;
  if (room.pendingGuardCheck && removedCombatantIds.has(room.pendingGuardCheck.actorId)) room.pendingGuardCheck = undefined;
  if (room.guardCheckCompletedForActorId && removedCombatantIds.has(room.guardCheckCompletedForActorId)) room.guardCheckCompletedForActorId = undefined;
  for (const p of room.players) { if (p.selectedTargetId && removedCombatantIds.has(p.selectedTargetId)) p.selectedTargetId = undefined; }
  if (room.hostId === controllerId || !room.players.some((p) => p.id === room.hostId || p.controllerId === room.hostId)) room.hostId = getRoomControllers(room)[0] ?? room.players[0]?.id ?? room.hostId;
  for (const p of room.players) p.isHost = p.controllerId === room.hostId || p.id === room.hostId;
}

// =========================================================================
// Rebind helpers
// =========================================================================

export function rebindPlayerReferences(room: Room, previousId: string, nextId: string): void {
  if (previousId === nextId) return;
  if (room.hostId === previousId) room.hostId = nextId;
  if (room.winnerId === previousId) room.winnerId = nextId;
  room.rematchReadyPlayerIds = room.rematchReadyPlayerIds.map((pid) => (pid === previousId ? nextId : pid));
  if (room.pendingRoll?.playerId === previousId) room.pendingRoll.playerId = nextId;
  if (room.pendingRoll?.targetId === previousId) room.pendingRoll.targetId = nextId;
  if (room.pendingRollDecision?.actorId === previousId) room.pendingRollDecision.actorId = nextId;
  if (room.pendingRollDecision?.targetId === previousId) room.pendingRollDecision.targetId = nextId;
  if (room.pendingGuardCheck?.actorId === previousId) room.pendingGuardCheck.actorId = nextId;
  if (room.pendingGuardCheck?.controllerId === previousId) room.pendingGuardCheck.controllerId = nextId;
  if (room.guardCheckCompletedForActorId === previousId) room.guardCheckCompletedForActorId = nextId;
  for (const slot of room.duoSlots ?? []) { if (slot.controllerId === previousId) slot.controllerId = nextId; }
  for (const p of room.players) { if (p.selectedTargetId === previousId) p.selectedTargetId = nextId; }
  for (const e of room.effects) { if (e.sourcePlayerId === previousId) e.sourcePlayerId = nextId; if (e.expiresAtSourceTurnStartPlayerId === previousId) e.expiresAtSourceTurnStartPlayerId = nextId; }
  for (const snap of room.snapshots) {
    if (snap.currentPlayerId === previousId) snap.currentPlayerId = nextId;
    for (const sp of snap.players) { if (sp.id === previousId) sp.id = nextId; if (sp.selectedTargetId === previousId) sp.selectedTargetId = nextId; }
    for (const se of snap.effects) { if (se.sourcePlayerId === previousId) se.sourcePlayerId = nextId; if (se.expiresAtSourceTurnStartPlayerId === previousId) se.expiresAtSourceTurnStartPlayerId = nextId; }
  }
}

export function rebindDuoControllerReferences(room: Room, previousId: string, nextId: string, clientId: string, userId?: string): void {
  if (previousId === nextId) return;
  if (room.hostId === previousId) room.hostId = nextId;
  if (room.activeControllerId === previousId) room.activeControllerId = nextId;
  if (room.pendingGuardCheck?.controllerId === previousId) room.pendingGuardCheck.controllerId = nextId;
  room.controllerTurnOrder = room.controllerTurnOrder?.map((cid) => (cid === previousId ? nextId : cid));
  for (const slot of room.duoSlots ?? []) { if (slot.controllerId === previousId) slot.controllerId = nextId; }
  for (const p of room.players) { if (p.controllerId === previousId || p.clientId === clientId) { p.controllerId = nextId; p.clientId = clientId; if (userId) p.userId = userId; p.isOnline = true; } }
}
