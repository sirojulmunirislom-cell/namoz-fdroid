import { z } from "zod";
import { UMRAH_STAGES, type UmrahAudience, type UmrahScenario, type UmrahStartMode } from "./types";

// Keep the existing key so an installed 0.19.0 can resume without losing notes.
export const UMRAH_PROGRESS_KEY = "namoz.umrah.progress.v1";
export const UMRAH_HISTORY_LIMIT = 50;
export type UmrahCounter = "tawaf" | "sai";
export type UmrahStorage = Pick<Storage, "getItem" | "setItem">;
const LEGACY_STAGES = ["preparation", "ihram", "talbiyah", "tawaf", "after-tawaf", "sai", "completion"] as const;

type SnapshotValues = { stage: string; completed: readonly string[]; tawaf: number; sai: number };
function consistentSnapshot(value: SnapshotValues, stages: readonly string[]) {
  // Completed steps remain a prefix; reviewing an earlier page is allowed.
  return !value.completed.some((stage, index) => stage !== stages[index]) &&
    stages.indexOf(value.stage) <= value.completed.length &&
    (!value.completed.includes("tawaf") || value.tawaf === 7) &&
    (!value.completed.includes("sai") || value.sai === 7) &&
    (value.tawaf === 0 || value.completed.includes("talbiyah")) &&
    (value.sai === 0 || value.completed.includes("after-tawaf"));
}
function snapshotShape<const Stages extends readonly [string, ...string[]]>(stages: Stages) {
  return {
    stage: z.enum(stages),
    completed: z.array(z.enum(stages)).max(stages.length),
    tawaf: z.number().int().min(0).max(7),
    sai: z.number().int().min(0).max(7),
  };
}
function consistentHistory(value: SnapshotValues & { acknowledged: boolean; history: readonly SnapshotValues[] }) {
  return !(!value.acknowledged && (value.completed.length > 0 || value.tawaf > 0 || value.sai > 0 || value.history.length > 0)) &&
    !value.history.some((previous, index) => {
      const following = value.history[index + 1] ?? value;
      return previous.completed.length > following.completed.length ||
        previous.tawaf > following.tawaf || previous.sai > following.sai;
    });
}
const snapshotSchema = z.object(snapshotShape(UMRAH_STAGES)).strict().superRefine((value, context) => {
  if (!consistentSnapshot(value, UMRAH_STAGES)) context.addIssue({ code: "custom", message: "Inconsistent Umrah progress" });
});
export type UmrahSnapshot = z.infer<typeof snapshotSchema>;

const preferencesShape = {
  scenario: z.enum(["ground", "flight", "mecca"]),
  audience: z.enum(["all", "men", "women"]),
  acknowledged: z.boolean(),
};
const progressSchema = z.object({
  schemaVersion: z.literal(2),
  ...preferencesShape,
  startMode: z.enum(["miqat", "transport", "mecca"]),
  ...snapshotShape(UMRAH_STAGES),
  history: z.array(snapshotSchema).max(UMRAH_HISTORY_LIMIT),
}).strict().superRefine((value, context) => {
  const routeConsistent = value.startMode === "miqat" ? value.scenario === "ground"
    : value.startMode === "mecca" ? value.scenario === "mecca" : value.scenario !== "mecca";
  if (!consistentSnapshot(value, UMRAH_STAGES) || !consistentHistory(value) || !routeConsistent) {
    context.addIssue({ code: "custom", message: "Inconsistent Umrah progress" });
  }
});

// Validate the entire old format before migrating it. Do not repair malformed
// prefixes, unknown fields, future undo entries or incomplete circuit counts.
const legacySnapshotSchema = z.object(snapshotShape(LEGACY_STAGES)).strict().superRefine((value, context) => {
  if (!consistentSnapshot(value, LEGACY_STAGES)) context.addIssue({ code: "custom", message: "Inconsistent legacy Umrah progress" });
});
const legacyProgressSchema = z.object({
  schemaVersion: z.literal(1),
  ...preferencesShape,
  ...snapshotShape(LEGACY_STAGES),
  history: z.array(legacySnapshotSchema).max(UMRAH_HISTORY_LIMIT),
}).strict().superRefine((value, context) => {
  if (!consistentSnapshot(value, LEGACY_STAGES) || !consistentHistory(value)) {
    context.addIssue({ code: "custom", message: "Inconsistent legacy Umrah progress" });
  }
});

export type UmrahProgress = z.infer<typeof progressSchema>;
export type UmrahAction =
  | { type: "acknowledge" }
  | { type: "configure"; scenario: UmrahScenario; audience: UmrahAudience; startMode?: UmrahStartMode }
  | { type: "increment"; counter: UmrahCounter }
  | { type: "confirm-stage" }
  | { type: "previous-stage" }
  | { type: "undo" }
  | { type: "reset" };

export type UmrahLoadResult = {
  status: "empty" | "ok" | "corrupt" | "unavailable" | "future-version";
  progress: UmrahProgress;
};
export type UmrahSaveResult = { ok: true } | { ok: false; error: "unavailable" | "invalid" };

function snapshot(value: UmrahSnapshot): UmrahSnapshot {
  return { stage: value.stage, completed: [...value.completed], tawaf: value.tawaf, sai: value.sai };
}
function defaultStartMode(scenario: UmrahScenario): UmrahStartMode {
  return scenario === "mecca" ? "mecca" : scenario === "flight" ? "transport" : "miqat";
}
function route(scenario: UmrahScenario, startMode: UmrahStartMode) {
  return { startMode, scenario: startMode === "miqat" ? "ground" as const
    : startMode === "mecca" ? "mecca" as const : scenario === "flight" ? "flight" as const : "ground" as const };
}

