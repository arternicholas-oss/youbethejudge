// Vercel serverless function: proxies browser calls to Anthropic.
// Adds rate limiting, input validation, and max_tokens cap.

// Simple in-memory rate limiter (per-IP, resets per cold start)
// For production, replace with Upstash Redis rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Allowed models
const ALLOWED_MODELS = [
  "claude-sonnet-4-20250514",
  "claude-haiku-4-5-20251001",
];

// Max tokens cap
const MAX_TOKENS_CAP = 1500;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "https://youbethejudge.ai");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limiting
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Validate required fields
    if (!body || !body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({ error: "Invalid request: messages array required" });
    }

    // Validate model
    if (body.model && !ALLOWED_MODELS.includes(body.model)) {
      return res.status(400).json({ error: "Invalid model" });
    }

    // Cap max_tokens
    const sanitizedBody = {
      model: body.model || "claude-sonnet-4-20250514",
      max_tokens: Math.min(body.max_tokens || 1200, MAX_TOKENS_CAP),
      messages: body.messages.slice(0, 5), // Max 5 messages
    };

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(sanitizedBody),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (err) {
    return res.status(500).json({ error: "Proxy error", detail: String(err) });
  }
}
