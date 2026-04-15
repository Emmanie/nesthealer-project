// Multi-provider AI decision engine for the orchestrate Edge Function.
// Priority: tenant key → global env key → local rule fallback.

import { localRuleEngine, type ActionType, type ModuleRow } from "./guards.ts";
import { decrypt } from "./encryption.ts";

interface TenantSecret {
  provider: string;
  encrypted_key: string;
  iv: string;
  auth_tag: string;
}

type Provider = "openai" | "claude" | "deepseek" | "gemini";
const PROVIDER_ORDER: Provider[] = ["openai", "claude", "deepseek", "gemini"];

const AI_PROMPT = (module: ModuleRow, errorMsg?: string) => `
You are a self-healing website monitoring system. A website has failed.

Website: ${module.id}
URL status: DOWN
Error count: ${module.error_count}
Consecutive failures: ${module.consecutive_failures}
Last error: ${errorMsg ?? "timeout or HTTP error"}

Choose EXACTLY ONE action from this list (respond with only the word):
- repair   (attempt a simple retry)
- restart  (mark as restarting, retry after delay)
- rollback (restore previous known-good config)
- kill     (disable monitoring permanently)
- ignore   (skip — error is transient)

Action:`.trim();

async function callOpenAI(apiKey: string, prompt: string): Promise<ActionType> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 5,
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const json = await res.json();
  return parseAction(json.choices?.[0]?.message?.content ?? "");
}

async function callClaude(apiKey: string, prompt: string): Promise<ActionType> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 5,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const json = await res.json();
  return parseAction(json.content?.[0]?.text ?? "");
}

async function callDeepSeek(
  apiKey: string,
  prompt: string
): Promise<ActionType> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 5,
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
  const json = await res.json();
  return parseAction(json.choices?.[0]?.message?.content ?? "");
}

async function callGemini(
  apiKey: string,
  prompt: string
): Promise<ActionType> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  return parseAction(
    json.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  );
}

function parseAction(raw: string): ActionType {
  const cleaned = raw.toLowerCase().trim();
  const valid: ActionType[] = [
    "repair",
    "restart",
    "rollback",
    "kill",
    "ignore",
  ];
  const found = valid.find((a) => cleaned.includes(a));
  return found ?? "repair";
}

async function decryptKey(secret: TenantSecret): Promise<string> {
  return decrypt(secret.encrypted_key, secret.iv, secret.auth_tag);
}

export async function getAIDecision(
  module: ModuleRow,
  secrets: TenantSecret[],
  errorMsg?: string
): Promise<{ action: ActionType; reason: string }> {
  const prompt = AI_PROMPT(module, errorMsg);

  // Build provider → secret map
  const secretMap = new Map<Provider, TenantSecret>();
  for (const s of secrets) {
    secretMap.set(s.provider as Provider, s);
  }

  // Try providers in priority order, using tenant key if available, then global env key
  for (const provider of PROVIDER_ORDER) {
    const secret = secretMap.get(provider);
    const globalKey = Deno.env.get(`GLOBAL_${provider.toUpperCase()}_KEY`);
    const rawKey = secret
      ? await decryptKey(secret).catch(() => null)
      : globalKey ?? null;

    if (!rawKey) continue;

    try {
      let action: ActionType;
      switch (provider) {
        case "openai":   action = await callOpenAI(rawKey, prompt);   break;
        case "claude":   action = await callClaude(rawKey, prompt);   break;
        case "deepseek": action = await callDeepSeek(rawKey, prompt); break;
        case "gemini":   action = await callGemini(rawKey, prompt);   break;
      }
      return {
        action,
        reason: `AI decision via ${provider}: ${action}`,
      };
    } catch (err) {
      console.warn(`[ai] ${provider} failed: ${err}`);
      // Try next provider
    }
  }

  // All providers failed — use local rule engine
  const action = localRuleEngine(module);
  return { action, reason: `Local rule engine fallback: ${action}` };
}
