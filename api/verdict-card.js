// api/verdict-card.js — Generate shareable verdict cards as SVG
// Returns SVG that can be rendered client-side or converted to PNG
// Query params: topic, winner, personA, personB, scoreA, scoreB, headline, mode (story|link)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  const {
    topic = "Who's right?",
    winner = "A",
    personA = "Person A",
    personB = "Person B",
    scoreA = "72",
    scoreB = "41",
    headline = "The verdict is in.",
    mode = "story", // "story" = 1080x1920, "link" = 1200x630
  } = req.query;

  const isStory = mode === "story";
  const w = isStory ? 1080 : 1200;
  const h = isStory ? 1920 : 630;

  // Winner/loser labels
  const winnerName = winner === "A" ? personA : winner === "B" ? personB : "Tie";
  const winnerScore = winner === "A" ? scoreA : winner === "B" ? scoreB : scoreA;
  const loserName = winner === "A" ? personB : winner === "B" ? personA : personB;
  const loserScore = winner === "A" ? scoreB : winner === "B" ? scoreA : scoreB;
  const isTie = winner === "Tie" || winner === "tie";

  // Color palette
  const bgGradStart = "#FDF8F5";
  const bgGradEnd = "#FFF0F3";
  const rose = "#E8445A";
  const peach = "#F4724A";
  const textDark = "#1A1412";
  const textMid = "#6B5E58";
  const gold = "#D4860A";
  const teal = "#2BA880";

  // Truncate text helper
  const truncate = (str, max) => str.length > max ? str.slice(0, max - 1) + "…" : str;
  const safeTopic = truncate(topic, 60).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeHeadline = truncate(headline, 80).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safePersonA = truncate(personA, 20).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const safePersonB = truncate(personB, 20).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  const barWidth = 400;
  const totalScore = parseInt(scoreA) + parseInt(scoreB);
  const barA = totalScore > 0 ? (parseInt(scoreA) / totalScore) * barWidth : barWidth / 2;

  let svg;

  if (isStory) {
    // ── STORY FORMAT (1080x1920) ──
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bgGradStart}"/>
      <stop offset="100%" stop-color="${bgGradEnd}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${rose}"/>
      <stop offset="100%" stop-color="${peach}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>

  <!-- Logo area -->
  <text x="540" y="200" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="42" font-weight="800" fill="${rose}">You Be The Judge</text>
  <text x="540" y="250" text-anchor="middle" font-family="sans-serif" font-size="48">&#x2696;&#xFE0F;</text>

  <!-- Topic -->
  <rect x="100" y="340" width="880" height="160" rx="30" fill="white" stroke="#EDE6DF" stroke-width="3"/>
  <text x="540" y="390" text-anchor="middle" font-family="sans-serif" font-size="22" fill="${textMid}" font-weight="600" letter-spacing="2">THE ARGUMENT</text>
  <text x="540" y="450" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="38" font-weight="800" fill="${textDark}">${safeTopic}</text>

  <!-- VS Section -->
  <text x="540" y="620" text-anchor="middle" font-family="sans-serif" font-size="28" fill="${textMid}" font-weight="700">VS</text>

  <!-- Person A -->
  <rect x="100" y="660" width="380" height="200" rx="24" fill="white" stroke="${winner === 'A' ? teal : '#EDE6DF'}" stroke-width="${winner === 'A' ? 4 : 2}"/>
  <text x="290" y="730" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="32" font-weight="800" fill="${textDark}">${safePersonA}</text>
  <text x="290" y="800" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="72" font-weight="800" fill="${winner === 'A' ? teal : textMid}">${scoreA}</text>
  ${winner === "A" ? `<text x="290" y="840" text-anchor="middle" font-family="sans-serif" font-size="24" fill="${teal}" font-weight="700">WINNER</text>` : ""}

  <!-- Person B -->
  <rect x="600" y="660" width="380" height="200" rx="24" fill="white" stroke="${winner === 'B' ? teal : '#EDE6DF'}" stroke-width="${winner === 'B' ? 4 : 2}"/>
  <text x="790" y="730" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="32" font-weight="800" fill="${textDark}">${safePersonB}</text>
  <text x="790" y="800" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="72" font-weight="800" fill="${winner === 'B' ? teal : textMid}">${scoreB}</text>
  ${winner === "B" ? `<text x="790" y="840" text-anchor="middle" font-family="sans-serif" font-size="24" fill="${teal}" font-weight="700">WINNER</text>` : ""}

  <!-- Verdict card -->
  <rect x="100" y="960" width="880" height="300" rx="30" fill="white" stroke="${rose}40" stroke-width="3"/>
  <text x="540" y="1020" text-anchor="middle" font-family="sans-serif" font-size="22" fill="${rose}" font-weight="700" letter-spacing="2">THE VERDICT</text>
  <text x="540" y="1100" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="36" font-weight="800" fill="${textDark}">${isTie ? "It's a tie!" : `${winnerName} wins!`}</text>
  <text x="540" y="1170" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="26" fill="${textMid}" font-weight="500">${safeHeadline}</text>

  <!-- Score bar -->
  <rect x="340" y="1350" width="${barWidth}" height="20" rx="10" fill="#EDE6DF"/>
  <rect x="340" y="1350" width="${barA}" height="20" rx="10" fill="${rose}"/>
  <text x="320" y="1365" text-anchor="end" font-family="sans-serif" font-size="22" fill="${textMid}" font-weight="600">${scoreA}</text>
  <text x="760" y="1365" text-anchor="start" font-family="sans-serif" font-size="22" fill="${textMid}" font-weight="600">${scoreB}</text>

  <!-- CTA -->
  <rect x="240" y="1520" width="600" height="100" rx="24" fill="url(#accent)"/>
  <text x="540" y="1585" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="30" font-weight="700" fill="white">Settle YOUR argument at youbethejudge.ai</text>

  <!-- Footer -->
  <text x="540" y="1800" text-anchor="middle" font-family="sans-serif" font-size="20" fill="${textMid}">youbethejudge.ai</text>
