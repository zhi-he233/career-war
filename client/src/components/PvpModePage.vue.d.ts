import type { GameMode, RoomListItem } from "@career-war/shared";
type __VLS_Props = {
    inviteRoomId?: string;
    roomList: RoomListItem[];
    initialMode?: GameMode | null;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    joinRoom: (payload: {
        nickname: string;
        roomId: string;
        gameMode?: GameMode;
    }) => any;
    createRoom: (payload: {
        nickname: string;
        gameMode: GameMode;
    }) => any;
    backHome: () => any;
    refreshRoomList: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onJoinRoom?: ((payload: {
        nickname: string;
        roomId: string;
        gameMode?: GameMode;
    }) => any) | undefined;
    onCreateRoom?: ((payload: {
        nickname: string;
        gameMode: GameMode;
    }) => any) | undefined;
    onBackHome?: (() => any) | undefined;
    onRefreshRoomList?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
