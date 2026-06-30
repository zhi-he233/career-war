import type { Server } from "socket.io";

/** Standard acknowledgement callback for all socket events. */
export type Ack = (
  response: { ok: true; [key: string]: unknown } | { ok: false; error: string }
) => void;

/**
 * Central error-handling wrapper for socket event handlers.
 * On success replies with `{ ok: true, ...result }`.
 * On failure emits an `errorMessage` event to the requesting socket
 * and replies with `{ ok: false, error }`.
 */
export function handle(
  socketId: string,
  io: Server,
  reply: Ack | undefined,
  fn: () => Record<string, unknown>
): void {
  try {
    const result = fn();
    reply?.({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    io.to(socketId).emit("errorMessage", message);
    reply?.({ ok: false, error: message });
  }
}
