export type StageDef = {
  name: string;
  bgColor: string | null;
  borderColor: string | null;
  textColor: string | null;
};

// Used only as a fallback so a stage looks reasonable before it's been
// given its own colors -- once a stage has bgColor/borderColor/textColor
// set, those always win.
const DEFAULT_STAGE_ACCENTS = ["#38bdf8", "#a78bfa", "#facc15", "#34d399", "#f97316", "#f472b6"];

/** Narrows a section's raw `stages` Json column down to a clean StageDef[]. */
export function asStages(value: unknown): StageDef[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const obj = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    return {
      name: typeof obj.name === "string" ? obj.name : "",
      bgColor: typeof obj.bgColor === "string" ? obj.bgColor : null,
      borderColor: typeof obj.borderColor === "string" ? obj.borderColor : null,
      textColor: typeof obj.textColor === "string" ? obj.textColor : null,
    };
  });
}

export type ResolvedStage = {
  name: string;
  bgColor: string | null;
  borderColor: string;
  textColor: string;
};

/** Stage 0 always means "not started"; stages 1..N resolve to that stage's
 * own colors, falling back to a rotating default accent for border/text. */
export function resolveStage(stages: StageDef[], stage: number): ResolvedStage {
  if (stage <= 0) {
    return { name: "Not started", bgColor: null, borderColor: "#4c1d95", textColor: "#8b7fa8" };
  }
  const def = stages[stage - 1];
  const fallbackAccent = DEFAULT_STAGE_ACCENTS[(stage - 1) % DEFAULT_STAGE_ACCENTS.length];
  return {
    name: def?.name || `Stage ${stage}`,
    bgColor: def?.bgColor ?? null,
    borderColor: def?.borderColor ?? fallbackAccent,
    textColor: def?.textColor ?? fallbackAccent,
  };
}
