import { describe, expect, it } from "vitest";
import {
  createSummonerChangedRollDecision,
  createSummonerChangedRollResolution,
  getAllowedRollDecisionAction,
  normalizeRollDecisionChoice
} from "./rollDecisions.js";
import type { PendingRollDecision } from "./types.js";

describe("roll decisions", () => {
  it("normalizes settle into normal attack", () => {
    expect(normalizeRollDecisionChoice("settle")).toBe("normal_attack");
    expect(normalizeRollDecisionChoice("character_skill")).toBe("character_skill");
  });

  it("returns the allowed action for a valid choice", () => {
    const decision = makeDecision();

    expect(getAllowedRollDecisionAction(decision, "character_skill").skillId).toBe("paladin_invincible");
  });

  it("rejects missing, disabled, and mismatched actions", () => {
    const decision = makeDecision();

    expect(() => getAllowedRollDecisionAction(decision, "roguelite_skill")).toThrow();
    expect(() => getAllowedRollDecisionAction({ ...decision, availableActions: [{ id: "normal_attack", label: "", enabled: false, description: "", reason: "blocked" }] }, "normal_attack")).toThrow("blocked");
    expect(() => getAllowedRollDecisionAction(decision, "summoner_skill", "fate_reroll")).toThrow();
  });

  it("rebuilds a pending decision after a summoner skill changes the roll", () => {
    const decision = makeDecision();
    const next = createSummonerChangedRollDecision(decision, {
      id: "decision-2",
      nextRoll: 5,
      characterSkill: { id: "paladin_invincible", name: "全员无敌" },
      availableActions: [{ id: "character_skill", label: "", enabled: true, description: "" }],
      usedSummonerSkillId: "lucky_plus_one"
    });

    expect(next.id).toBe("decision-2");
    expect(next.currentRoll).toBe(5);
    expect(next.canUseCharacterSkill).toBe(true);
    expect(next.availableSummonerSkillId).toBeUndefined();
    expect(next.usedSummonerSkillId).toBe("lucky_plus_one");
  });

  it("reports whether a changed summoner roll should wait for a character skill", () => {
    const resolution = createSummonerChangedRollResolution(makeDecision(), {
      id: "decision-2",
      nextRoll: 5,
      characterSkill: { id: "paladin_invincible", name: "全员无敌" },
      availableActions: [{ id: "character_skill", label: "", enabled: true, description: "" }],
      usedSummonerSkillId: "lucky_plus_one"
    });

    expect(resolution.shouldWaitForCharacterSkill).toBe(true);
    expect(resolution.decision.currentRoll).toBe(5);

    const noSkill = createSummonerChangedRollResolution(makeDecision(), {
      id: "decision-3",
      nextRoll: 2,
      availableActions: [{ id: "normal_attack", label: "", enabled: true, description: "" }],
      usedSummonerSkillId: "fate_reroll"
    });

    expect(noSkill.shouldWaitForCharacterSkill).toBe(false);
  });
});

function makeDecision(): PendingRollDecision {
  return {
    id: "decision-1",
    actorId: "actor-1",
    targetId: "target-1",
    rawRoll: 4,
    currentRoll: 4,
    phase: "waiting_reaction",
    canUseCharacterSkill: true,
    availableCharacterSkillId: "paladin_invincible",
    availableCharacterSkillName: "全员无敌",
    availableSummonerSkillId: "lucky_plus_one",
    availableSummonerSkillName: "幸运骰",
    availableActions: [
      { id: "normal_attack", label: "", enabled: true, description: "" },
      { id: "character_skill", label: "", enabled: true, description: "", skillId: "paladin_invincible" },
      { id: "summoner_skill", label: "", enabled: true, description: "", skillId: "lucky_plus_one" }
    ],
    rollEventId: "roll-1",
    createdAt: 1
  };
}
