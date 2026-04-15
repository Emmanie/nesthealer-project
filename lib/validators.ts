// lib/validators.ts — Zod schemas for all API route inputs

import { z } from "zod";

// ── Site / module ────────────────────────────────────────────────────────────
export const AddSiteSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long"),
  url: z
    .string()
    .url("Must be a valid URL (include https://)")
    .refine(
      (u) => u.startsWith("http://") || u.startsWith("https://"),
      "URL must start with http:// or https://"
    ),
});
export type AddSiteInput = z.infer<typeof AddSiteSchema>;

// ── Batch CSV row ────────────────────────────────────────────────────────────
export const BatchRowSchema = z.object({
  name: z.string().min(1),
  url:  z.string().url(),
});

export const BatchImportSchema = z.object({
  rows: z
    .array(BatchRowSchema)
    .min(1, "At least one row required")
    .max(500, "Maximum 500 sites per batch"),
});
export type BatchImportInput = z.infer<typeof BatchImportSchema>;

// ── Secrets ──────────────────────────────────────────────────────────────────
export const AddSecretSchema = z.object({
  provider: z.enum(["openai", "claude", "deepseek", "gemini"]),
  api_key:  z.string().min(10, "API key too short"),
});
export type AddSecretInput = z.infer<typeof AddSecretSchema>;

// ── Admin plan update ────────────────────────────────────────────────────────
export const UpdatePlanSchema = z.object({
  tenant_id:    z.string().uuid(),
  plan:         z.enum(["basic", "premium", "enterprise", "unlimited", "custom"]),
  custom_limit: z.number().int().positive().optional(),
});
export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>;

// ── Alert settings ───────────────────────────────────────────────────────────
export const AlertSettingsSchema = z.object({
  alert_slack_webhook: z.string().url().optional().or(z.literal("")),
  alert_email:         z.string().email().optional().or(z.literal("")),
  alert_webhook:       z.string().url().optional().or(z.literal("")),
});
export type AlertSettingsInput = z.infer<typeof AlertSettingsSchema>;
