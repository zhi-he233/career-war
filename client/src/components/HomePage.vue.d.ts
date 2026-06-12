type __VLS_Props = {
    inviteRoomId?: string;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    createRoom: (nickname: string) => any;
    joinRoom: (payload: {
        nickname: string;
        roomId: string;
    }) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onCreateRoom?: ((nickname: string) => any) | undefined;
    onJoinRoom?: ((payload: {
        nickname: string;
        roomId: string;
    }) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
