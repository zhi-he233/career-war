import type { GameMode, Player } from "./types.js";
export interface ArmorContext {
    gameMode?: GameMode;
    activeAttacker?: Player;
    hasMountainShieldGroupArmor?: boolean;
}
export interface DamageOptions {
    armor?: number;
    ignoresShield?: boolean;
}
export interface DamageResult {
    player: Player;
    damage: number;
    hpDamage: number;
    shieldBlocked: number;
}
export interface HealingOptions {
    overflowToShield?: boolean;
}
export interface HealingResult {
    player: Player;
    hpGain: number;
    shieldGain: number;
}
export declare function getCombatArmor(target: Player, context?: ArmorContext): number;
export declare function applyDamageToPlayer(target: Player, incomingDamage: number, options?: DamageOptions): DamageResult;
export declare function applyDirectDamageToPlayer(target: Player, incomingDamage: number): DamageResult;
export declare function applyHealingToPlayer(player: Player, amount: number, options?: HealingOptions): HealingResult;
export declare function applyHpHealingToPlayer(player: Player, amount: number): HealingResult;
