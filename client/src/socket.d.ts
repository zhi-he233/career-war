export declare const socket: import("socket.io-client").Socket<import("@socket.io/component-emitter").DefaultEventsMap, import("@socket.io/component-emitter").DefaultEventsMap>;
export declare function getClientId(): string;
export declare function resetClientId(): string;
export type Ack<T = Record<string, unknown>> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
