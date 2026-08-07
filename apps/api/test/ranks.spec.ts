import { describe, expect, it } from "vitest";
import { rankForXp } from "../src/modules/focus/ranks";

describe("rankForXp", () => {
  it("returns the first rank for a new student", () => {
    expect(rankForXp(0)).toBe("Recruta");
  });

  it("promotes according to accumulated XP", () => {
    expect(rankForXp(700)).toBe("Cabo");
    expect(rankForXp(14500)).toBe("Coronel");
  });
});
