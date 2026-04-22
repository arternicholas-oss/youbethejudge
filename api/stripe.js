// api/stripe.js — Stripe Checkout for YouBeTheJudge
// Supports: per-verdict purchase ($0.99), roast verdict ($2.99),
// Pro annual ($19.99/yr), Party Pack ($4.99 one-time 24hr)
// Uses Stripe API directly via fetch — no npm dependency

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// Stripe Price IDs (set these in Vercel env vars)
const PRICES = {
  verdict: process.env.STRIPE_VERDICT_PRICE_ID,       // $0.99 one-time
  roast: process.env.STRIPE_ROAST_PRICE_ID,            // $2.99 one-time
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,  // $19.99/yr recurring
  party: process.env.STRIPE_PARTY_PRICE_ID,            // $4.99 one-time
};

async function stripeAPI(endpoint, params) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Stripe error");
  return data;
}

async function stripeGet(endpoint) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET}` },
  });
  return res.json();
}

async function redis(cmd, ...args) {
  const res = await fetch(KV_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([cmd, ...args]),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function sb(endpoint, opts = {}) {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const session = await redis("GET", `session:${token}`);
  if (!session) return null;
  const { userId } = typeof session === "string" ? JSON.parse(session) : session;
  const users = await sb(`/ybtj_users?id=eq.${userId}&select=*`);
  return users?.[0] || null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!STRIPE_SECRET) return res.status(500).json({ error: "Stripe not configured" });

  const { action } = req.query;

  try {
    const body = req.method === "POST" ? (typeof req.body === "string" ? JSON.parse(req.body) : req.body) : {};
    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "https://youbethejudge.ai";

    // ── CHECKOUT: Create session for any product ──
    if (action === "checkout" && req.method === "POST") {
      const { product, user_id } = body;
      // product: "verdict" | "roast" | "pro_annual" | "party"
      const priceId = PRICES[product] || PRICES.pro_annual;

      if (!priceId) return res.status(400).json({ error: `Price not configured for: ${product}` });

      const isSubscription = product === "pro_annual";
      const params = new URLSearchParams();
      params.append("mode", isSubscription ? "subscription" : "payment");
      params.append("line_items[0][price]", priceId);
      params.append("line_items[0][quantity]", "1");
      params.append("success_url", `${origin}?purchase=${product}&status=success&session_id={CHECKOUT_SESSION_ID}`);
      params.append("cancel_url", `${origin}?purchase=${product}&status=cancel`);
      params.append("allow_promotion_codes", "true");

      if (user_id) params.append("client_reference_id", user_id);

      // Add metadata to track product type
      params.append("metadata[product]", product);
      if (user_id) params.append("metadata[user_id]", user_id);

      const session = await stripeAPI("/checkout/sessions", params);
      return res.status(200).json({ url: session.url, session_id: session.id });
    }

    // ── FULFILL: Process successful payment ──
    if (action === "fulfill" && req.method === "POST") {
      const { session_id } = body;
      if (!session_id) return res.status(400).json({ error: "session_id required" });

      const session = await stripeGet(`/checkout/sessions/${session_id}`);
      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "Payment not completed" });
      }

      const product = session.metadata?.product || "pro_annual";
      const userId = session.metadata?.user_id || session.client_reference_id;

      if (userId) {
        if (product === "pro_annual") {
          await sb(`/ybtj_users?id=eq.${userId}`, {
            method: "PATCH",
            body: JSON.stringify({
              tier: "pro",
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
            }),
          });
        } else if (product === "party") {
          const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await sb(`/ybtj_users?id=eq.${userId}`, {
            method: "PATCH",
            body: JSON.stringify({ party_expires_at: expires }),
          });
        } else if (product === "verdict" || product === "roast") {
          // Grant one additional verdict
          const users = await sb(`/ybtj_users?id=eq.${userId}&select=bonus_verdicts`);
          const current = users?.[0]?.bonus_verdicts || 0;
          await sb(`/ybtj_users?id=eq.${userId}`, {
            method: "PATCH",
            body: JSON.stringify({ bonus_verdicts: current + 1 }),
          });
        }
      }

      return res.status(200).json({
        product,
        status: "fulfilled",
        customer: session.customer,
      });
    }

    // ── STATUS: Check session ──
    if (action === "status") {
      const { session_id } = req.query;
      if (!session_id) return res.status(400).json({ error: "session_id required" });
      const session = await stripeGet(`/checkout/sessions/${session_id}`);
      return res.status(200).json({
        status: session.payment_status,
        product: session.metadata?.product,
        subscription: session.subscription,
        customer: session.customer,
      });
    }

    // ── MANAGE: Customer portal ──
    if (action === "manage" && req.method === "POST") {
      const { customer_id } = body;
      if (!customer_id) return res.status(400).json({ error: "customer_id required" });

      const params = new URLSearchParams();
      params.append("customer", customer_id);
      params.append("return_url", origin);

      const portal = await stripeAPI("/billing_portal/sessions", params);
      return res.status(200).json({ url: portal.url });
    }

    return res.status(400).json({ error: "Unknown action. Use ?action=checkout, fulfill, status, or manage" });
  } catch (e) {
    console.error("Stripe error:", e);
    return res.status(500).json({ error: e.message || "Internal error" });
  }
}