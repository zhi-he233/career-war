import type { CharacterId, GameEvent, Player, Room, RollResult } from "./types.js";
export type DiceRoller = () => number;
export type IdFactory = () => string;
interface EngineContext {
    now: () => number;
    makeId: IdFactory;
    rollDice: DiceRoller;
}
export declare function createPlayer(id: string, clientId: string, nickname: string, isHost: boolean): Player;
export declare function chooseCharacter(room: Room, playerId: string, characterId: CharacterId): GameEvent;
export declare function canStartGame(room: Room): {
    ok: true;
} | {
    ok: false;
    reason: string;
};
export declare function startGame(room: Room, ctx: Pick<EngineContext, "now" | "makeId">): GameEvent[];
export declare function resetToLobbyForRematch(room: Room): void;
export declare function selectTarget(room: Room, playerId: string, targetId: string): void;
export declare function rollForActivePlayer(room: Room, playerId: string, ctx: EngineContext): RollResult;
export declare function serializeRoom(room: Room): Room;
export {};
