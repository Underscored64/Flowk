import jsonLogic from "json-logic-js";

export type RiskLevel = "low" | "medium" | "high";

export type Rule = {
  id: string;
  label: string;
  weight: number;
  /** json-logic expression evaluated against the context object */
  logic: unknown;
};

export type Thresholds = { medium: number; high: number };
export const DEFAULT_THRESHOLDS: Thresholds = { medium: 30, high: 70 };

export type RuleFlag = { id: string; label: string; weight: number };
export type RuleResult = { score: number; level: RiskLevel; flags: RuleFlag[] };

export function levelFor(score: number, t: Thresholds = DEFAULT_THRESHOLDS): RiskLevel {
  if (score >= t.high) return "high";
  if (score >= t.medium) return "medium";
  return "low";
}

/** Pure and deterministic: same rules + same context => same result. No AI involved. */
export function evaluateRules(
  rules: Rule[],
  ctx: Record<string, unknown>,
  t: Thresholds = DEFAULT_THRESHOLDS,
): RuleResult {
  const flags: RuleFlag[] = [];
  for (const r of rules) {
    let hit = false;
    try {
      hit = Boolean(jsonLogic.apply(r.logic as never, ctx));
    } catch {
      hit = false;
    }
    if (hit) flags.push({ id: r.id, label: r.label, weight: r.weight });
  }
  const score = flags.reduce((sum, f) => sum + f.weight, 0);
  return { score, level: levelFor(score, t), flags };
}
