import type { Player } from "./types.js";
export declare function getNextAlivePlayerIndex(players: Pick<Player, "isDead">[], activePlayerIndex: number): number;
export declare function getNextDuoControllerId(controllerTurnOrder: readonly string[] | undefined, activeControllerId: string | undefined): string | undefined;
