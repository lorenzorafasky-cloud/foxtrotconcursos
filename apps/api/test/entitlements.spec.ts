import { describe, expect, it } from "vitest";
import { hasCourseEntitlement } from "../src/modules/courses/entitlements";

describe("hasCourseEntitlement", () => {
  const now = new Date("2026-08-06T12:00:00.000Z");

  it("allows unlimited access to any course", () => {
    expect(
      hasCourseEntitlement(
        [{ type: "UNLIMITED", courseId: null, startsAt: new Date("2026-01-01"), endsAt: null }],
        "course-a",
        now
      )
    ).toBe(true);
  });

  it("allows a purchased course and blocks unrelated courses", () => {
    const entitlements = [{ type: "COURSE" as const, courseId: "course-a", startsAt: new Date("2026-01-01"), endsAt: null }];
    expect(hasCourseEntitlement(entitlements, "course-a", now)).toBe(true);
    expect(hasCourseEntitlement(entitlements, "course-b", now)).toBe(false);
  });

  it("blocks expired entitlements", () => {
    expect(
      hasCourseEntitlement(
        [{ type: "UNLIMITED", courseId: null, startsAt: new Date("2026-01-01"), endsAt: new Date("2026-02-01") }],
        "course-a",
        now
      )
    ).toBe(false);
  });
});
