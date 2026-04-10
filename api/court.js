// Vercel serverless function: Court API for YouBeTheJudge community features.
// Handles cases, votes, comments, reports, and likes via Supabase REST API.
// Routes via ?action= query parameter.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 30;

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

async function sb(endpoint, opts = {}) {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": opts.prefer || "return=representation",
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

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "https://youbethejudge.ai");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) return res.status(429).json({ error: "Too many requests" });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const { action, id, category, limit, offset } = req.query;

  try {
    const body = req.method === "POST" ? (typeof req.body === "string" ? JSON.parse(req.body) : req.body) : {};

    // ── LIST CASES ──
    if (req.method === "GET" && !action && !id) {
      let q = "/court_cases_with_stats?select=id,topic,category,display_a,display_b,ai_winner,ai_headline,ai_ruling,preview,votes_a,votes_b,total_votes,comment_count,created_at&order=created_at.desc";
      if (category && category !== "All") q += `&category=eq.${encodeURIComponent(category)}`;
      q += `&limit=${Math.min(parseInt(limit)||50, 100)}&offset=${parseInt(offset)||0}`;
      const cases = await sb(q, { method: "GET" });
      return res.status(200).json({ data: cases });
    }

    // ── GET SINGLE CASE ──
    if (req.method === "GET" && id) {
      const cases = await sb(`/court_cases?id=eq.${id}&select=*`);
      if (!cases.length) return res.status(404).json({ error: "Case not found" });
      const [votes, comments] = await Promise.all([
        sb(`/court_votes?case_id=eq.${id}&select=side`),
        sb(`/court_comments?case_id=eq.${id}&hidden=eq.false&order=created_at.desc&select=*`),
      ]);
      const votesA = votes.filter(v => v.side === "a").length;
      const votesB = votes.filter(v => v.side === "b").length;
      return res.status(200).json({
        data: { ...cases[0], votes_a: votesA, votes_b: votesB, total_votes: votes.length, comments }
      });
    }

    // ── SUBMIT CASE ──
    if (action === "submit" && req.method === "POST") {
      const { topic, category, sideA, sideB, displayA, displayB, aiWinner, aiHeadline, aiRuling, verdictJson, preview, visitorId } = body;
      if (!topic || !sideA || !sideB || !aiWinner || !aiHeadline || !aiRuling) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const result = await sb("/court_cases", {
        method: "POST",
        body: JSON.stringify({
          topic, category: category || "Random",
          side_a: sideA, side_b: sideB,
          display_a: displayA || "Person A", display_b: displayB || "Person B",
          ai_winner: aiWinner, ai_headline: aiHeadline, ai_ruling: aiRuling,
          verdict_json: verdictJson || null, preview: preview || aiHeadline,
          visitor_id: visitorId || ip,
        }),
      });
      return res.status(201).json({ data: result[0] });
    }

    // ── VOTE ──
    if (action === "vote" && req.method === "POST") {
      const { caseId, side, visitorId } = body;
      if (!caseId || !["a","b"].includes(side)) return res.status(400).json({ error: "Invalid vote" });
      const vid = visitorId || ip;
      // Upsert: on conflict (case_id, visitor_id) update side
      const result = await sb("/court_votes", {
        method: "POST",
        headers: { "Prefer": "return=representation,resolution=merge-duplicates" },
        body: JSON.stringify({ case_id: caseId, visitor_id: vid, side }),
      });
      return res.status(200).json({ data: result[0] });
    }

    // ── ADD COMMENT ──
    if (action === "comment" && req.method === "POST") {
      const { caseId, username, text, tag, visitorId, parentId } = body;
      if (!caseId || !text?.trim() || !username) return res.status(400).json({ error: "Missing fields" });
      // Basic word filter
      const banned = ["hate","slur","kill","die"];
      if (banned.some(w => text.toLowerCase().includes(w))) return res.status(400).json({ error: "Comment contains prohibited content" });
      const result = await sb("/court_comments", {
        method: "POST",
        body: JSON.stringify({
          case_id: caseId, parent_id: parentId || null,
          username, text: text.trim(), tag: tag || null,
          visitor_id: visitorId || ip,
        }),
      });
      return res.status(201).json({ data: result[0] });
    }

    // ── LIKE COMMENT ──
    if (action === "like" && req.method === "POST") {
      const { commentId, visitorId } = body;
      if (!commentId) return res.status(400).json({ error: "Missing commentId" });
      const vid = visitorId || ip;
      // Check if already liked
      const existing = await sb(`/court_comment_likes?comment_id=eq.${commentId}&visitor_id=eq.${encodeURIComponent(vid)}&select=id`);
      if (existing.length > 0) {
        // Unlike - delete
        await sb(`/court_comment_likes?id=eq.${existing[0].id}`, { method: "DELETE", prefer: "return=minimal" });
        return res.status(200).json({ liked: false });
      } else {
        // Like
        await sb("/court_comment_likes", {
          method: "POST",
          body: JSON.stringify({ comment_id: commentId, visitor_id: vid }),
        });
        return res.status(200).json({ liked: true });
      }
    }

    // ── REPORT COMMENT ──
    if (action === "report" && req.method === "POST") {
      const { commentId, visitorId, reason } = body;
      if (!commentId) return res.status(400).json({ error: "Missing commentId" });
      await sb("/court_comment_reports", {
        method: "POST",
        headers: { "Prefer": "return=representation,resolution=merge-duplicates" },
        body: JSON.stringify({
          comment_id: commentId,
          visitor_id: visitorId || ip,
          reason: reason || "inappropriate",
        }),
      });
      return res.status(200).json({ reported: true });
    }

    // ── CHECK VISITOR VOTE ──
    if (action === "myvote" && req.method === "GET") {
      const { caseId, visitorId } = req.query;
      if (!caseId || !visitorId) return res.status(400).json({ error: "Missing params" });
      const votes = await sb(`/court_votes?case_id=eq.${caseId}&visitor_id=eq.${encodeURIComponent(visitorId)}&select=side`);
      return res.status(200).json({ vote: votes.length > 0 ? votes[0].side : null });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error("Court API error:", err);
    return res.status(500).json({ error: "Server error", detail: String(err) });
  }
}
