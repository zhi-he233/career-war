import type { RoomListItem } from "@career-war/shared";
type __VLS_Props = {
    inviteRoomId?: string;
    roomList: RoomListItem[];
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    joinRoom: (payload: {
        nickname: string;
        roomId: string;
    }) => any;
    createRoom: (nickname: string) => any;
    refreshRoomList: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onJoinRoom?: ((payload: {
        nickname: string;
        roomId: string;
    }) => any) | undefined;
    onCreateRoom?: ((nickname: string) => any) | undefined;
    onRefreshRoomList?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
