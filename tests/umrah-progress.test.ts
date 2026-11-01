import { describe, expect, it, vi } from "vitest";
import {
  createUmrahProgress, loadUmrahProgress, reduceUmrahProgress, saveUmrahProgress,
  UMRAH_HISTORY_LIMIT, UMRAH_PROGRESS_KEY, type UmrahProgress, type UmrahStorage,
} from "../src/umrah/progress";

function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(UMRAH_PROGRESS_KEY, initial);
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    values,
  };
}
const confirm = (p: UmrahProgress) => reduceUmrahProgress(p, { type: "confirm-stage" });
const increment = (p: UmrahProgress, counter: "tawaf" | "sai") => reduceUmrahProgress(p, { type: "increment", counter });
function atTawaf() {
  return confirm(confirm(reduceUmrahProgress(createUmrahProgress("flight", "women"), { type: "acknowledge" })));
}

describe("Umrah manual progress", () => {
  it("starts without assuming acknowledgement, counts or completed rites", () => {
    const p = createUmrahProgress();
    expect(p).toMatchObject({ schemaVersion: 2, startMode: "miqat", scenario: "ground", audience: "all", stage: "ihram", acknowledged: false, completed: [], tawaf: 0, sai: 0 });
    expect(confirm(p)).toBe(p);
    expect(increment(p, "tawaf")).toBe(p);
    const s = storage();
    expect(loadUmrahProgress(s).status).toBe("empty");
    expect(s.setItem).not.toHaveBeenCalled();
  });

  it("requires seven manual taps and a separate stage confirmation", () => {
    let p = atTawaf();
    expect(p.stage).toBe("tawaf");
    expect(increment(p, "sai")).toBe(p);
    for (let i = 0; i < 6; i++) p = increment(p, "tawaf");
    expect(confirm(p)).toBe(p);
    p = increment(p, "tawaf");
    expect(p.stage).toBe("tawaf");
    expect(p.completed).not.toContain("tawaf");
    expect(increment(p, "tawaf")).toBe(p);
    expect(confirm(p)).toMatchObject({ stage: "after-tawaf", tawaf: 7 });
  });

  it("restores seven-count and undo history across close/restart", () => {
    const s = storage();
    let p = atTawaf();
    for (let i = 0; i < 7; i++) p = increment(p, "tawaf");
    p = confirm(p);
    expect(saveUmrahProgress(p, s)).toEqual({ ok: true });
    const restored = loadUmrahProgress(s);
    expect(restored.status).toBe("ok");
    expect(restored.progress).toEqual(p);
    const undoConfirmation = reduceUmrahProgress(restored.progress, { type: "undo" });
    expect(undoConfirmation).toMatchObject({ stage: "tawaf", tawaf: 7, completed: ["ihram", "talbiyah"] });
    const undoTap = reduceUmrahProgress(undoConfirmation, { type: "undo" });
    expect(undoTap).toMatchObject({ stage: "tawaf", tawaf: 6 });
    expect(saveUmrahProgress(undoTap, s).ok).toBe(true);
    expect(loadUmrahProgress(s).progress.tawaf).toBe(6);
  });

  it("records a complete seven-leg sai only after the user's final confirmation", () => {
    let p = atTawaf();
    for (let i = 0; i < 7; i++) p = increment(p, "tawaf");
    p = confirm(confirm(p));
    expect(p.stage).toBe("sai");
    for (let i = 0; i < 7; i++) p = increment(p, "sai");
    expect(p.stage).toBe("sai");
    p = confirm(p);
    expect(p.stage).toBe("completion");
    expect(p.completed).not.toContain("completion");
    p = confirm(p);
    expect(p.completed).toHaveLength(6);
    expect(saveUmrahProgress(p, storage()).ok).toBe(true);
    expect(reduceUmrahProgress(p, { type: "undo" }).completed).toHaveLength(5);
  });

  it("lets the user review earlier instructions without erasing completion or adding fake rites", () => {
    let p = atTawaf();
    for (let i = 0; i < 7; i++) p = increment(p, "tawaf");
    p = confirm(p);
    const back = reduceUmrahProgress(p, { type: "previous-stage" });
    expect(back.stage).toBe("tawaf");
    expect(back.completed).toEqual(p.completed);
    expect(confirm(back).history).toEqual(p.history);
    expect(confirm(back).completed).toEqual(p.completed);
    expect(saveUmrahProgress(back, storage()).ok).toBe(true);
  });

  it("does not mutate frozen input and undo preserves scenario/audience preferences", () => {
    const p = atTawaf();
    Object.freeze(p); Object.freeze(p.completed); Object.freeze(p.history);
    const next = increment(p, "tawaf");
    expect(p.tawaf).toBe(0);
    const configured = reduceUmrahProgress(next, { type: "configure", scenario: "mecca", audience: "men" });
    expect(reduceUmrahProgress(configured, { type: "undo" })).toMatchObject({ scenario: "mecca", audience: "men", tawaf: 0, acknowledged: true });
  });

  it("only clears progress through an explicit reset and keeps introductory acknowledgement", () => {
    const p = increment(atTawaf(), "tawaf");
    const s = storage(JSON.stringify(p));
    loadUmrahProgress(s);
    expect(s.values.get(UMRAH_PROGRESS_KEY)).toBe(JSON.stringify(p));
    const reset = reduceUmrahProgress(p, { type: "reset" });
    expect(reset).toMatchObject({ stage: "ihram", completed: [], tawaf: 0, sai: 0, history: [], acknowledged: true, scenario: "flight", startMode: "transport", audience: "women" });
  });

  it("changes miqat, transport and Mecca choices without confirming any rite", () => {
    const original = increment(atTawaf(), "tawaf");
    let p = reduceUmrahProgress(original, { type: "configure", startMode: "transport", scenario: "ground", audience: "all" });
    expect(p).toMatchObject({ startMode: "transport", scenario: "ground", stage: "tawaf", tawaf: 1 });
    expect(p.completed).toEqual(original.completed);
    expect(p.history).toEqual(original.history);
    p = reduceUmrahProgress(p, { type: "configure", startMode: "mecca", scenario: "flight", audience: "women" });
    expect(p).toMatchObject({ startMode: "mecca", scenario: "mecca" });
    p = reduceUmrahProgress(p, { type: "configure", startMode: "transport", scenario: "mecca", audience: "women" });
    expect(p).toMatchObject({ startMode: "transport", scenario: "ground" });
    // Changing only the audience through an older call preserves the selected mode.
    p = reduceUmrahProgress(p, { type: "configure", scenario: "ground", audience: "men" });
    expect(p).toMatchObject({ startMode: "transport", scenario: "ground", audience: "men" });
    expect(reduceUmrahProgress(p, { type: "reset" })).toMatchObject({ startMode: "transport", stage: "ihram", completed: [] });
    p = reduceUmrahProgress(p, { type: "configure", startMode: "miqat", scenario: "flight", audience: "men" });
    expect(p).toMatchObject({ startMode: "miqat", scenario: "ground" });
    expect(saveUmrahProgress(p, storage()).ok).toBe(true);
  });
});