export function createUmrahProgress(
  scenario: UmrahScenario = "ground",
  audience: UmrahAudience = "all",
  startMode: UmrahStartMode = defaultStartMode(scenario),
): UmrahProgress {
  return { schemaVersion: 2, ...route(scenario, startMode), audience, acknowledged: false,
    stage: "ihram", completed: [], tawaf: 0, sai: 0, history: [] };
}

function migrateLegacy(value: z.infer<typeof legacyProgressSchema>): UmrahProgress {
  const migrateSnapshot = (item: z.infer<typeof legacySnapshotSchema>): UmrahSnapshot => ({
    stage: item.stage === "preparation" ? "ihram" : item.stage,
    completed: item.completed.filter(stage => stage !== "preparation"),
    tawaf: item.tawaf, sai: item.sai,
  });
  const current = migrateSnapshot(value);
  // Preparation is now reference material. Its old confirmation must not turn
  // into a new ihram confirmation or a no-op Undo entry.
  const history = value.history.map(migrateSnapshot).filter((item, index, all) =>
    JSON.stringify(item) !== JSON.stringify(all[index + 1] ?? current));
  return { schemaVersion: 2, ...route(value.scenario, defaultStartMode(value.scenario)),
    audience: value.audience, acknowledged: value.acknowledged, ...current, history };
}

/** Reading, including a valid v1 migration, never rewrites the persisted value. */
export function loadUmrahProgress(storage?: UmrahStorage): UmrahLoadResult {
  let raw: string | null;
  try {
    const source = storage ?? globalThis.localStorage;
    if (!source) return { status: "unavailable", progress: createUmrahProgress() };
    raw = source.getItem(UMRAH_PROGRESS_KEY);
  } catch {
    return { status: "unavailable", progress: createUmrahProgress() };
  }
  if (raw === null) return { status: "empty", progress: createUmrahProgress() };
  try {
    const decoded: unknown = JSON.parse(raw);
    if (decoded && typeof decoded === "object" && "schemaVersion" in decoded) {
      if (typeof decoded.schemaVersion === "number" && decoded.schemaVersion > 2) {
        return { status: "future-version", progress: createUmrahProgress() };
      }
      if (decoded.schemaVersion === 1) {
        const legacy = legacyProgressSchema.safeParse(decoded);
        if (!legacy.success) return { status: "corrupt", progress: createUmrahProgress() };
        const migrated = progressSchema.safeParse(migrateLegacy(legacy.data));
        return migrated.success ? { status: "ok", progress: migrated.data }
          : { status: "corrupt", progress: createUmrahProgress() };
      }
    }
    const parsed = progressSchema.safeParse(decoded);
    return parsed.success
      ? { status: "ok", progress: parsed.data }
      : { status: "corrupt", progress: createUmrahProgress() };
  } catch {
    return { status: "corrupt", progress: createUmrahProgress() };
  }
}

export function saveUmrahProgress(progress: UmrahProgress, storage?: UmrahStorage): UmrahSaveResult {
  const parsed = progressSchema.safeParse(progress);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    const destination = storage ?? globalThis.localStorage;
    if (!destination) return { ok: false, error: "unavailable" };
    destination.setItem(UMRAH_PROGRESS_KEY, JSON.stringify(parsed.data));
    return { ok: true };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

function remember(state: UmrahProgress, next: Partial<UmrahSnapshot>): UmrahProgress {
  return { ...state, ...next, history: [...state.history, snapshot(state)].slice(-UMRAH_HISTORY_LIMIT) };
}

/** These are the user's notes, not a ruling that any rite was performed or accepted. */
export function reduceUmrahProgress(state: UmrahProgress, action: UmrahAction): UmrahProgress {
  switch (action.type) {
    case "acknowledge":
      return state.acknowledged ? state : { ...state, acknowledged: true };
    case "configure":
      return { ...state, ...route(action.scenario, action.startMode ??
        (action.scenario === state.scenario ? state.startMode : defaultStartMode(action.scenario))), audience: action.audience };
    case "increment":
      if (!state.acknowledged || state.stage !== action.counter || state[action.counter] >= 7 || state.completed.includes(state.stage)) return state;
      return remember(state, { [action.counter]: state[action.counter] + 1 });
    case "confirm-stage": {
      if (!state.acknowledged) return state;
      const index = UMRAH_STAGES.indexOf(state.stage);
      if (state.completed.includes(state.stage)) {
        return { ...state, stage: UMRAH_STAGES[Math.min(index + 1, UMRAH_STAGES.length - 1)] };
      }
      if ((state.stage === "tawaf" && state.tawaf !== 7) || (state.stage === "sai" && state.sai !== 7)) return state;
      return remember(state, {
        completed: [...state.completed, state.stage],
        stage: UMRAH_STAGES[Math.min(index + 1, UMRAH_STAGES.length - 1)],
      });
    }
    case "previous-stage": {
      const index = UMRAH_STAGES.indexOf(state.stage);
      return index === 0 ? state : { ...state, stage: UMRAH_STAGES[index - 1] };
    }
    case "undo": {
      if (!state.acknowledged) return state;
      const previous = state.history.at(-1);
      if (!previous) return state;
      return { ...state, ...previous, completed: [...previous.completed], history: state.history.slice(0, -1) };
    }
    case "reset":
      return { ...createUmrahProgress(state.scenario, state.audience, state.startMode), acknowledged: state.acknowledged };
  }
}
