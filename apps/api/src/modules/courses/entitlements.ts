export type EntitlementRecord = {
  type: "UNLIMITED" | "COURSE" | "QUESTIONS";
  courseId: string | null;
  startsAt: Date;
  endsAt: Date | null;
};

export function hasCourseEntitlement(entitlements: EntitlementRecord[], courseId: string, now = new Date()) {
  return entitlements.some((entitlement) => {
    const active = entitlement.startsAt <= now && (!entitlement.endsAt || entitlement.endsAt > now);
    if (!active) return false;
    return entitlement.type === "UNLIMITED" || (entitlement.type === "COURSE" && entitlement.courseId === courseId);
  });
}
