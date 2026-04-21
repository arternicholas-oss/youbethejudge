// api/debate.js — Daily Debate system
// A new debate topic each day. Users vote, results revealed live.
// Uses Upstash Redis for vote storage (fast counters).

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

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

// 60+ debate topics — rotates daily based on day-of-year
const DEBATE_BANK = [
  { topic: "Who should apologize first after a fight?", options: ["The one who started it", "The one who escalated it"] },
  { topic: "Is leaving dishes 'soaking' actually cleaning them?", options: ["Yes, it counts!", "No, that's not cleaning"] },
  { topic: "Is it okay to recline your seat on a short flight?", options: ["Your seat, your right", "Rude in economy"] },
  { topic: "Should you split the bill on a first date?", options: ["Always split", "Whoever asked pays"] },
  { topic: "Is 'fine' an acceptable answer when someone asks how you are?", options: ["Totally fine", "Low effort, try harder"] },
  { topic: "Can you be best friends with an ex?", options: ["Yes, maturity wins", "No, someone always catches feelings"] },
  { topic: "Is pineapple acceptable on pizza?", options: ["Sweet + savory = chef's kiss", "Absolutely not"] },
  { topic: "Should you text back immediately or wait?", options: ["Text back when you see it", "A little wait is fine"] },
  { topic: "Is it rude to cancel plans the day of?", options: ["Life happens", "Extremely rude"] },
  { topic: "Toilet seat: up or down?", options: ["Everyone puts it down", "Lid position is personal"] },
  { topic: "Is being 5 minutes late really late?", options: ["5 mins is basically on time", "Late is late, period"] },
  { topic: "Should partners share passwords?", options: ["Trust means sharing", "Privacy is not secrecy"] },
  { topic: "Is it wrong to ghost someone after 2 dates?", options: ["After 2 dates, a text is owed", "Ghosting is always fine early on"] },
  { topic: "Can you wear white to someone else's wedding?", options: ["If it's a tasteful outfit", "Never, ever, ever"] },
  { topic: "Is working from home real work?", options: ["Same output, more comfort", "Office presence matters"] },
  { topic: "Should you confront a friend who talks behind your back?", options: ["Direct conversation always", "Distance yourself quietly"] },
  { topic: "Is tipping 20% mandatory or generous?", options: ["Standard baseline", "Above and beyond"] },
  { topic: "Can you call yourself a foodie if you don't cook?", options: ["Eating IS the expertise", "Cook or it doesn't count"] },
  { topic: "Is it weird to go to the movies alone?", options: ["Main character energy", "A little odd"] },
  { topic: "Should couples have a joint bank account?", options: ["Unity in finances", "Keep money separate"] },
  { topic: "Is reading your partner's texts ever justified?", options: ["If you suspect something, yes", "Never, boundaries matter"] },
  { topic: "Should you tell a friend their partner is cheating?", options: ["Honesty above all", "Stay out of it"] },
  { topic: "Is 'quiet quitting' just having healthy boundaries?", options: ["Boundaries, not quitting", "Still unprofessional"] },
  { topic: "Can a morning person and a night owl live together?", options: ["Compromise makes it work", "Recipe for conflict"] },
  { topic: "Is it okay to re-gift a present?", options: ["Reduce, reuse, re-gift", "Thoughtless and lazy"] },
  { topic: "Should kids get participation trophies?", options: ["Encourages effort", "Devalues real achievement"] },
  { topic: "Is cereal a soup?", options: ["Technically yes", "This is unhinged"] },
  { topic: "Should you tell someone they have food in their teeth?", options: ["Always, it's kind", "Depends on the situation"] },
  { topic: "Is it rude to wear earbuds in public?", options: ["My ears, my choice", "Sends an antisocial signal"] },
  { topic: "Should roommates share groceries or keep them separate?", options: ["Sharing is efficient", "Separate — no drama"] },
  { topic: "Is correcting someone's grammar rude?", options: ["Helpful and educational", "Condescending"] },
  { topic: "Can you break up with someone over text?", options: ["If it's early/casual, fine", "In person or call only"] },
  { topic: "Should you vacuum at 8am on a Saturday?", options: ["House needs cleaning", "Have some respect for sleep"] },
  { topic: "Is watching TV during dinner disrespectful?", options: ["We all need to unwind", "Meal time is connect time"] },
  { topic: "Should a guest bring something to a dinner party?", options: ["Always bring something", "Depends on how close you are"] },
  { topic: "Is laughing at your own jokes a red flag?", options: ["Confident and fun", "A little cringe"] },
  { topic: "Should parents be friends with their kids on social media?", options: ["It's just staying connected", "Give them space"] },
  { topic: "Is it okay to eat lunch at your desk?", options: ["Efficient multitasking", "Take a real break"] },
  { topic: "Should you always RSVP?", options: ["Basic courtesy, always", "Only if you're going"] },
  { topic: "Is napping during the day a sign of laziness?", options: ["Power naps are peak performance", "Get it together"] },
];

