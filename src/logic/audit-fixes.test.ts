import { describe, expect, it } from "vitest";
import { MODULE_MAP } from "../content/modules";
import { createSeed } from "../data/seed";
import { actions, getState, refreshDates } from "../store";
import { DAY, moduleStatuses, summarizeStaff } from "./metrics";

describe("returning visitors keep fresh dates", () => {
  it("shifts every timestamp by the time away, keeping go-live the same distance out", () => {
    const seededAt = Date.UTC(2026, 8, 22);
    const s = createSeed(seededAt);
    const daysBefore = (s.clinics[0].goLiveDate - seededAt) / DAY;
    const later = seededAt + 5 * DAY;
    refreshDates(s, later);
    expect((s.clinics[0].goLiveDate - later) / DAY).toBeCloseTo(daysBefore);
    expect(Math.max(...s.events.map((e) => e.ts))).toBeLessThanOrEqual(later);
    expect(s.clockAt).toBe(later);
  });
  it("leaves a state alone within the same session", () => {
    const now = Date.UTC(2026, 8, 22);
    const s = createSeed(now);
    const before = s.clinics[0].goLiveDate;
    refreshDates(s, now + 10 * 60_000);
    expect(s.clinics[0].goLiveDate).toBe(before);
  });
});

describe("audit fixes", () => {
  it("bulk reminders give each person their own next module", () => {
    actions.resetDemo();
    const riverside = getState().staff.filter((x) => x.clinicId === "riverside");
    const ids = riverside.map((x) => x.id);
    actions.sendReminder(ids, "Hi {name}! Your next Lupa module is “{module}”. Go-live in {days} days.");
    const st = getState();
    const jess = st.reminders.filter((r) => r.staffId === "riverside-jess.morales").at(-1)!;
    expect(jess.message).toContain("Hi Jess!");
    expect(jess.message).toContain(MODULE_MAP.fundamentals.title);
    expect(jess.message).not.toContain("{");
    expect(jess.moduleId).toBe("fundamentals");
    const chen = st.reminders.filter((r) => r.staffId === "riverside-sarah.chen").at(-1)!;
    const chenNext = summarizeStaff(st, st.staff.find((x) => x.id === "riverside-sarah.chen")!).nextModule!;
    expect(chen.message).toContain(MODULE_MAP[chenNext].title);
  });

  it("recertification keeps later certified modules unlocked and flags the retake", () => {
    actions.resetDemo();
    actions.requireRecert("riverside-olivia.grant", "fundamentals");
    const st = getState();
    const ms = moduleStatuses(st, st.staff.find((x) => x.id === "riverside-olivia.grant")!);
    expect(ms[0].recert).toBe(true);
    expect(ms[0].proficiency).toBe("retrain");
    expect(ms[0].overdue).toBe(false);
    expect(ms.slice(1).every((m) => m.unlocked)).toBe(true);
  });

  it("new invitees get their own window instead of starting overdue and at risk", () => {
    actions.resetDemo();
    actions.addStaff("riverside", "Test Person", "frontdesk", "test@riverside.vet");
    const st = getState();
    const sum = summarizeStaff(st, st.staff.at(-1)!);
    expect(sum.overdue).toBe(0);
    expect(sum.status).toBe("not_started");
  });

  it("simulated activity never touches a learner a visitor is playing as", () => {
    actions.resetDemo();
    actions.learnerLogin("riverside-jess.morales");
    actions.startModule("riverside-jess.morales", "fundamentals");
    for (let i = 0; i < 200; i++) actions.simulateTick("riverside");
    const st = getState();
    expect(st.attempts.some((a) => a.staffId === "riverside-jess.morales")).toBe(false);
    const jess = st.progress.find((p) => p.staffId === "riverside-jess.morales")!;
    expect(jess.stage).toBe("compare");
    expect(jess.simulated).toBeUndefined();
  });

  it("resuming a module keeps its saved stage", () => {
    actions.resetDemo();
    actions.startModule("riverside-jess.morales", "fundamentals");
    actions.setStage("riverside-jess.morales", "fundamentals", "quiz");
    actions.startModule("riverside-jess.morales", "fundamentals", true);
    expect(getState().progress.find((p) => p.staffId === "riverside-jess.morales")!.stage).toBe("quiz");
  });
});
