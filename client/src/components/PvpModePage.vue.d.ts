import type { GameMode, RoomListItem } from "@career-war/shared";
type __VLS_Props = {
    inviteRoomId?: string;
    roomList: RoomListItem[];
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    backHome: () => any;
    createRoom: (payload: {
        nickname: string;
        gameMode: GameMode;
    }) => any;
    joinRoom: (payload: {
        nickname: string;
        roomId: string;
        gameMode?: GameMode;
    }) => any;
    refreshRoomList: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onBackHome?: (() => any) | undefined;
    onCreateRoom?: ((payload: {
        nickname: string;
        gameMode: GameMode;
    }) => any) | undefined;
    onJoinRoom?: ((payload: {
        nickname: string;
        roomId: string;
        gameMode?: GameMode;
    }) => any) | undefined;
    onRefreshRoomList?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
