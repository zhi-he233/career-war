import type { GameMode, RoomSettings } from "@career-war/shared";

// ---------------------------------------------------------------------------
// Battle / emote limits
// ---------------------------------------------------------------------------
export const MAX_BATTLE_LOG = 80;
export const EMOTE_COOLDOWN_MS = 1000;

// ---------------------------------------------------------------------------
// Room lifecycle
// ---------------------------------------------------------------------------
export const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000;
export const ROOM_CLEANUP_INTERVAL_MS = 30 * 1000;
export const ROOM_MAX_PLAYERS_OPTIONS = [2, 3, 4, 5, 6, 7, 8] as const;

// ---------------------------------------------------------------------------
// Game modes
// ---------------------------------------------------------------------------
export const DEFAULT_GAME_MODE: GameMode = "classic";
export const DUO_MAX_CONTROLLERS = 2;

// ---------------------------------------------------------------------------
// PVE bot identity
// ---------------------------------------------------------------------------
export const PVE_BOT_ID = "bot";
export const PVE_BOT_CLIENT_ID = "bot";
export const PVE_BOT_NICKNAME = "AI";

// ---------------------------------------------------------------------------
// Editor gating
// ---------------------------------------------------------------------------
export const EDITOR_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.ENABLE_EDITOR === "true";
export const EDITOR_ADMIN_USERS = new Set(
  (process.env.EDITOR_ADMIN_USERS ?? "swh")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
);

// ---------------------------------------------------------------------------
// Default room settings
// ---------------------------------------------------------------------------
export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  allowDuplicateCharacters: true,
  gameMode: DEFAULT_GAME_MODE,
};

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------
export const PORT = Number(process.env.PORT ?? 3001);

// ---------------------------------------------------------------------------
// Roguelite reward -> perk mapping
// ---------------------------------------------------------------------------
export const REWARD_TO_PERK: Record<string, { perkId: string; levels: number }> = {
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
  lucky_floor: { perkId: "lucky_floor", levels: 1 },
};
