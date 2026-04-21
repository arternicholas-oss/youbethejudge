// api/auth.js — Authentication: Phone OTP via Twilio + Google OAuth via Supabase
// Handles: send_otp, verify_otp, google_callback, me, update_profile

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SID = process.env.TWILIO_VERIFY_SID; // Twilio Verify service
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

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

// Generate a simple session token
function generateToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 48; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

// Send OTP via Twilio Verify (or fallback to direct SMS)
async function sendOTP(phone) {
  // Use Twilio Verify API if configured
  if (TWILIO_VERIFY_SID) {
    const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}/Verifications`;
    const params = new URLSearchParams({ To: phone, Channel: "sms" });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json();
    return { success: res.ok, sid: data.sid };
  }

  // Fallback: generate OTP and send via SMS
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await redis("SET", `otp:${phone}`, otp, "EX", 300); // 5 min expiry

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const params = new URLSearchParams({
    To: phone,
    From: TWILIO_PHONE,
    Body: `Your YouBeTheJudge code is: ${otp}. Valid for 5 minutes.`,
  });
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  return { success: true };
}

// Verify OTP
async function verifyOTP(phone, code) {
  if (TWILIO_VERIFY_SID) {
    const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}/VerificationCheck`;
    const params = new URLSearchParams({ To: phone, Code: code });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json();
    return data.status === "approved";
  }

  // Fallback: check Redis
  const stored = await redis("GET", `otp:${phone}`);
  if (stored === code) {
    await redis("DEL", `otp:${phone}`);
    return true;
  }
  return false;
}

// Find or create user by phone
async function findOrCreateUserByPhone(phone) {
  let users = await sb(`/ybtj_users?phone=eq.${encodeURIComponent(phone)}&select=*`);
  if (users && users.length > 0) return users[0];

  // Create new user
  const result = await sb("/ybtj_users", {
    method: "POST",
    body: JSON.stringify({
      phone,
      display_name: "User" + phone.slice(-4),
      tier: "free",
      verdicts_used: 0,
      verdicts_reset_at: new Date().toISOString(),
    }),
  });
  return result[0];
}

