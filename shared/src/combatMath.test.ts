import { describe, expect, it } from "vitest";
import {
  applyDamageToPlayer,
  applyDirectDamageToPlayer,
  applyHealingToPlayer,
  getCombatArmor
} from "./combatMath.js";
import type { Player } from "./types.js";

describe("combat math", () => {
  it("applies armor before shield and hp damage", () => {
    const target = makePlayer({ hp: 10, shield: 3 });

    const result = applyDamageToPlayer(target, 8, { armor: 2 });

    expect(result.damage).toBe(6);
    expect(result.shieldBlocked).toBe(3);
    expect(result.hpDamage).toBe(3);
    expect(result.player.hp).toBe(7);
    expect(result.player.shield).toBe(0);
    expect(result.player.isDead).toBe(false);
    expect(target.hp).toBe(10);
    expect(target.shield).toBe(3);
  });

  it("can bypass shield when the caller supplies zero armor", () => {
    const target = makePlayer({ hp: 10, shield: 5 });

    const result = applyDamageToPlayer(target, 4, { armor: 0, ignoresShield: true });

    expect(result.damage).toBe(4);
    expect(result.shieldBlocked).toBe(0);
    expect(result.hpDamage).toBe(4);
    expect(result.player.hp).toBe(6);
    expect(result.player.shield).toBe(5);
  });

  it("marks the player dead when damage drops hp to zero", () => {
    const target = makePlayer({ hp: 3 });

    const result = applyDirectDamageToPlayer(target, 5);

    expect(result.hpDamage).toBe(5);
    expect(result.player.hp).toBe(0);
    expect(result.player.isDead).toBe(true);
    expect(target.isDead).toBe(false);
  });

  it("heals missing hp and can convert overflow to shield", () => {
    const player = makePlayer({ hp: 8, maxHp: 10, shield: 1 });

    const result = applyHealingToPlayer(player, 5, { overflowToShield: true });

    expect(result.hpGain).toBe(2);
    expect(result.shieldGain).toBe(3);
    expect(result.player.hp).toBe(10);
    expect(result.player.shield).toBe(4);
    expect(player.hp).toBe(8);
    expect(player.shield).toBe(1);
  });

  it("computes character, perk, boss, and group armor", () => {
    const target = makePlayer({
      characterId: "mountain_shield",
      guarding: true,
      hp: 4,
      maxHp: 10,
      shield: 2,
      rogueliteArmorBonus: 1,
      rogueliteLowHpArmor: 2,
      roguelitePerkStacks: { sturdy_bulwark: 1 },
      rogueliteBossId: "boss_shield_guard",
      rogueliteBossState: { guardReduction: 2 }
    });

    const armor = getCombatArmor(target, { hasMountainShieldGroupArmor: true });

    expect(armor).toBe(11);
  });

  it("applies roguelite armor piercing from the active attacker context", () => {
    const target = makePlayer({ characterId: "war_knight", rogueliteArmorBonus: 2 });
    const attacker = makePlayer({
      isBot: true,
      hp: 4,
      maxHp: 10,
      rogueliteBossId: "elite_armor_piercing"
    });

    const armor = getCombatArmor(target, {
      gameMode: "pve_roguelite",
      activeAttacker: attacker
    });

    expect(armor).toBe(1);
  });
});

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "player-1",
    clientId: "client-1",
    nickname: "Tester",
    isHost: false,
    isOnline: true,
    hp: 10,
    maxHp: 10,
    shield: 0,
    zhaoZilongHitCount: 0,
    flameMarks: 0,
    guarding: false,
    isDead: false,
    ...overrides
  };
}
