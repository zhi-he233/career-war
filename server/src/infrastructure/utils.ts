import { characterList, type CharacterId, type EmoteId, type GameMode, type SummonerSkillId, type RollDecisionChoice } from "@career-war/shared";
import type { Room, RoomListStatus } from "@career-war/shared";
import { MAX_BATTLE_LOG } from "../constants.js";

// ---------------------------------------------------------------------------
// Sanitisation helpers
// ---------------------------------------------------------------------------

export function sanitizeNickname(value: string | undefined): string {
  const nickname = (value ?? "").trim().slice(0, 12);
  if (!nickname) throw new Error("请输入昵称");
  return nickname;
}

export function sanitizeClientId(value: string | undefined): string {
  const clientId = (value ?? "").trim().slice(0, 64);
  if (!clientId) throw new Error("缺少玩家标识");
  return clientId;
}

export function sanitizeOptionalId(value: unknown): string | undefined {
  const id = typeof value === "string" ? value.trim().slice(0, 64) : "";
  return id || undefined;
}

// ---------------------------------------------------------------------------
// Room ID generation
// ---------------------------------------------------------------------------

export function createRoomId(existingIds: Map<string, unknown>): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const id = Array.from({ length: 4 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join("");
    if (!existingIds.has(id)) return id;
  }
  return crypto.randomUUID().slice(0, 4).toUpperCase();
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isSummonerSkillId(value: unknown): value is SummonerSkillId {
  return (
    value === "lucky_plus_one" ||
    value === "first_aid" ||
    value === "iron_wall" ||
    value === "fate_reroll" ||
    value === "last_stand"
  );
}

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && characterList.some((c) => c.id === value);
}

export function isRollDecisionChoice(value: unknown): value is RollDecisionChoice {
  return (
    value === "normal_attack" ||
    value === "settle" ||
    value === "character_skill" ||
    value === "summoner_skill" ||
    value === "roguelite_skill"
  );
}

export function isGameMode(value: unknown): value is GameMode {
  return (
    value === "classic" ||
    value === "duo_2v2" ||
    value === "pve_1v1" ||
    value === "pve_roguelite"
  );
}

export function isSinglePlayerPveGameMode(gameMode: GameMode): boolean {
  return gameMode === "pve_1v1" || gameMode === "pve_roguelite";
}

// ---------------------------------------------------------------------------
// Room helpers (pure, no context needed)
// ---------------------------------------------------------------------------

export function mapRoomPhase(phase: Room["phase"]): RoomListStatus {
  if (phase === "lobby") return "waiting";
  if (
    phase === "battle" ||
    phase === "reward" ||
    phase === "roguelite_event" ||
    phase === "roguelite_shop" ||
    phase === "roguelite_rest" ||
    phase === "roguelite_continue"
  )
    return "playing";
  return "ended";
}

export function trimBattleLog(room: Room): void {
  if (room.battleLog.length > MAX_BATTLE_LOG) {
    room.battleLog.length = MAX_BATTLE_LOG;
  }
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

export function pickOne<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}