// Find or create user by Google profile
async function findOrCreateUserByGoogle(googleId, email, name, avatar) {
  let users = await sb(`/ybtj_users?google_id=eq.${encodeURIComponent(googleId)}&select=*`);
  if (users && users.length > 0) return users[0];

  // Check if email already exists
  if (email) {
    users = await sb(`/ybtj_users?email=eq.${encodeURIComponent(email)}&select=*`);
    if (users && users.length > 0) {
      // Link Google to existing account
      await sb(`/ybtj_users?id=eq.${users[0].id}`, {
        method: "PATCH",
        body: JSON.stringify({ google_id: googleId, avatar_url: avatar }),
      });
      return { ...users[0], google_id: googleId, avatar_url: avatar };
    }
  }

  const result = await sb("/ybtj_users", {
    method: "POST",
    body: JSON.stringify({
      google_id: googleId,
      email,
      display_name: name || "User",
      avatar_url: avatar,
      tier: "free",
      verdicts_used: 0,
      verdicts_reset_at: new Date().toISOString(),
    }),
  });
  return result[0];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  const { action } = req.query;

  try {
    const body = req.method === "POST" ? (typeof req.body === "string" ? JSON.parse(req.body) : req.body) : {};

    // ── SEND OTP ──
    if (action === "send_otp" && req.method === "POST") {
      const { phone } = body;
      if (!phone || phone.length < 10) return res.status(400).json({ error: "Valid phone number required" });
      const result = await sendOTP(phone);
      return res.status(200).json({ sent: result.success });
    }

    // ── VERIFY OTP & LOGIN ──
    if (action === "verify_otp" && req.method === "POST") {
      const { phone, code } = body;
      if (!phone || !code) return res.status(400).json({ error: "Phone and code required" });

      const valid = await verifyOTP(phone, code);
      if (!valid) return res.status(401).json({ error: "Invalid or expired code" });

      const user = await findOrCreateUserByPhone(phone);
      const token = generateToken();
      // Store session in Redis (30 day expiry)
      await redis("SET", `session:${token}`, JSON.stringify({ userId: user.id }), "EX", 2592000);

      return res.status(200).json({ token, user });
    }

    // ── GOOGLE LOGIN CALLBACK ──
    if (action === "google_login" && req.method === "POST") {
      const { google_id, email, name, avatar } = body;
      if (!google_id) return res.status(400).json({ error: "Google ID required" });

      const user = await findOrCreateUserByGoogle(google_id, email, name, avatar);
      const token = generateToken();
      await redis("SET", `session:${token}`, JSON.stringify({ userId: user.id }), "EX", 2592000);

      return res.status(200).json({ token, user });
    }

    // ── GET CURRENT USER ──
    if (action === "me" && req.method === "GET") {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Not authenticated" });

      const token = authHeader.slice(7);
      const session = await redis("GET", `session:${token}`);
      if (!session) return res.status(401).json({ error: "Session expired" });

      const { userId } = typeof session === "string" ? JSON.parse(session) : session;
      const users = await sb(`/ybtj_users?id=eq.${userId}&select=*`);
      if (!users?.length) return res.status(404).json({ error: "User not found" });

      // Check if verdicts_used needs monthly reset
      const user = users[0];
      const resetDate = new Date(user.verdicts_reset_at);
      const now = new Date();
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        await sb(`/ybtj_users?id=eq.${userId}`, {
          method: "PATCH",
          body: JSON.stringify({ verdicts_used: 0, verdicts_reset_at: now.toISOString() }),
        });
        user.verdicts_used = 0;
        user.verdicts_reset_at = now.toISOString();
      }

      return res.status(200).json({ user });
    }

    // ── UPDATE PROFILE ──
    if (action === "update_profile" && req.method === "POST") {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Not authenticated" });

      const token = authHeader.slice(7);
      const session = await redis("GET", `session:${token}`);
      if (!session) return res.status(401).json({ error: "Session expired" });

      const { userId } = typeof session === "string" ? JSON.parse(session) : session;
      const { display_name, email } = body;
      const updates = {};
      if (display_name) updates.display_name = display_name.slice(0, 30);
      if (email) updates.email = email;

      if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update" });

      await sb(`/ybtj_users?id=eq.${userId}`, { method: "PATCH", body: JSON.stringify(updates) });
      const users = await sb(`/ybtj_users?id=eq.${userId}&select=*`);
      return res.status(200).json({ user: users[0] });
    }

    // ── INCREMENT VERDICT COUNT ──
    if (action === "use_verdict" && req.method === "POST") {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Not authenticated" });

      const token = authHeader.slice(7);
      const session = await redis("GET", `session:${token}`);
      if (!session) return res.status(401).json({ error: "Session expired" });

      const { userId } = typeof session === "string" ? JSON.parse(session) : session;
      const users = await sb(`/ybtj_users?id=eq.${userId}&select=*`);
      if (!users?.length) return res.status(404).json({ error: "User not found" });

      const user = users[0];

      // Pro users and party pack users don't consume verdicts
      if (user.tier === "pro" || (user.party_expires_at && new Date(user.party_expires_at) > new Date())) {
        return res.status(200).json({ allowed: true, remaining: "unlimited" });
      }

      // Check monthly reset
      const resetDate = new Date(user.verdicts_reset_at);
      const now = new Date();
      let used = user.verdicts_used;
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        used = 0;
        await sb(`/ybtj_users?id=eq.${userId}`, {
          method: "PATCH",
          body: JSON.stringify({ verdicts_used: 0, verdicts_reset_at: now.toISOString() }),
        });
      }

      const FREE_LIMIT = 3;
      if (used >= FREE_LIMIT) {
        return res.status(200).json({ allowed: false, remaining: 0, used, limit: FREE_LIMIT });
      }

      await sb(`/ybtj_users?id=eq.${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ verdicts_used: used + 1 }),
      });

      return res.status(200).json({ allowed: true, remaining: FREE_LIMIT - used - 1, used: used + 1 });
    }

    // ── LOGOUT ──
    if (action === "logout" && req.method === "POST") {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        await redis("DEL", `session:${authHeader.slice(7)}`);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error("Auth API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
