import type { Character, GameEvent, PlayerEmoteEvent, RollActionType, RollDecisionChoice, Room, SummonerSkillId } from "@career-war/shared";
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
    selectActor: (actorId: string) => any;
    confirmRollDecision: (payload: {
        roomId: string;
        pendingDecisionId: string;
        actionType: RollActionType;
        skillId?: string;
        decisionId: string;
        choice: RollDecisionChoice;
        summonerSkillId?: SummonerSkillId;
        selfDamageAmount?: number;
    }) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    onRollDice?: (() => any) | undefined;
    onSelectTarget?: ((targetId: string) => any) | undefined;
    onSelectActor?: ((actorId: string) => any) | undefined;
    onConfirmRollDecision?: ((payload: {
        roomId: string;
        pendingDecisionId: string;
        actionType: RollActionType;
        skillId?: string;
        decisionId: string;
        choice: RollDecisionChoice;
        summonerSkillId?: SummonerSkillId;
        selfDamageAmount?: number;
    }) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
declare const _default: typeof __VLS_export;
export default _default;
