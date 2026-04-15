// Guard system for the orchestrate Edge Function
// All state is stored in the database (modules table) — no in-memory state.

export interface ModuleRow {
  id: string;
  tenant_id: string;
  status: string;
  error_count: number;
  consecutive_failures: number;
  circuit_open_until: string | null;
  action_count_minute: number;
  action_count_reset_at: string | null;
}

// ─── ActionGuard ────────────────────────────────────────────────────────────
// Prevents more than MAX_ACTIONS_PER_MINUTE per module per minute.
const MAX_ACTIONS_PER_MINUTE = 3;

export function actionGuardAllows(module: ModuleRow): boolean {
  const resetAt = module.action_count_reset_at
    ? new Date(module.action_count_reset_at)
    : null;
  const now = new Date();

  // Window has expired — would be reset by the caller
  if (!resetAt || now > resetAt) return true;

  return module.action_count_minute < MAX_ACTIONS_PER_MINUTE;
}

/** Returns the fields to update after consuming one action slot. */
export function consumeActionSlot(module: ModuleRow): {
  action_count_minute: number;
  action_count_reset_at: string;
} {
  const resetAt = module.action_count_reset_at
    ? new Date(module.action_count_reset_at)
    : null;
  const now = new Date();

  const windowExpired = !resetAt || now > resetAt;
  const newCount = windowExpired ? 1 : module.action_count_minute + 1;
  const newResetAt = windowExpired
    ? new Date(now.getTime() + 60_000).toISOString()
    : resetAt!.toISOString();

  return { action_count_minute: newCount, action_count_reset_at: newResetAt };
}

// ─── CircuitBreaker ──────────────────────────────────────────────────────────
// After FAILURE_THRESHOLD consecutive failures the circuit opens for OPEN_DURATION_MS.
const FAILURE_THRESHOLD = 3;
const OPEN_DURATION_MS  = 60_000; // 60 seconds

export function circuitBreakerIsOpen(module: ModuleRow): boolean {
  if (!module.circuit_open_until) return false;
  return new Date() < new Date(module.circuit_open_until);
}

/** Returns circuit fields to set when a failure is recorded. */
export function buildCircuitUpdate(module: ModuleRow): {
  consecutive_failures: number;
  circuit_open_until: string | null;
  status: string;
} {
  const newFailures = module.consecutive_failures + 1;
  const shouldOpen  = newFailures >= FAILURE_THRESHOLD;
  return {
    consecutive_failures: newFailures,
    circuit_open_until:   shouldOpen
      ? new Date(Date.now() + OPEN_DURATION_MS).toISOString()
      : null,
    status: shouldOpen ? "circuitOpen" : "error",
  };
}

/** Returns circuit fields to reset after a successful check. */
export function buildCircuitReset(): {
  consecutive_failures: number;
  circuit_open_until: null;
  error_count: number;
  status: string;
  last_success: string;
} {
  return {
    consecutive_failures: 0,
    circuit_open_until:   null,
    error_count:          0,
    status:               "active",
    last_success:         new Date().toISOString(),
  };
}

// ─── Local rule-engine fallback ──────────────────────────────────────────────
// Used when no AI provider is available.
export type ActionType = "repair" | "restart" | "rollback" | "kill" | "ignore";

export function localRuleEngine(module: ModuleRow): ActionType {
  if (module.consecutive_failures >= 5) return "kill";
  if (module.consecutive_failures >= 3) return "rollback";
  if (module.consecutive_failures >= 2) return "restart";
  return "repair";
}
