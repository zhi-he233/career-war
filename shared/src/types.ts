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
  | "execution_assassin";

export type RoomPhase = "lobby" | "battle" | "gameOver";
export type RoomListStatus = "waiting" | "playing" | "ended";
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
  summonerSkillCooldown?: number;
  hp: number;
  maxHp: number;
  shield: number;
  zhaoZilongHitCount?: number;
  isDead: boolean;
  selectedTargetId?: string;
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

export interface RoomSettings {
  maxPlayers: number;
  allowDuplicateCharacters: boolean;
}

export type CharacterReactionSkillId = "gunslinger_barrage" | "vampire_blood_rite" | "paladin_invincible";
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
  winnerId?: string;
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
}

export interface RollResult {
  room: Room;
  events: GameEvent[];
  gameOver?: {
    winnerId: string;
    winnerName: string;
  };
}
