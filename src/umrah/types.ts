import type { Locale } from "../../shared/schema";

export const UMRAH_STAGES = ["ihram", "talbiyah", "tawaf", "after-tawaf", "sai", "completion"] as const;
export type UmrahStage = typeof UMRAH_STAGES[number];
export type UmrahScenario = "ground" | "flight" | "mecca";
export type UmrahStartMode = "miqat" | "transport" | "mecca";
export type UmrahAudience = "all" | "men" | "women";
export type UmrahText = Record<Locale, string>;
export interface UmrahSource {
  id: string;
  title: UmrahText;
  url: string;
  reference: string;
  checkedAt: string;
}
export interface UmrahInstruction {
  id: string;
  title?: UmrahText;
  kind: "essential" | "recommended" | "caution" | "context";
  text: UmrahText;
  sourceIds: string[];
  audience?: "men" | "women";
  scenarios?: UmrahScenario[];
  startModes?: UmrahStartMode[];
  arabic?: string;
  meaning?: UmrahText;
}
export interface UmrahStep {
  id: UmrahStage | "preparation";
  title: UmrahText;
  summary: UmrahText;
  instructions: UmrahInstruction[];
}
