// supabase/functions/_shared/notifications.ts
// Unified notification system for NeatHealer alerts (Slack, Email, Webhooks)

export async function sendAlert({
  target,
  title,
  text,
  payload,
}: {
  target: {
    slack?: string | null;
    email?: string | null;
    webhook?: string | null;
  };
  title: string;
  text: string;
  payload: any;
}) {
  const promises: Promise<any>[] = [];
  const timeout = 8000;

  // 1. Slack / Discord
  if (target.slack) {
    promises.push(
      fetch(target.slack, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(timeout),
        body: JSON.stringify({ text }),
      }).catch((e) => console.error("Slack alert failed", e))
    );
  }

  // 2. Email (Resend)
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (target.email && resendKey) {
    promises.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(timeout),
        body: JSON.stringify({
          from: "NeatHealer Alerts <alerts@neathealer.app>",
          to: [target.email],
          subject: title,
          text: text,
        }),
      }).catch((e) => console.error("Email alert failed", e))
    );
  }

  // 3. Webhook
  if (target.webhook) {
    promises.push(
      fetch(target.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(timeout),
        body: JSON.stringify(payload),
      }).catch((e) => console.error("Webhook alert failed", e))
    );
  }

  await Promise.allSettled(promises);
}
