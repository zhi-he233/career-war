import { describe, expect, it } from "vitest";
import { resolveSkill } from "./skillOutcomes.js";
import type { CharacterId } from "./types.js";

describe("skill outcome resolver", () => {
  it("keeps boxer as plain dice damage", () => {
    expect(resolve("boxer", 4).damage).toBe(4);
  });

  it("lets gunslinger copy previous final damage only when optional skill is used", () => {
    expect(resolve("gunslinger", 1, { previousFinalDamage: 7 }).damage).toBe(0);

    const outcome = resolve("gunslinger", 1, {
      previousFinalDamage: 7,
      useOptionalCharacterSkill: true
    });

    expect(outcome.damage).toBe(7);
    expect(outcome.skillHints).toContainEqual(expect.objectContaining({ key: "gunslinger-1" }));
  });

  it("handles vampire no-damage and optional lifesteal rolls", () => {
    expect(resolve("vampire", 3).damage).toBe(0);

    const outcome = resolve("vampire", 1, { useOptionalCharacterSkill: true });

    expect(outcome.damage).toBe(1);
    expect(outcome.healing).toBe(2);
  });

  it("marks Zhao Zilong attacks as shield-piercing", () => {
    expect(resolve("zhaoZilong", 5).ignoresShield).toBe(true);
    expect(resolve("zhaoZilong", 4).damage).toBe(0);
  });

  it("applies paladin invincible skill only when optional skill is used", () => {
    const normal = resolve("paladin", 4);
    const optional = resolve("paladin", 4, { useOptionalCharacterSkill: true });

    expect(normal.grantsInvincible).toBe(false);
    expect(optional.grantsInvincible).toBe(true);
    expect(optional.shieldGain).toBe(3);
  });

  it("adds berserker missing hp to damage", () => {
    expect(resolve("berserker", 3, { actorHp: 4, actorMaxHp: 10 }).damage).toBe(9);
  });

  it("resolves stone titan low rolls and optional crush", () => {
    expect(resolve("stone_titan", 4).damage).toBe(0);
    expect(resolve("stone_titan", 6, { useOptionalCharacterSkill: true }).damage).toBe(9);
  });

  it("executes low hp targets for execution assassin", () => {
    const outcome = resolve("execution_assassin", 4, { targetHp: 3 });

    expect(outcome.executesTarget).toBe(true);
  });

  it("validates and resolves self destruct damage", () => {
    const outcome = resolve("self_destructor", 6, {
      actorHp: 6,
      selfDamageAmount: 4,
      useOptionalCharacterSkill: true
    });

    expect(outcome.damage).toBe(8);
    expect(outcome.selfDamage).toBe(4);
    expect(() =>
      resolve("self_destructor", 6, {
        actorHp: 3,
        selfDamageAmount: 4,
        useOptionalCharacterSkill: true
      })
    ).toThrow();
  });

  it("turns war knight roll 3 into optional healing", () => {
    const outcome = resolve("war_knight", 3, { useOptionalCharacterSkill: true });

    expect(outcome.damage).toBe(0);
    expect(outcome.healing).toBe(3);
  });

  it("resolves crescent moon optional strike", () => {
    expect(resolve("crescent_moon", 4).damage).toBe(6);
    expect(resolve("crescent_moon", 6, { useOptionalCharacterSkill: true }).damage).toBe(9);
  });

  it("resolves fire lord marks and burst", () => {
    const mark = resolve("fire_lord", 3, { useOptionalCharacterSkill: true });
    const burst = resolve("fire_lord", 6, { targetFlameMarks: 2, useOptionalCharacterSkill: true });

    expect(mark.damage).toBe(0);
    expect(mark.flameMarksToAdd).toBe(1);
    expect(burst.damage).toBe(6);
    expect(burst.clearsFlameMarks).toBe(true);
  });

  it("lets mountain shield enter guarding with optional skill", () => {
    const outcome = resolve("mountain_shield", 6, { useOptionalCharacterSkill: true });

    expect(outcome.damage).toBe(0);
    expect(outcome.entersGuarding).toBe(true);
  });
});

function resolve(
  characterId: CharacterId,
  roll: number,
  overrides: Partial<{
    previousFinalDamage: number;
    actorHp: number;
    actorMaxHp: number;
    targetHp: number;
    targetMaxHp: number;
    actorGuarding: boolean;
    targetFlameMarks: number;
    useOptionalCharacterSkill: boolean;
    selfDamageAmount: number;
  }> = {}
) {
  return resolveSkill(
    characterId,
    roll,
    overrides.previousFinalDamage ?? 5,
    overrides.actorHp ?? 10,
    overrides.actorMaxHp ?? 10,
    overrides.targetHp ?? 10,
    overrides.targetMaxHp ?? 10,
    overrides.actorGuarding ?? false,
    overrides.targetFlameMarks ?? 0,
    {
      useOptionalCharacterSkill: overrides.useOptionalCharacterSkill,
      selfDamageAmount: overrides.selfDamageAmount
    }
  );
}