describe("Umrah storage integrity", () => {
  it.each(["", "{broken", "null", JSON.stringify({ schemaVersion: 0 })])("preserves corrupt storage instead of replacing it: %s", raw => {
    const s = storage(raw);
    expect(loadUmrahProgress(s).status).toBe("corrupt");
    expect(s.values.get(UMRAH_PROGRESS_KEY)).toBe(raw);
    expect(s.setItem).not.toHaveBeenCalled();
  });

  it("recognizes a future schema and leaves it untouched", () => {
    const raw = JSON.stringify({ ...createUmrahProgress(), schemaVersion: 3 });
    const s = storage(raw);
    expect(loadUmrahProgress(s).status).toBe("future-version");
    expect(s.values.get(UMRAH_PROGRESS_KEY)).toBe(raw);
    expect(s.setItem).not.toHaveBeenCalled();
  });

  it.each([
    { tawaf: -1 }, { sai: 8 }, { tawaf: 1.5 },
    { stage: "sai" }, { completed: ["ihram"] },
    { latitude: 21.42 }, { longitude: 39.82 },
    { startMode: "miqat", scenario: "flight" },
    { startMode: "transport", scenario: "mecca" },
    { startMode: "mecca", scenario: "ground" },
    { history: [{ stage: "tawaf", completed: [], tawaf: 7, sai: 0 }] },
  ])("rejects malformed progress and coordinate injection %j", patch => {
    const malformed = { ...createUmrahProgress(), ...patch } as UmrahProgress;
    const s = storage(JSON.stringify(malformed));
    expect(loadUmrahProgress(s).status).toBe("corrupt");
    expect(saveUmrahProgress(malformed, s)).toEqual({ ok: false, error: "invalid" });
    expect(s.setItem).not.toHaveBeenCalled();
  });

  it("rejects a completed tawaf restored with a partial count", () => {
    const p = { ...atTawaf(), completed: ["ihram", "talbiyah", "tawaf"], stage: "after-tawaf", tawaf: 6 };
    expect(loadUmrahProgress(storage(JSON.stringify(p))).status).toBe("corrupt");
  });

  it("rejects fabricated future snapshots that would let Undo skip ahead", () => {
    const p = atTawaf();
    const future = { stage: "after-tawaf", completed: ["ihram", "talbiyah", "tawaf"], tawaf: 7, sai: 0 };
    expect(loadUmrahProgress(storage(JSON.stringify({ ...p, history: [future] }))).status).toBe("corrupt");
    const unacknowledged = { ...createUmrahProgress(), history: [{ stage: "ihram", completed: [], tawaf: 0, sai: 0 }] };
    expect(loadUmrahProgress(storage(JSON.stringify(unacknowledged))).status).toBe("corrupt");
  });

  it("caps persisted undo history and rejects oversized input", () => {
    const p = atTawaf();
    const snap = { stage: p.stage, completed: p.completed, tawaf: 0, sai: 0 };
    p.history = Array.from({ length: UMRAH_HISTORY_LIMIT }, () => ({ ...snap }));
    const next = increment(p, "tawaf");
    expect(next.history).toHaveLength(UMRAH_HISTORY_LIMIT);
    expect(saveUmrahProgress(next, storage()).ok).toBe(true);
    expect(loadUmrahProgress(storage(JSON.stringify({ ...next, history: [...next.history, snap] }))).status).toBe("corrupt");
  });

  it("reports unavailable storage on reads and failed writes instead of saying saved", () => {
    const unavailable: UmrahStorage = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("quota"); } };
    expect(loadUmrahProgress(unavailable).status).toBe("unavailable");
    expect(saveUmrahProgress(atTawaf(), unavailable)).toEqual({ ok: false, error: "unavailable" });
  });
});

