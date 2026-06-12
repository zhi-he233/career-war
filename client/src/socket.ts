import { io } from "socket.io-client";

const CLIENT_ID_KEY = "career-war-client-id";

export const socket = io(import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001", {
  autoConnect: true,
  transports: ["websocket", "polling"]
});

export function getClientId(): string {
  const existing = sessionStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  sessionStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

export function resetClientId(): string {
  const next = crypto.randomUUID();
  sessionStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

export type Ack<T = Record<string, unknown>> =
  | ({ ok: true } & T)
  | {
      ok: false;
      error: string;
    };
