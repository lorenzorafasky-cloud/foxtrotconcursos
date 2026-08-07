import { describe, expect, it } from "vitest";
import { reviewFlashcardState } from "../src/modules/focus/srs";

describe("reviewFlashcardState", () => {
  it("resets repetitions when recall quality is low", () => {
    expect(reviewFlashcardState({ easeFactor: 2.5, intervalDays: 6, repetitions: 2 }, 2)).toMatchObject({
      intervalDays: 1,
      repetitions: 0
    });
  });

  it("schedules first and second successful reviews", () => {
    expect(reviewFlashcardState({ easeFactor: 2.5, intervalDays: 0, repetitions: 0 }, 5)).toMatchObject({
      intervalDays: 1,
      repetitions: 1
    });
    expect(reviewFlashcardState({ easeFactor: 2.6, intervalDays: 1, repetitions: 1 }, 4)).toMatchObject({
      intervalDays: 6,
      repetitions: 2
    });
  });
});
