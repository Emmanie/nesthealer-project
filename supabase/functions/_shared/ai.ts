// Multi-provider AI decision engine for the orchestrate Edge Function.
// Enhanced for the AI Surgeon Tool (JSON output + SQL suggestions).

import { localRuleEngine, type ActionType, type ModuleRow } from "./guards.ts";
import { decrypt } from "./encryption.ts";

interface TenantSecret {
  provider: string;
  encrypted_key: string;
  iv: string;
  auth_tag: string;
}

export interface AIDecision {
  action: ActionType;
  reason: string;
  sql?: string;
  recommend_mode?: string;
}

type Provider = "openai" | "claude" | "deepseek" | "gemini";
const PROVIDER_ORDER: Provider[] = ["openai", "claude", "deepseek", "gemini"];

const AI_PROMPT = (module: ModuleRow, errorMsg?: string) => `
You are a database surgeon and self-healing website monitoring system. A website has failed.

Website URL: ${module.url}
Error: ${errorMsg ?? "timeout or connection failure"}
Connector: ${module.supabase_access_level === 'surgeon' ? 'READY (SQL Access enabled)' : 'NONE'}
Current Mode: ${module.autonomy_level ?? 'guardian'} (advisor=alert only, guardian=auto restarts, surgeon=full auto)
Current Plan: ${module.tenants?.plan ?? 'basic'}

Respond ONLY with a JSON object in this format:
{
  "action": "repair" | "restart" | "rollback" | "kill" | "ignore",
  "reason": "short explanation",
  "sql": "optional SQL query to fix the issue if connector is READY",
  "recommend_mode": "optional: 'surgeon' if you think this site needs deeper autonomy to be fixed"
}

SURGEON RULES:
1. Only propose SQL if the connector is 'READY'.
2. NEVER DROP tables. Only use UPDATE, INSERT, or simple schema fixes.
3. Focus on clearing maintenance flags, resetting broken sessions, or fixing known schema drifts mentioned in error logs.
4. If no SQL is needed, omit the "sql" field.

Action Decision:`.trim();

async function callOpenAI(apiKey: string, prompt: string): Promise<AIDecision> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0,
      response_format: { type: "json_object" }
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const json = await res.json();
  return JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
}

async function callClaude(apiKey: string, prompt: string): Promise<AIDecision> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt + " \n\nRespond with JSON only." }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const json = await res.json();
  return JSON.parse(json.content?.[0]?.text ?? "{}");
}

async function callDeepSeek(apiKey: string, prompt: string): Promise<AIDecision> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? "{}";
  // Clean potential markdown code blocks
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

async function callGemini(apiKey: string, prompt: string): Promise<AIDecision> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ 
      contents: [{ parts: [{ text: prompt + " \n\nOutput valid JSON." }] }],
      generationConfig: { responseMimeType: "application/json" }
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  return JSON.parse(json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
}

async function decryptKey(secret: TenantSecret): Promise<string> {
  return decrypt(secret.encrypted_key, secret.iv, secret.auth_tag);
}

export async function getAIDecision(
  module: ModuleRow,
  secrets: TenantSecret[],
  errorMsg?: string
): Promise<AIDecision> {
  const prompt = AI_PROMPT(module, errorMsg);

  const secretMap = new Map<Provider, TenantSecret>();
  for (const s of secrets) {
    secretMap.set(s.provider as Provider, s);
  }

  for (const provider of PROVIDER_ORDER) {
    const secret = secretMap.get(provider);
    const globalKey = Deno.env.get(`GLOBAL_${provider.toUpperCase()}_KEY`);
    const rawKey = secret
      ? await decryptKey(secret).catch(() => null)
      : globalKey ?? null;

    if (!rawKey) continue;

    try {
      let decision: AIDecision;
      switch (provider) {
        case "openai":   decision = await callOpenAI(rawKey, prompt);   break;
        case "claude":   decision = await callClaude(rawKey, prompt);   break;
        case "deepseek": decision = await callDeepSeek(rawKey, prompt); break;
        case "gemini":   decision = await callGemini(rawKey, prompt);   break;
        default: continue;
      }

      // Validate action type
      const valid: ActionType[] = ["repair", "restart", "rollback", "kill", "ignore"];
      if (!valid.includes(decision.action)) decision.action = "repair";

      return {
        ...decision,
        reason: `[${provider}] ${decision.reason}`
      };
    } catch (err) {
      console.warn(`[ai] ${provider} failed: ${err}`);
    }
  }

  // Fallback to local rule engine
  const action = localRuleEngine(module);
  return { 
    action, 
    reason: `Local rule engine fallback: ${action}` 
  };
}
