/** Shared type contracts for battle sub-components.
 *  Each interface describes pure display data — no socket, no game logic. */
export interface SeatViewModel {
    playerId: string;
    playerNumber: number;
    nickname: string;
    isDead: boolean;
    isActive: boolean;
    isSelectable: boolean;
    isSelected: boolean;
    isHit: boolean;
    isHealed: boolean;
    isBlocked: boolean;
    isSelf?: boolean;
    avatarEmoji: string;
    avatarSrc?: string;
    spriteSrc?: string;
    statusText: string;
    hp: number;
    maxHp: number;
    shield: number;
    lastRollText: string;
    characterName: string;
    seatTags: string[];
    attackableLabel: string;
    targetLabel: string;
    isHost: boolean;
    hasInvincible: boolean;
    damageEffect?: {
        key: string;
        value: number;
    };
    healEffect?: {
        key: string;
        value: number;
    };
    noEffect?: {
        key: string;
    };
    emote?: {
        key: string;
        emoji: string;
    };
}
export interface DicePanelProps {
    diceValues: string[];
    diceKey: string;
    rollPhase: "idle" | "fast" | "slow" | "pause" | "reveal";
    isReady: boolean;
    hasRolled: boolean;
    title: string;
    detail?: string;
    skillText: string;
    skillHints: Array<{
        id: string;
        text: string;
        valueText?: string;
    }>;
    showRollButton: boolean;
    canRoll: boolean;
    rollButtonText: string;
}
export interface ActionSlotVM {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    requiresSelfDamage: boolean;
    settling: boolean;
}
export interface SelfDestructOption {
    amount: number;
    damage: number;
    disabled: boolean;
}
export interface SelfPanelVM {
    avatarEmoji: string;
    avatarSrc?: string;
    spriteSrc?: string;
    nickname: string;
    characterName: string;
    hp: number;
    maxHp: number;
    hpPercent: number;
    shield: number;
    isDead: boolean;
    isCurrentTurn: boolean;
    statusTags: string[];
    skillHintText: string;
    lastRollText: string;
    damageEffect?: {
        key: string;
        value: number;
    };
    healEffect?: {
        key: string;
        value: number;
    };
    noEffect?: {
        key: string;
    };
    emote?: {
        key: string;
        emoji: string;
    };
}
export interface RogueliteBossStateChip {
    text: string;
    kind: "normal" | "enraged" | "guarding" | "broken";
}
export interface RoguelitePerkVM {
    id: string;
    name: string;
    level: number;
    description: string;
    category: "growth" | "skill" | "boss";
}
export interface RogueliteRewardOptionVM {
    id: string;
    name: string;
    description: string;
    isBoss: boolean;
    rarity?: "common" | "rare" | "epic" | "legendary";
    tags?: string[];
    icon?: string;
    disabled?: boolean;
}
export interface RoguelitePanelVM {
    enabled: boolean;
    stage: number;
    round: number;
    stageType: "normal" | "elite" | "boss";
    stageTypeLabel: string;
    phaseText: string;
    boss?: {
        name: string;
        typeLabel: string;
        hp: number;
        maxHp: number;
        shield: number;
        skills: string[];
        stateChips: RogueliteBossStateChip[];
    };
    enemy?: {
        name: string;
        typeLabel: string;
        hpBonus: number;
        shieldBonus: number;
        damageBonus: number;
        description?: string;
        skills: string[];
    };
    fatigue?: {
        battleRound: number;
        bonus: number;
    };
    perks: {
        growth: RoguelitePerkVM[];
        skills: RoguelitePerkVM[];
        boss: RoguelitePerkVM[];
    };
    rewardPhase?: {
        isBoss: boolean;
        title: string;
        hint: string;
        summary?: {
            defeatedName: string;
            postBattleHeal: number;
            hpAfterHeal: number;
            maxHp: number;
            isBoss: boolean;
        };
        options: RogueliteRewardOptionVM[];
    };
    continuePhase?: {
        hint: string;
        nextStage: number;
    };
    resources?: {
        fateTokens?: {
            current: number;
            max: number;
        };
        lowRollCharge?: number;
        consecutiveLowRolls?: {
            current: number;
            max: number;
        };
        shieldOverloadUsed?: boolean;
    };
    enemyTraits?: string[];
}
