import { describe, expect, it } from "vitest";
import { getNextAlivePlayerIndex, getNextDuoControllerId } from "./turnOrder.js";

describe("turn order", () => {
  it("advances to the next living classic player", () => {
    const players = [{ isDead: false }, { isDead: true }, { isDead: false }];

    expect(getNextAlivePlayerIndex(players, 0)).toBe(2);
  });

  it("wraps classic turn order around dead players", () => {
    const players = [{ isDead: false }, { isDead: true }, { isDead: false }];

    expect(getNextAlivePlayerIndex(players, 2)).toBe(0);
  });

  it("keeps the current index when there is no next living player", () => {
    const players = [{ isDead: false }, { isDead: true }];

    expect(getNextAlivePlayerIndex(players, 0)).toBe(0);
  });

  it("advances duo controllers in configured order", () => {
    expect(getNextDuoControllerId(["a", "b", "c"], "b")).toBe("c");
    expect(getNextDuoControllerId(["a", "b", "c"], "c")).toBe("a");
  });

  it("returns undefined when duo turn order is incomplete", () => {
    expect(getNextDuoControllerId(["a"], "a")).toBeUndefined();
    expect(getNextDuoControllerId(["a", "b"], "missing")).toBeUndefined();
  });
});
