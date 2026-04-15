// lib/planLimits.ts — Shared plan quota constants

export type Plan = "basic" | "premium" | "enterprise" | "unlimited" | "custom";

export const PLAN_LIMITS: Record<Exclude<Plan, "custom">, number> = {
  basic:      1,
  premium:    3,
  enterprise: 10,
  unlimited:  999_999,
};

export const PLAN_PRICES: Record<Exclude<Plan, "custom" | "unlimited">, number> = {
  basic:      0,
  premium:    19,
  enterprise: 49,
};

export const PLAN_LABELS: Record<Plan, string> = {
  basic:      "Basic",
  premium:    "Premium",
  enterprise: "Enterprise",
  unlimited:  "Unlimited",
  custom:     "Custom",
};

export function getPlanLimit(
  plan: Plan,
  customLimit?: number | null
): number {
  if (plan === "custom") return customLimit ?? 1;
  return PLAN_LIMITS[plan] ?? 1;
}
