// api/case.js — Vercel Serverless Function
// Handles creating/reading/updating cases stored in Upstash Redis

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

    // POST /api/case — create a new case (Person A)
    if (req.method === "POST" && action === "create") {
      const { personAName, personBName, topic, relationship, phoneNumber } = req.body;
      // Generate 6-char code
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let newCode = "";
      for (let i = 0; i < 6; i++) newCode += chars[Math.floor(Math.random() * chars.length)];

      const caseData = {
        code: newCode,
        personAName: personAName || "Person A",
        personBName: personBName || "Person B",
        topic: topic || "",
        relationship: relationship || "",
        phoneNumber: phoneNumber || "",
        sideA: null,
        sideB: null,
        clarifyQsA: [],
        clarifyAnsA: [],
        clarifyQsB: [],
        clarifyAnsB: [],
        status: "waiting_for_a", // waiting_for_a | waiting_for_b | both_submitted
        createdAt: Date.now(),
      };

      await redis("SET", `case:${newCode}`, JSON.stringify(caseData));
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

      await redis("SET", `case:${code}`, JSON.stringify(caseData));
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

      await redis("SET", `case:${code}`, JSON.stringify(caseData));

      // Notify Person A via SMS when both sides are in
      if (caseData.status === "both_submitted" && caseData.phoneNumber) {
        const bName = caseData.personBName || "The other person";
        await sendSMS(
          caseData.phoneNumber,
          `${bName} submitted their side on YouBeTheJudge! Both arguments are in. Open the app to drop the verdict: https://youbethejudge.ai`
        );
      }

      return res.status(200).json({ status: caseData.status });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error("Case API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
