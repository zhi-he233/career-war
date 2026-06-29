export interface RogueliteDicePerkInput {
    roll: number;
    isRoguelite: boolean;
    actorIsBot: boolean;
    hasFateTokens?: boolean;
    fateTokens?: number;
    hasLuckyFloor?: boolean;
    consecutiveLowRolls?: number;
    hasLowRollCharge?: boolean;
    lowRollCharge?: number;
    lowRollDefenseShield?: number;
    shield?: number;
}
export interface RogueliteDicePerkResult {
    applied: boolean;
    roll: number;
    fateTokens?: number;
    consecutiveLowRolls?: number;
    lowRollCharge?: number;
    shield?: number;
    messages: string[];
}
export declare function resolveRogueliteDicePerks(input: RogueliteDicePerkInput): RogueliteDicePerkResult;
