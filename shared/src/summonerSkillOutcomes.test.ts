import { describe, expect, it } from "vitest";
import {
  applyLastStandOutcome,
  createFirstAidOutcome,
  createIronWallOutcome,
  createNonAttackSummonerSkillOutcome,
  createSummonerRollChange
} from "./summonerSkillOutcomes.js";
import type { SkillOutcome } from "./skillOutcomes.js";

describe("summoner skill outcomes", () => {
  it("turns first aid into healing without damage", () => {
    const outcome = createFirstAidOutcome(4);

    expect(outcome.damage).toBe(0);
    expect(outcome.healing).toBe(4);
    expect(outcome.dice).toEqual([4]);
  });

  it("turns iron wall into shield without damage", () => {
    const outcome = createIronWallOutcome(5);

    expect(outcome.damage).toBe(0);
    expect(outcome.shieldGain).toBe(5);
    expect(outcome.dice).toEqual([5]);
  });

  it("adds last stand damage and self damage without mutating the base outcome", () => {
    const base = makeOutcome({ damage: 3, skillMessages: ["base"] });

    const outcome = applyLastStandOutcome(base);

    expect(outcome.damage).toBe(5);
    expect(outcome.selfDamage).toBe(2);
    expect(outcome.skillMessages).toHaveLength(2);
    expect(base.damage).toBe(3);
    expect(base.selfDamage).toBe(0);
    expect(base.skillMessages).toEqual(["base"]);
  });

  it("maps non-attack summoner skills and ignores attack modifiers", () => {
    expect(createNonAttackSummonerSkillOutcome("first_aid", 2)?.healing).toBe(2);
    expect(createNonAttackSummonerSkillOutcome("iron_wall", 3)?.shieldGain).toBe(3);
    expect(createNonAttackSummonerSkillOutcome("last_stand", 3)).toBeUndefined();
  });

  it("resolves summoner roll changes for lucky dice and fate reroll", () => {
    expect(createSummonerRollChange("lucky_plus_one", 5)).toEqual({
      nextRoll: 6,
      message: "发动幸运骰，骰点变为 6 点"
    });
    expect(createSummonerRollChange("lucky_plus_one", 6)?.nextRoll).toBe(6);
    expect(createSummonerRollChange("fate_reroll", 2, { reroll: 4 })).toEqual({
      nextRoll: 4,
      message: "命运重掷发动，新的骰点为 4 点"
    });
  });

  it("requires a reroll value for fate reroll", () => {
    expect(() => createSummonerRollChange("fate_reroll", 2)).toThrow();
  });
});

function makeOutcome(overrides: Partial<SkillOutcome> = {}): SkillOutcome {
  return {
    damage: 0,
    healing: 0,
    shieldGain: 0,
    selfDamage: 0,
    ignoresShield: false,
    grantsInvincible: false,
    executesTarget: false,
    flameMarksToAdd: 0,
    clearsFlameMarks: false,
    entersGuarding: false,
    dice: [3],
    skillMessages: [],
    skillHints: [],
    ...overrides
  };
}
