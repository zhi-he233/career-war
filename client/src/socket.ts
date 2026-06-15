import { createClientId } from "./utils/id";
import { io } from "socket.io-client";

const CLIENT_ID_KEY = "career-war-client-id";
const socketUrl = import.meta.env.DEV ? (import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001") : undefined;

export const socket = io(socketUrl, {
  autoConnect: true,
  transports: ["websocket", "polling"]
});

export function getClientId(): string {
  const existing = sessionStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const next = createClientId("client");
  sessionStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

export function resetClientId(): string {
  const next = createClientId("client");
  sessionStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

export type Ack<T = Record<string, unknown>> =
  | ({ ok: true } & T)
  | {
      ok: false;
      error: string;
    };