</svg>`;
  } else {
    // ── LINK PREVIEW FORMAT (1200x630) ──
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgGradStart}"/>
      <stop offset="100%" stop-color="${bgGradEnd}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${rose}"/>
      <stop offset="100%" stop-color="${peach}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>

  <!-- Left side: Topic + Verdict -->
  <text x="60" y="80" font-family="'Plus Jakarta Sans',sans-serif" font-size="28" font-weight="800" fill="${rose}">You Be The Judge &#x2696;&#xFE0F;</text>

  <text x="60" y="160" font-family="'Plus Jakarta Sans',sans-serif" font-size="36" font-weight="800" fill="${textDark}">${safeTopic}</text>

  <text x="60" y="240" font-family="sans-serif" font-size="18" fill="${rose}" font-weight="700" letter-spacing="2">THE VERDICT</text>
  <text x="60" y="290" font-family="'Plus Jakarta Sans',sans-serif" font-size="30" font-weight="800" fill="${textDark}">${isTie ? "It's a tie!" : `${winnerName} wins!`}</text>
  <text x="60" y="340" font-family="'Plus Jakarta Sans',sans-serif" font-size="22" fill="${textMid}">${safeHeadline}</text>

  <!-- Score bar -->
  <rect x="60" y="400" width="500" height="14" rx="7" fill="#EDE6DF"/>
  <rect x="60" y="400" width="${(parseInt(scoreA) / totalScore) * 500}" height="14" rx="7" fill="${rose}"/>
  <text x="60" y="450" font-family="sans-serif" font-size="16" fill="${textMid}">${safePersonA}: ${scoreA}</text>
  <text x="560" y="450" text-anchor="end" font-family="sans-serif" font-size="16" fill="${textMid}">${safePersonB}: ${scoreB}</text>

  <!-- Right side: Scores -->
  <rect x="750" y="100" width="180" height="200" rx="24" fill="white" stroke="${winner === 'A' ? teal : '#EDE6DF'}" stroke-width="3"/>
  <text x="840" y="170" text-anchor="middle" font-family="sans-serif" font-size="16" fill="${textMid}" font-weight="600">${safePersonA}</text>
  <text x="840" y="240" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="56" font-weight="800" fill="${winner === 'A' ? teal : textMid}">${scoreA}</text>
  ${winner === "A" ? `<text x="840" y="280" text-anchor="middle" font-family="sans-serif" font-size="14" fill="${teal}" font-weight="700">WINNER</text>` : ""}

  <rect x="960" y="100" width="180" height="200" rx="24" fill="white" stroke="${winner === 'B' ? teal : '#EDE6DF'}" stroke-width="3"/>
  <text x="1050" y="170" text-anchor="middle" font-family="sans-serif" font-size="16" fill="${textMid}" font-weight="600">${safePersonB}</text>
  <text x="1050" y="240" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="56" font-weight="800" fill="${winner === 'B' ? teal : textMid}">${scoreB}</text>
  ${winner === "B" ? `<text x="1050" y="280" text-anchor="middle" font-family="sans-serif" font-size="14" fill="${teal}" font-weight="700">WINNER</text>` : ""}

  <!-- CTA -->
  <rect x="750" y="380" width="390" height="60" rx="16" fill="url(#accent)"/>
  <text x="945" y="420" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="20" font-weight="700" fill="white">Settle yours at youbethejudge.ai</text>

  <!-- Footer -->
  <text x="60" y="560" font-family="sans-serif" font-size="16" fill="${textMid}">youbethejudge.ai</text>
</svg>`;
  }

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.status(200).send(svg);
}
