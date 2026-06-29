import { describe, expect, it } from "vitest";
import {
  activeCharacterSkillReason,
  characterSkillDescription,
  getAvailableCharacterReactionSkill
} from "./characterSkills.js";
import type { CharacterId, CharacterReactionSkillId } from "./types.js";

describe("character skill helpers", () => {
  it.each([
    ["stone_titan", 6, "stone_titan_crush", "碾压"],
    ["gunslinger", 1, "gunslinger_copy_damage", "复制伤害"],
    ["gunslinger", 6, "gunslinger_barrage", "连射"],
    ["vampire", 1, "vampire_life_steal", "吸血"],
    ["vampire", 6, "vampire_blood_rite", "血祭回复"],
    ["paladin", 4, "paladin_invincible", "全员无敌"],
    ["self_destructor", 6, "self_destruct", "自爆"],
    ["war_knight", 3, "war_knight_heal", "战争复苏"],
    ["crescent_moon", 6, "crescent_moon_strike", "残月斩"],
    ["fire_lord", 3, "fire_lord_spark", "火焰印记"],
    ["fire_lord", 6, "fire_lord_burst", "火焰爆发"],
    ["mountain_shield", 6, "mountain_shield_guard", "架盾"]
  ] satisfies Array<[CharacterId, number, CharacterReactionSkillId, string]>)(
    "maps %s roll %i to %s",
    (characterId, roll, skillId, name) => {
      expect(getAvailableCharacterReactionSkill(characterId, roll)).toEqual({ id: skillId, name });
    }
  );

  it.each([
    ["stone_titan", 6],
    ["gunslinger", 1],
    ["gunslinger", 6],
    ["vampire", 1],
    ["vampire", 6],
    ["paladin", 4],
    ["self_destructor", 6],
    ["war_knight", 3],
    ["crescent_moon", 6],
    ["fire_lord", 3],
    ["fire_lord", 6],
    ["mountain_shield", 6]
  ] satisfies Array<[CharacterId, number]>)("returns a reason for %s roll %i", (characterId, roll) => {
    const skill = getAvailableCharacterReactionSkill(characterId, roll);

    expect(skill).toBeDefined();
    expect(activeCharacterSkillReason(characterId, roll)).toBe(characterSkillDescription(skill!.id, roll));
  });

  it("returns undefined when the roll does not trigger a character skill", () => {
    expect(getAvailableCharacterReactionSkill("gunslinger", 2)).toBeUndefined();
    expect(getAvailableCharacterReactionSkill(undefined, 6)).toBeUndefined();
  });

  it("keeps action descriptions tied to the selected skill", () => {
    expect(characterSkillDescription("self_destruct", 6)).toContain("1-9");
    expect(characterSkillDescription("fire_lord_burst", 6)).toContain("火焰印记");
    expect(characterSkillDescription("paladin_invincible", 4)).toContain("全员无敌");
  });

  it("explains active skill availability for highlighted characters", () => {
    expect(activeCharacterSkillReason("paladin", 4)).toContain("全员无敌");
    expect(activeCharacterSkillReason("paladin", 5)).toBe("当前骰点不能发动");
    expect(activeCharacterSkillReason("boxer", 6)).toBe("当前骰点不能发动");
  });
});
