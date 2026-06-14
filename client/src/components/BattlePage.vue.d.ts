import type { Character, GameEvent, PlayerEmoteEvent, RollActionType, RollDecisionChoice, Room, SummonerSkillId } from "@career-war/shared";
type __VLS_Props = {
    room: Room;
    playerId: string;
    characters: Character[];
    lastEvent: GameEvent | null;
    lastEmote: PlayerEmoteEvent | null;
};
declare const __VLS_export: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    selectTarget: (targetId: string) => any;
    rollDice: () => any;
    confirmRollDecision: (payload: {
        roomId: string;
        pendingDecisionId: string;
        actionType: RollActionType;
        skillId?: string;
        decisionId: string;
        choice: RollDecisionChoice;
        summonerSkillId?: SummonerSkillId;
    }) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onSelectTarget?: ((targetId: string) => any) | undefined;
    onRollDice?: (() => any) | undefined;
    onConfirmRollDecision?: ((payload: {
        roomId: string;
        pendingDecisionId: string;
        actionType: RollActionType;
        skillId?: string;
        decisionId: string;
        choice: RollDecisionChoice;
        summonerSkillId?: SummonerSkillId;
    }) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
