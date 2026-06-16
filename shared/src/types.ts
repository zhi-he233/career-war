export type CharacterId =
  | "boxer"
  | "gunslinger"
  | "vampire"
  | "zhaoZilong"
  | "assassin"
  | "paladin"
  | "berserker"
  | "stone_titan"
  | "fearless_assassin"
  | "execution_assassin"
  | "self_destructor"
  | "war_knight"
  | "crescent_moon"
  | "fire_lord"
  | "mountain_shield";

export type RoomPhase = "lobby" | "battle" | "gameOver";
export type RoomListStatus = "waiting" | "playing" | "ended";
export type GameMode = "classic" | "duo_2v2";
export type TeamId = "A" | "B";
export type CharacterDifficulty = "simple" | "normal" | "complex" | "expert";
export type CharacterRole = "attack" | "defense" | "healing" | "burst" | "special";

export const EMOTE_IDS = ["cry", "surprise", "taunt", "angry", "like", "question"] as const;
export type EmoteId = (typeof EMOTE_IDS)[number];

export interface Character {
  id: CharacterId;
  name: string;
  maxHp: number;
  description: string[];
  difficulty?: CharacterDifficulty;
  role?: CharacterRole;
  tags?: string[];
  shortDescription?: string;
  fullDescription?: string[];
  isImplemented?: boolean;
  isHidden?: boolean;
}

export interface Effect {
  id: string;
  type: "invincible";
  sourcePlayerId: string;
  expiresAtSourceTurnStartPlayerId: string;
}

export interface Player {
  id: string;
  clientId: string;
  nickname: string;
  isHost: boolean;
  isOnline: boolean;
  characterId?: CharacterId;
  summonerSkillId?: SummonerSkillId;
  characterSelected?: boolean;
  summonerSkillSelected?: boolean;
  summonerSkillCooldown?: number;
  hp: number;
  maxHp: number;
  shield: number;
  zhaoZilongHitCount?: number;
  flameMarks?: number;
  guarding?: boolean;
  isDead: boolean;
  selectedTargetId?: string;
  controllerId?: string;
  teamId?: TeamId;
  slotIndex?: 0 | 1;
}

export interface GameEvent {
  id: string;
  createdAt: number;
  type:
    | "system"
    | "chooseCharacter"
    | "startGame"
    | "turn"
    | "roll"
    | "guardCheck"
    | "skill"
    | "damage"
    | "heal"
    | "death"
    | "victory";
  message: string;
  playerId?: string;
  targetId?: string;
  dice?: number[];
  damage?: number;
  healing?: number;
}

export interface PlayerEmoteEvent {
  roomId: string;
  playerId: string;
  emoteId: EmoteId;
  createdAt: number;
}

export type CharacterHighlightType = "big_damage" | "big_heal" | "streak";

export interface CharacterHighlight {
  id: string;
  type: CharacterHighlightType;
  title: string;
  valueText?: string;
  actorId: string;
  rollId?: string;
}

export interface SkillHint {
  id: string;
  actorId: string;
  text: string;
  valueText?: string;
  rollId?: string;
}

export interface DuoCharacterSlot {
  controllerId: string;
  teamId: TeamId;
  slotIndex: 0 | 1;
  characterId?: CharacterId;
  summonerSkillId?: SummonerSkillId;
  characterSelected?: boolean;
  summonerSkillSelected?: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  allowDuplicateCharacters: boolean;
  gameMode?: GameMode;
}

export type CharacterReactionSkillId =
  | "gunslinger_copy_damage"
  | "gunslinger_barrage"
  | "vampire_life_steal"
  | "vampire_blood_rite"
  | "zhao_zilong_hold"
  | "paladin_invincible"
  | "self_destruct"
  | "war_knight_heal"
  | "crescent_moon_strike"
  | "fire_lord_spark"
  | "fire_lord_burst"
  | "stone_titan_crush"
  | "mountain_shield_guard";
export type SummonerSkillId = "lucky_plus_one" | "first_aid" | "iron_wall" | "fate_reroll" | "last_stand";
export type RollActionType = "normal_attack" | "character_skill" | "summoner_skill";
export type RollDecisionChoice = RollActionType | "settle";

export interface RollDecisionAvailableAction {
  id: RollActionType;
  label: string;
  enabled: boolean;
  description: string;
  reason?: string;
  skillId?: CharacterReactionSkillId | SummonerSkillId;
  skillName?: string;
  requiresSelfDamageAmount?: boolean;
}

export interface PendingRollDecision {
  id: string;
  actorId: string;
  targetId: string;
  rawRoll: number;
  currentRoll: number;
  phase: "waiting_reaction";
  canUseCharacterSkill: boolean;
  availableCharacterSkillId?: CharacterReactionSkillId;
  availableCharacterSkillName?: string;
  availableSummonerSkillId?: SummonerSkillId;
  availableSummonerSkillName?: string;
  usedSummonerSkillId?: SummonerSkillId;
  availableActions?: RollDecisionAvailableAction[];
  rollEventId: string;
  createdAt: number;
  isFollowUpRoll?: boolean;
}

export type PendingRollType = "gunslinger_bonus_damage" | "vampire_bonus_heal" | string;

export interface PendingRoll {
  playerId: string;
  type: PendingRollType;
  targetId?: string;
  sourceRoll: number;
  characterId: CharacterId;
  message: string;
}

export interface PendingGuardCheck {
  actorId: string;
  controllerId?: string;
}

export interface ActionSnapshot {
  id: string;
  createdAt: number;
  currentPlayerId: string;
  players: Player[];
  effects: Effect[];
  activePlayerIndex: number;
  previousFinalDamage: number;
}

export interface Room {
  id: string;
  hostId: string;
  phase: RoomPhase;
  gameMode?: GameMode;
  settings: RoomSettings;
  players: Player[];
  rematchReadyPlayerIds: string[];
  activePlayerIndex: number;
  effects: Effect[];
  battleLog: GameEvent[];
  snapshots: ActionSnapshot[];
  previousFinalDamage: number;
  emptySince?: number;
  pendingRoll?: PendingRoll;
  pendingRollDecision?: PendingRollDecision;
  pendingGuardCheck?: PendingGuardCheck;
  guardCheckCompletedForActorId?: string;
  winnerId?: string;
  activeControllerId?: string;
  selectedActorId?: string;
  winnerTeamId?: TeamId;
  controllerTurnOrder?: string[];
  duoSlots?: DuoCharacterSlot[];
  highlight?: CharacterHighlight;
  skillHints?: SkillHint[];
}

export interface PublicRoomState extends Room {
  snapshots: ActionSnapshot[];
}

export interface RoomListItem {
  roomId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  phase: RoomListStatus;
  canJoin: boolean;
  gameMode?: GameMode;
}

export interface RollResult {
  room: Room;
  events: GameEvent[];
  gameOver?: {
    winnerId: string;
    winnerName: string;
  };
}
