import type { Character, GameEvent, PlayerEmoteEvent, Room } from "@career-war/shared";
type __VLS_Props = {
    room: Room;
    playerId: string;
    characters: Character[];
    lastEvent: GameEvent | null;
    lastEmote: PlayerEmoteEvent | null;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    rollDice: () => any;
    selectTarget: (targetId: string) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onRollDice?: (() => any) | undefined;
    onSelectTarget?: ((targetId: string) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
