// api/case.js — Vercel Serverless Function
// Handles creating/reading/updating cases stored in Upstash Redis
// Supports 2-person AND group (3-6 person) cases
// SMS notifications: nudge Person B, notify all when ready

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

// Send SMS via Twilio REST API (no SDK needed)
async function sendSMS(to, body) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_PHONE || !to) return;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: TWILIO_PHONE, Body: body });
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
  } catch (err) {
    console.error("SMS send failed:", err.message);
  }
}

async function redis(cmd, ...args) {
  const res = await fetch(`${KV_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([cmd, ...args]),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({ error: "Redis not configured" });
  }

  const { code, action } = req.query;

  try {
    // GET /api/case?code=XXXX — read case status
    if (req.method === "GET") {
      if (!code) return res.status(400).json({ error: "Missing code" });
      const raw = await redis("GET", `case:${code}`);
      if (!raw) return res.status(404).json({ error: "Case not found" });
      const caseData = typeof raw === "string" ? JSON.parse(raw) : raw;
      return res.status(200).json(caseData);
    }

    // POST /api/case?action=create — create a new case
    if (req.method === "POST" && action === "create") {
      const { personAName, personBName, topic, relationship, phoneNumber, phoneNumberB,
              isGroup, participants } = req.body;
      // Generate 6-char code
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let newCode = "";
      for (let i = 0; i < 6; i++) newCode += chars[Math.floor(Math.random() * chars.length)];

      let caseData;

      if (isGroup && participants && participants.length > 2) {
        // ── GROUP CASE (3-6 people) ──
        caseData = {
          code: newCode,
          isGroup: true,
          topic: topic || "",
          creatorName: personAName || "Person A",
          phoneNumber: phoneNumber || "",
          participants: participants.map((p, i) => ({
            name: p.name || `Person ${String.fromCharCode(65 + i)}`,
            phone: p.phone || "",
            side: null,
            clarifyQs: [],
            clarifyAns: [],
            submitted: false,
          })),
          status: "waiting", // waiting | all_submitted
          createdAt: Date.now(),
        };
      } else {
        // ── STANDARD 2-PERSON CASE ──
        caseData = {
          code: newCode,
          isGroup: false,
          personAName: personAName || "Person A",
          personBName: personBName || "Person B",
          topic: topic || "",
          relationship: relationship || "",
          phoneNumber: phoneNumber || "",
          phoneNumberB: phoneNumberB || "",
          sideA: null,
          sideB: null,
          clarifyQsA: [],
          clarifyAnsA: [],
          clarifyQsB: [],
          clarifyAnsB: [],
          status: "waiting_for_a",
          createdAt: Date.now(),
        };
      }

      // Cases expire after 7 days
      await redis("SET", `case:${newCode}`, JSON.stringify(caseData), "EX", 604800);

      // Send SMS invite to Person B if phone provided
      if (!isGroup && phoneNumberB) {
        const aName = personAName || "Someone";
        await sendSMS(
          phoneNumberB,
          `${aName} wants to settle an argument with you on YouBeTheJudge! Topic: "${topic}". Submit your side here: https://youbethejudge.ai/join/${newCode}`
        );
      }

      // Send SMS invites to group participants
      if (isGroup && participants) {
        const creator = personAName || "Someone";
        for (const p of participants) {
          if (p.phone) {
            await sendSMS(
              p.phone,
              `${creator} started a group debate on YouBeTheJudge! Topic: "${topic}". Join and submit your side: https://youbethejudge.ai/join/${newCode}`
            );
          }
        }
      }

      return res.status(200).json({ code: newCode, case: caseData });
    }

    // POST /api/case?action=submit_a — Person A submits their side
    if (req.method === "POST" && action === "submit_a") {
      if (!code) return res.status(400).json({ error: "Missing code" });
      const raw = await redis("GET", `case:${code}`);
      if (!raw) return res.status(404).json({ error: "Case not found" });
      const caseData = typeof raw === "string" ? JSON.parse(raw) : raw;

      const { side, clarifyQs, clarifyAns } = req.body;
      caseData.sideA = side;
      caseData.clarifyQsA = clarifyQs || [];
      caseData.clarifyAnsA = clarifyAns || [];
      caseData.status = caseData.sideB ? "both_submitted" : "waiting_for_b";

      await redis("SET", `case:${code}`, JSON.stringify(caseData), "EX", 604800);

      // Nudge Person B via SMS when Person A submits
      if (caseData.status === "waiting_for_b" && caseData.phoneNumberB) {
        const aName = caseData.personAName || "The other person";
        await sendSMS(
          caseData.phoneNumberB,
          `${aName} already submitted their side on YouBeTheJudge! Your turn — submit yours before the verdict drops: https://youbethejudge.ai/join/${code}`
        );
      }

      return res.status(200).json({ status: caseData.status });
    }

    // POST /api/case?action=submit_b — Person B submits their side
    if (req.method === "POST" && action === "submit_b") {
      if (!code) return res.status(400).json({ error: "Missing code" });
      const raw = await redis("GET", `case:${code}`);
      if (!raw) return res.status(404).json({ error: "Case not found" });
      const caseData = typeof raw === "string" ? JSON.parse(raw) : raw;

      const { side, clarifyQs, clarifyAns } = req.body;
      caseData.sideB = side;
      caseData.clarifyQsB = clarifyQs || [];
      caseData.clarifyAnsB = clarifyAns || [];
      caseData.status = caseData.sideA ? "both_submitted" : "waiting_for_a";

      await redis("SET", `case:${code}`, JSON.stringify(caseData), "EX", 604800);

      // Notify Person A via SMS when both sides are in
      if (caseData.status === "both_submitted" && caseData.phoneNumber) {
        const bName = caseData.personBName || "The other person";
        await sendSMS(
          caseData.phoneNumber,
          `${bName} submitted their side on YouBeTheJudge! Both arguments are in — open the app to drop the verdict: https://youbethejudge.ai`
        );
      }

      return res.status(200).json({ status: caseData.status });
    }

    // POST /api/case?action=submit_group — A group participant submits
    if (req.method === "POST" && action === "submit_group") {
      if (!code) return res.status(400).json({ error: "Missing code" });
      const raw = await redis("GET", `case:${code}`);
      if (!raw) return res.status(404).json({ error: "Case not found" });
      const caseData = typeof raw === "string" ? JSON.parse(raw) : raw;

      if (!caseData.isGroup) return res.status(400).json({ error: "Not a group case" });

      const { participantIndex, side, clarifyQs, clarifyAns } = req.body;
      if (participantIndex === undefined || participantIndex < 0 || participantIndex >= caseData.participants.length) {
        return res.status(400).json({ error: "Invalid participant index" });
      }

      caseData.participants[participantIndex].side = side;
      caseData.participants[participantIndex].clarifyQs = clarifyQs || [];
      caseData.participants[participantIndex].clarifyAns = clarifyAns || [];
      caseData.participants[participantIndex].submitted = true;

      // Check if all participants have submitted
      const allSubmitted = caseData.participants.every(p => p.submitted);
      caseData.status = allSubmitted ? "all_submitted" : "waiting";

      await redis("SET", `case:${code}`, JSON.stringify(caseData), "EX", 604800);

      // Notify creator when all are in
      if (allSubmitted && caseData.phoneNumber) {
        await sendSMS(
          caseData.phoneNumber,
          `Everyone has submitted their side on YouBeTheJudge! All ${caseData.participants.length} arguments are in. Drop the verdict: https://youbethejudge.ai`
        );
      }

      const submitted = caseData.participants.filter(p => p.submitted).length;
      return res.status(200).json({
        status: caseData.status,
        submitted,
        total: caseData.participants.length,
      });
    }

    // POST /api/case?action=nudge — Send reminder to pending participants
    if (req.method === "POST" && action === "nudge") {
      if (!code) return res.status(400).json({ error: "Missing code" });
      const raw = await redis("GET", `case:${code}`);
      if (!raw) return res.status(404).json({ error: "Case not found" });
      const caseData = typeof raw === "string" ? JSON.parse(raw) : raw;

      let nudged = 0;

      if (caseData.isGroup) {
        for (const p of caseData.participants) {
          if (!p.submitted && p.phone) {
            await sendSMS(p.phone, `Reminder: Your side hasn't been submitted yet on YouBeTheJudge! Submit before the verdict: https://youbethejudge.ai/join/${code}`);
            nudged++;
          }
        }
      } else {
        if (caseData.status === "waiting_for_b" && caseData.phoneNumberB) {
          await sendSMS(caseData.phoneNumberB, `Reminder: ${caseData.personAName || "Someone"} is waiting for your side on YouBeTheJudge! Submit yours: https://youbethejudge.ai/join/${code}`);
          nudged = 1;
        }
      }

      return res.status(200).json({ nudged });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error("Case API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
