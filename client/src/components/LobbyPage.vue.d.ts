import type { Character, CharacterId, Room } from "@career-war/shared";
type __VLS_Props = {
    room: Room;
    playerId: string;
    characters: Character[];
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    chooseCharacter: (characterId: CharacterId) => any;
    startGame: () => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onChooseCharacter?: ((characterId: CharacterId) => any) | undefined;
    onStartGame?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
