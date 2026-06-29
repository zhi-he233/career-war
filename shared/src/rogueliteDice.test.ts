import { describe, expect, it } from "vitest";
import { resolveRogueliteDicePerks } from "./rogueliteDice.js";

describe("roguelite dice perks", () => {
  it("does nothing outside human roguelite turns", () => {
    expect(resolveRogueliteDicePerks({ roll: 2, isRoguelite: false, actorIsBot: false })).toEqual({
      applied: false,
      roll: 2,
      messages: []
    });
    expect(resolveRogueliteDicePerks({ roll: 2, isRoguelite: true, actorIsBot: true })).toEqual({
      applied: false,
      roll: 2,
      messages: []
    });
  });

  it("adds fate tokens on low rolls and spends three tokens to boost the roll", () => {
    const result = resolveRogueliteDicePerks({
      roll: 2,
      isRoguelite: true,
      actorIsBot: false,
      hasFateTokens: true,
      fateTokens: 2
    });

    expect(result.roll).toBe(3);
    expect(result.fateTokens).toBe(0);
    expect(result.messages).toHaveLength(2);
  });

  it("does not accumulate fate tokens without the fate token perk", () => {
    const result = resolveRogueliteDicePerks({
      roll: 2,
      isRoguelite: true,
      actorIsBot: false,
      fateTokens: 2
    });

    expect(result.roll).toBe(2);
    expect(result.fateTokens).toBeUndefined();
    expect(result.messages).toHaveLength(0);
  });

  it("resolves lucky floor after fate token changes", () => {
    const result = resolveRogueliteDicePerks({
      roll: 1,
      isRoguelite: true,
      actorIsBot: false,
      hasFateTokens: true,
      hasLuckyFloor: true,
      consecutiveLowRolls: 1
    });

    expect(result.roll).toBe(4);
    expect(result.consecutiveLowRolls).toBe(0);
  });

  it("stores low-roll charge using the final roll", () => {
    const result = resolveRogueliteDicePerks({
      roll: 3,
      isRoguelite: true,
      actorIsBot: false,
      hasLowRollCharge: true,
      lowRollCharge: 2
    });

    expect(result.lowRollCharge).toBe(3);
  });

  it("grants low-roll defense shield only on final rolls one or two", () => {
    const result = resolveRogueliteDicePerks({
      roll: 2,
      isRoguelite: true,
      actorIsBot: false,
      lowRollDefenseShield: 3,
      shield: 4
    });

    expect(result.shield).toBe(7);
  });
});
