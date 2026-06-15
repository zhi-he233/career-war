import type { Character, CharacterId, Room, RoomSettings, SummonerSkillId } from "@career-war/shared";
type __VLS_Props = {
    room: Room;
    playerId: string;
    characters: Character[];
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    chooseCharacter: (characterId: CharacterId) => any;
    chooseSummonerSkill: (summonerSkillId: SummonerSkillId) => any;
    chooseDuoSlotCharacter: (payload: {
        slotIndex: 0 | 1;
        characterId: CharacterId;
    }) => any;
    chooseDuoSlotSummonerSkill: (payload: {
        slotIndex: 0 | 1;
        summonerSkillId: SummonerSkillId;
    }) => any;
    startGame: () => any;
    updateRoomSettings: (settings: Partial<RoomSettings>) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onChooseCharacter?: ((characterId: CharacterId) => any) | undefined;
    onChooseSummonerSkill?: ((summonerSkillId: SummonerSkillId) => any) | undefined;
    onChooseDuoSlotCharacter?: ((payload: {
        slotIndex: 0 | 1;
        characterId: CharacterId;
    }) => any) | undefined;
    onChooseDuoSlotSummonerSkill?: ((payload: {
        slotIndex: 0 | 1;
        summonerSkillId: SummonerSkillId;
    }) => any) | undefined;
    onStartGame?: (() => any) | undefined;
    onUpdateRoomSettings?: ((settings: Partial<RoomSettings>) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
