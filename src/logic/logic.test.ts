import { describe, expect, it } from "vitest";
import { MODULES, ROLE_PATHS } from "../content/modules";
import { createSeed } from "../data/seed";
import type { SimItem } from "../types";
import { DAY, evaluateBenchmark, missedSteps, moduleStatuses, summarizeClinic, summarizeStaff } from "./metrics";
import { moduleScore, quizScore, simScore, valueMatches } from "./scoring";

describe("scoring", () => {
  it("penalises wrong moves and hints", () => {
    expect(simScore(0, 0)).toBe(100);
    expect(simScore(2, 1)).toBe(100 - 16 - 12);
    expect(simScore(20, 5)).toBe(0);
  });
  it("weights the simulation over the quiz", () => {
    expect(moduleScore(100, 100)).toBe(100);
    expect(moduleScore(67, 100)).toBe(90);
    expect(moduleScore(100, 60)).toBe(72);
  });
  it("rounds quiz percentages", () => {
    expect(quizScore(2, 3)).toBe(67);
  });
  it("matches typed values loosely but numbers precisely", () => {
    expect(valueMatches(" Biscuit ", "biscuit")).toBe(true);
    expect(valueMatches("4.20", "4.2")).toBe(true);
    expect(valueMatches("3.2 mL", "3.2")).toBe(true);
    expect(valueMatches("6.4", "3.2")).toBe(false);
    expect(valueMatches("Sick", "Annual leave")).toBe(false);
  });
});

describe("curriculum integrity: every simulation is completable", () => {
  for (const m of MODULES) {
    it(`${m.id}`, () => {
      const stepIds = m.sim.steps.map((s) => s.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
      expect(m.quiz.every((q) => q.correct >= 0 && q.correct < q.options.length)).toBe(true);
      m.sim.steps.forEach((step, i) => {
        const done = new Set(stepIds.slice(0, i));
        const screen = m.sim.screens.find((s) => s.id === step.screen);
        expect(screen, `screen ${step.screen}`).toBeDefined();
        if (step.target.startsWith("nav:")) return;
        const items = screen!.sections.flatMap((s) => s.items);
        const item = items.find((it) => "id" in it && it.id === step.target) as (SimItem & { id: string }) | undefined;
        expect(item, `step ${step.id} target ${step.target}`).toBeDefined();
        const visible = (!item!.showAfter || done.has(item!.showAfter)) && (!item!.hideAfter || !done.has(item!.hideAfter));
        expect(visible, `step ${step.id}: target hidden`).toBe(true);
        if (item!.showAfter) expect(stepIds).toContain(item!.showAfter);
        if (item!.kind === "select") expect(item!.options, `step ${step.id} value`).toContain(step.value);
        if (item!.kind === "input") expect(step.value).toBeTruthy();
      });
    });
  }
  it("every role path references real modules", () => {
    for (const ids of Object.values(ROLE_PATHS)) for (const id of ids) expect(MODULES.some((m) => m.id === id)).toBe(true);
  });
});

describe("readiness metrics", () => {
  const now = Date.now();
  const state = createSeed(now);

  it("seeds four clinics with staff and attempts", () => {
    expect(state.clinics).toHaveLength(4);
    expect(state.staff.length).toBeGreaterThan(30);
    expect(state.attempts.length).toBeGreaterThan(50);
  });

  it("locks modules until the previous one is passed", () => {
    const jess = state.staff.find((s) => s.id === "riverside-jess.morales")!;
    const ms = moduleStatuses(state, jess, now);
    expect(ms[0].unlocked).toBe(true);
    expect(ms.slice(1).every((m) => !m.unlocked)).toBe(true);
  });

  it("flags a learner who failed the same module twice as at risk", () => {
    const raj = state.staff.find((s) => s.id === "riverside-raj.patel")!;
    const sum = summarizeStaff(state, raj, now);
    expect(sum.status).toBe("at_risk");
    expect(sum.modules.find((m) => m.moduleId === "scribe")!.proficiency).toBe("retrain");
  });

  it("marks a fully certified learner as go-live ready", () => {
    const olivia = state.staff.find((s) => s.id === "riverside-olivia.grant")!;
    expect(summarizeStaff(state, olivia, now).status).toBe("certified");
  });

  it("superseded passes (recertification) stop counting", () => {
    const olivia = state.staff.find((s) => s.id === "riverside-olivia.grant")!;
    const clone = structuredClone(state);
    clone.attempts.forEach((a) => {
      if (a.staffId === olivia.id && a.moduleId === "checkout" && a.passed) a.superseded = true;
    });
    const sum = summarizeStaff(clone, olivia, now);
    expect(sum.modules.find((m) => m.moduleId === "checkout")!.proficiency).toBe("retrain");
    expect(sum.readiness).toBeLessThan(100);
  });

  it("evaluates benchmarks against due dates", () => {
    const sum = summarizeClinic(state, "riverside", now);
    const started = sum.benchmarks.find((b) => b.benchmark.kind === "started")!;
    expect(started.value).toBeLessThan(100);
    expect(started.state).toBe("overdue");
    const b = { ...started.benchmark, target: 50, dueDate: now + 30 * DAY };
    expect(evaluateBenchmark(b, sum.staff, now).state).toBe("met");
  });

  it("aggregates the most-missed workflow steps", () => {
    const missed = missedSteps(state, "riverside");
    expect(missed.length).toBeGreaterThan(0);
    expect(missed[0].count).toBeGreaterThanOrEqual(missed[missed.length - 1].count);
  });

  it("a harborview (live) clinic is fully ready", () => {
    expect(summarizeClinic(state, "harbor", now).readiness).toBe(100);
  });
});
