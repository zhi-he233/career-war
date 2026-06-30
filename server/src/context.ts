import type { Server } from "socket.io";
import type { Room } from "@career-war/shared";

/**
 * Central type bundling all mutable server state and the Socket.IO instance.
 * Passed to every handler and service module — no global variables.
 */
export interface ServerContext {
  rooms: Map<string, Room>;
  socketToRoom: Map<string, string>;
  socketToClient: Map<string, string>;
  emoteCooldowns: Map<string, number>;
  botTurnTimers: Map<string, ReturnType<typeof setTimeout>>;
  allowedEmoteIds: Set<string>;

  io: Server;

  /** Engine context injected into shared game-logic functions. */
  now: () => number;
  makeId: () => string;
  rollDice: () => number;
}
