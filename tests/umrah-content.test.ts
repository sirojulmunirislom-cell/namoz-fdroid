import { describe, expect, it } from "vitest";
import { locales } from "../shared/schema";
import { umrahSteps, umrahSources } from "../src/umrah/content";
import { umrahCopy } from "../src/umrah/copy";
import { umrahMiqats } from "../src/umrah/miqats";
import { UMRAH_STAGES, type UmrahText } from "../src/umrah/types";

describe("bundled Umrah editorial integrity", () => {
  it("ships every stage, instruction and UI message in all four languages", () => {
    expect(UMRAH_STAGES[0]).toBe("ihram");
    expect(umrahSteps.filter(s => s.id !== "preparation").map(s => s.id)).toEqual([...UMRAH_STAGES]);
    expect(umrahSteps.filter(s => s.id === "preparation")).toHaveLength(1);
    const values: UmrahText[] = [...Object.values(umrahCopy)];
    for (const step of umrahSteps) {
      values.push(step.title, step.summary);
      expect(step.instructions.length).toBeGreaterThan(0);
      for (const item of step.instructions) {
        values.push(item.text);
        if (item.title) values.push(item.title);
        if (item.arabic) {
          expect(item.arabic).toMatch(/[\u0600-\u06ff]/);
          expect(item.meaning).toBeDefined();
          values.push(item.meaning!);
        }
      }
    }
    values.push(...umrahSources.map(s => s.title));
    expect(umrahMiqats).toHaveLength(5);
    expect(new Set(umrahMiqats.map(m => m.id)).size).toBe(5);
    for (const miqat of umrahMiqats) {
      values.push(miqat.name, miqat.route, miqat.note, ...miqat.sources.map(s => s.title));
      expect(miqat.sources.length).toBeGreaterThan(0);
      for (const source of miqat.sources) expect(new URL(source.url).protocol).toBe("https:");
      expect(miqat.arabicName).toMatch(/[\u0600-\u06ff]/);
      expect(miqat.mapQuery.trim()).not.toBe("");
    }
    for (const value of values) {
      expect(Object.keys(value).sort()).toEqual([...locales].sort());
      for (const locale of locales) expect(value[locale].trim().length).toBeGreaterThan(0);
      expect(value["uz-Cyrl"]).not.toMatch(/[\u0400-\u04ff][A-Za-z]|[A-Za-z][\u0400-\u04ff]/);
    }
  });

  it("keeps every instruction traceable to a named HTTPS source", () => {
    const ids = umrahSources.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const instructions = umrahSteps.flatMap(s => s.instructions);
    expect(new Set(instructions.map(i => i.id)).size).toBe(instructions.length);
    for (const source of umrahSources) {
      expect(new URL(source.url).protocol).toBe("https:");
      expect(source.reference.trim()).not.toBe("");
      expect(source.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const item of instructions) {
      expect(item.sourceIds.length).toBeGreaterThan(0);
      for (const id of item.sourceIds) expect(ids).toContain(id);
    }
  });
});
