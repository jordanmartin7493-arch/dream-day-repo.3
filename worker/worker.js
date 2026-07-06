/**
 * Dream Day AI backend — Cloudflare Worker
 * ----------------------------------------
 * Receives { prompt, userId, max_tokens } from the app,
 * verifies the user's subscription with RevenueCat,
 * calls the Anthropic API with YOUR secret key, returns { text }.
 *
 * Secrets to set (Worker Settings → Variables → add as SECRETS):
 *   ANTHROPIC_API_KEY   — from console.anthropic.com
 *   REVENUECAT_SECRET   — RevenueCat secret key (sk_...). Leave UNSET during
 *                         beta/TestFlight to let everyone use AI free.
 * Plain variables (optional):
 *   ENTITLEMENT         — defaults to "coach"
 *   ALLOWED_ORIGIN      — defaults to "*" (fine for a mobile app)
 */

const MODEL = 'claude-sonnet-4-6';
const MAX_PROMPT_CHARS = 8000;
const MAX_TOKENS_CAP = 2000;

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors },
      });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400); }

    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (!prompt || prompt.length > MAX_PROMPT_CHARS) return json({ error: 'bad prompt' }, 400);
    const maxTokens = Math.min(Number(body.max_tokens) || 1000, MAX_TOKENS_CAP);

    // ---- subscription gate (skipped while REVENUECAT_SECRET is unset) ----
    if (env.REVENUECAT_SECRET) {
      const userId = typeof body.userId === 'string' ? body.userId : '';
      if (!userId) return json({ error: 'not_subscribed' }, 402);
      const rc = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
        { headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET}` } }
      );
      if (!rc.ok) return json({ error: 'not_subscribed' }, 402);
      const sub = await rc.json();
      const ent = sub?.subscriber?.entitlements?.[env.ENTITLEMENT || 'coach'];
      const active = ent && (!ent.expires_date || new Date(ent.expires_date) > new Date());
      if (!active) return json({ error: 'not_subscribed' }, 402);
    }

    // ---- call Anthropic with the server-side secret key ----
    const ai = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!ai.ok) return json({ error: 'ai_error', status: ai.status }, 502);
    const data = await ai.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return json({ text });
  },
};