function getTodaysDebate() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const idx = dayOfYear % DEBATE_BANK.length;
  const debate = DEBATE_BANK[idx];

  // Next debate countdown (midnight UTC)
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const msUntilNext = tomorrow - now;

  return {
    id: `debate_${now.getUTCFullYear()}_${dayOfYear}`,
    ...debate,
    day: dayOfYear,
    nextDebateIn: msUntilNext,
  };
}

function getYesterdaysDebate() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000) - 1;
  const idx = ((dayOfYear % DEBATE_BANK.length) + DEBATE_BANK.length) % DEBATE_BANK.length;
  return {
    id: `debate_${now.getUTCFullYear()}_${dayOfYear}`,
    ...DEBATE_BANK[idx],
    day: dayOfYear,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!KV_URL || !KV_TOKEN) return res.status(500).json({ error: "Redis not configured" });

  const { action } = req.query;

  try {
    // ── GET TODAY'S DEBATE ──
    if (req.method === "GET" && (!action || action === "today")) {
      const debate = getTodaysDebate();
      const key = `debate:${debate.id}`;

      // Get vote counts
      const votesRaw = await redis("HGETALL", `${key}:votes`);
      const votes = [0, 0];
      if (votesRaw && Array.isArray(votesRaw)) {
        for (let i = 0; i < votesRaw.length; i += 2) {
          const optIdx = parseInt(votesRaw[i]);
          if (optIdx === 0 || optIdx === 1) votes[optIdx] = parseInt(votesRaw[i + 1]) || 0;
        }
      }

      // Check if this visitor already voted
      const visitorId = req.query.visitor_id;
      let myVote = null;
      if (visitorId) {
        myVote = await redis("HGET", `${key}:user_votes`, visitorId);
        if (myVote !== null) myVote = parseInt(myVote);
      }

      return res.status(200).json({
        ...debate,
        votes,
        totalVotes: votes[0] + votes[1],
        myVote,
      });
    }

    // ── GET YESTERDAY'S RESULTS ──
    if (req.method === "GET" && action === "yesterday") {
      const debate = getYesterdaysDebate();
      const key = `debate:${debate.id}`;
      const votesRaw = await redis("HGETALL", `${key}:votes`);
      const votes = [0, 0];
      if (votesRaw && Array.isArray(votesRaw)) {
        for (let i = 0; i < votesRaw.length; i += 2) {
          const optIdx = parseInt(votesRaw[i]);
          if (optIdx === 0 || optIdx === 1) votes[optIdx] = parseInt(votesRaw[i + 1]) || 0;
        }
      }

      return res.status(200).json({
        ...debate,
        votes,
        totalVotes: votes[0] + votes[1],
        final: true,
      });
    }

    // ── VOTE ──
    if (req.method === "POST" && action === "vote") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { option, visitor_id } = body; // option: 0 or 1
      if (option !== 0 && option !== 1) return res.status(400).json({ error: "Invalid option" });
      if (!visitor_id) return res.status(400).json({ error: "visitor_id required" });

      const debate = getTodaysDebate();
      const key = `debate:${debate.id}`;

      // Check if already voted
      const existing = await redis("HGET", `${key}:user_votes`, visitor_id);
      if (existing !== null) {
        return res.status(200).json({ already_voted: true, myVote: parseInt(existing) });
      }

      // Record vote
      await redis("HINCRBY", `${key}:votes`, String(option), 1);
      await redis("HSET", `${key}:user_votes`, visitor_id, String(option));
      // Set TTL (48 hours) so old debates clean themselves up
      await redis("EXPIRE", `${key}:votes`, 172800);
      await redis("EXPIRE", `${key}:user_votes`, 172800);

      // Get updated counts
      const votesRaw = await redis("HGETALL", `${key}:votes`);
      const votes = [0, 0];
      if (votesRaw && Array.isArray(votesRaw)) {
        for (let i = 0; i < votesRaw.length; i += 2) {
          const optIdx = parseInt(votesRaw[i]);
          if (optIdx === 0 || optIdx === 1) votes[optIdx] = parseInt(votesRaw[i + 1]) || 0;
        }
      }

      return res.status(200).json({
        voted: true,
        myVote: option,
        votes,
        totalVotes: votes[0] + votes[1],
      });
    }

    return res.status(400).json({ error: "Invalid request" });
  } catch (err) {
    console.error("Debate API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
