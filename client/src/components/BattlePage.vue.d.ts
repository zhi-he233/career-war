import type { Character, GameEvent, Room } from "@career-war/shared";
type __VLS_Props = {
    room: Room;
    playerId: string;
    characters: Character[];
    lastEvent: GameEvent | null;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    selectTarget: (targetId: string) => any;
    rollDice: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onSelectTarget?: ((targetId: string) => any) | undefined;
    onRollDice?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