describe("0.19.0 progress migration", () => {
  const emptyLegacy = () => ({ schemaVersion: 1, scenario: "ground", audience: "all", acknowledged: false,
    stage: "preparation", completed: [] as string[], tawaf: 0, sai: 0, history: [] as Array<{ stage: string; completed: string[]; tawaf: number; sai: number }> });

  it("starts an untouched old save at ihram without marking preparation or ihram complete", () => {
    const raw = JSON.stringify(emptyLegacy());
    const s = storage(raw);
    const loaded = loadUmrahProgress(s);
    expect(loaded.status).toBe("ok");
    expect(loaded.progress).toMatchObject({ schemaVersion: 2, startMode: "miqat", stage: "ihram", completed: [], history: [], acknowledged: false });
    expect(s.values.get(UMRAH_PROGRESS_KEY)).toBe(raw);
    expect(s.setItem).not.toHaveBeenCalled();
  });

  it("does not turn an old preparation confirmation into confirmed ihram or a no-op undo", () => {
    const p = { ...emptyLegacy(), acknowledged: true, stage: "ihram", completed: ["preparation"],
      history: [{ stage: "preparation", completed: [], tawaf: 0, sai: 0 }] };
    const loaded = loadUmrahProgress(storage(JSON.stringify(p)));
    expect(loaded.status).toBe("ok");
    expect(loaded.progress).toMatchObject({ stage: "ihram", completed: [], history: [] });
    expect(reduceUmrahProgress(loaded.progress, { type: "undo" })).toBe(loaded.progress);
  });

  it.each(["ground", "flight", "mecca"])("migrates real tawaf counts, undo and %s route without writing until the next change", scenario => {
    const prefix = ["preparation", "ihram", "talbiyah"];
    const old = { ...emptyLegacy(), scenario, audience: "women", acknowledged: true, stage: "tawaf", completed: prefix, tawaf: 3,
      history: [
        { stage: "preparation", completed: [], tawaf: 0, sai: 0 },
        { stage: "ihram", completed: ["preparation"], tawaf: 0, sai: 0 },
        { stage: "talbiyah", completed: ["preparation", "ihram"], tawaf: 0, sai: 0 },
        ...[0, 1, 2].map(tawaf => ({ stage: "tawaf", completed: prefix, tawaf, sai: 0 })),
      ] };
    const raw = JSON.stringify(old);
    const s = storage(raw);
    const loaded = loadUmrahProgress(s);
    expect(loaded.status).toBe("ok");
    expect(loaded.progress).toMatchObject({ schemaVersion: 2, scenario, audience: "women", stage: "tawaf", tawaf: 3, completed: ["ihram", "talbiyah"],
      startMode: scenario === "ground" ? "miqat" : scenario === "flight" ? "transport" : "mecca" });
    expect(loaded.progress.history).toHaveLength(5);
    expect(s.values.get(UMRAH_PROGRESS_KEY)).toBe(raw);
    expect(s.setItem).not.toHaveBeenCalled();
    const undone = reduceUmrahProgress(loaded.progress, { type: "undo" });
    expect(undone).toMatchObject({ stage: "tawaf", tawaf: 2 });
    expect(saveUmrahProgress(undone, s)).toEqual({ ok: true });
    expect(JSON.parse(s.values.get(UMRAH_PROGRESS_KEY)!)).toMatchObject({ schemaVersion: 2, tawaf: 2 });
    expect(loadUmrahProgress(s).progress).toEqual(undone);
  });

  it("preserves a completed journey and meaningful sai/completion undo", () => {
    const beforeSai = ["preparation", "ihram", "talbiyah", "tawaf", "after-tawaf"];
    const old = { ...emptyLegacy(), acknowledged: true, stage: "completion", completed: [...beforeSai, "sai", "completion"], tawaf: 7, sai: 7,
      history: [
        { stage: "sai", completed: beforeSai, tawaf: 7, sai: 6 },
        { stage: "completion", completed: [...beforeSai, "sai"], tawaf: 7, sai: 7 },
      ] };
    const loaded = loadUmrahProgress(storage(JSON.stringify(old)));
    expect(loaded.status).toBe("ok");
    expect(loaded.progress.completed).toHaveLength(6);
    const undoFinish = reduceUmrahProgress(loaded.progress, { type: "undo" });
    expect(undoFinish.completed).toHaveLength(5);
    const undoSai = reduceUmrahProgress(undoFinish, { type: "undo" });
    expect(undoSai).toMatchObject({ stage: "sai", sai: 6, tawaf: 7 });
    expect(saveUmrahProgress(undoSai, storage()).ok).toBe(true);
  });

  it.each([
    { stage: "ihram" },
    { acknowledged: true, completed: ["ihram"] },
    { latitude: 21.42 },
    { startMode: "miqat" },
    { acknowledged: true, stage: "after-tawaf", completed: ["preparation", "ihram", "talbiyah", "tawaf"], tawaf: 6 },
    { acknowledged: true, history: [{ stage: "tawaf", completed: ["preparation", "ihram", "talbiyah"], tawaf: 7, sai: 0 }] },
  ])("refuses to repair corrupt legacy data during migration: %j", patch => {
    const raw = JSON.stringify({ ...emptyLegacy(), ...patch });
    const s = storage(raw);
    expect(loadUmrahProgress(s).status).toBe("corrupt");
    expect(s.values.get(UMRAH_PROGRESS_KEY)).toBe(raw);
    expect(s.setItem).not.toHaveBeenCalled();
  });
});
