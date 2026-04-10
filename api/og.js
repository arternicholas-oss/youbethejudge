// Dynamic OG Image Generation for shared verdict links
// Generates SVG social cards (1200x630) — no external dependencies needed

export default function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const topic = url.searchParams.get("topic") || "Court is in Session";
    const winner = url.searchParams.get("winner") || "Tie";
    const scoreA = parseInt(url.searchParams.get("scoreA") || "50");
    const scoreB = parseInt(url.searchParams.get("scoreB") || "50");
    const headline = url.searchParams.get("headline") || "";
    const nameA = url.searchParams.get("nameA") || "Person A";
    const nameB = url.searchParams.get("nameB") || "Person B";

    const truncate = (s, max) => s.length > max ? s.slice(0, max - 3) + "..." : s;
    const barWidthA = Math.round((scoreA / 100) * 480);
    const barWidthB = Math.round((scoreB / 100) * 480);

    const headlineSvg = headline
      ? `<text x="60" y="260" fill="#F4724A" font-size="28" font-weight="700" font-family="system-ui,-apple-system,sans-serif">${escapeXml(truncate(headline, 80))}</text>`
      : "";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FDF8F5"/>

  <!-- Tagline -->
  <text x="60" y="70" fill="#E8445A" font-size="20" font-weight="600" font-family="system-ui,-apple-system,sans-serif" letter-spacing="0.5">
    Finally, a judge who doesn&apos;t take sides.
  </text>

  <!-- Topic -->
  <text x="60" y="140" fill="#1A1412" font-size="48" font-weight="800" font-family="system-ui,-apple-system,sans-serif">
    ${escapeXml(truncate(topic, 50))}
  </text>

  ${headlineSvg}

  <!-- Person A -->
  <text x="180" y="370" fill="#E8445A" font-size="18" font-weight="700" font-family="system-ui,-apple-system,sans-serif" text-anchor="middle">
    ${escapeXml(truncate(nameA, 20))}
  </text>
  <rect x="60" y="385" width="480" height="24" rx="12" fill="#EDE6DF"/>
  <rect x="60" y="385" width="${barWidthA}" height="24" rx="12" fill="#E8445A"/>
  <text x="180" y="440" fill="#E8445A" font-size="36" font-weight="800" font-family="system-ui,-apple-system,sans-serif" text-anchor="middle">
    ${scoreA}
  </text>

  <!-- vs -->
  <text x="600" y="415" fill="#B0A49E" font-size="24" font-weight="800" font-family="system-ui,-apple-system,sans-serif" text-anchor="middle">
    vs
  </text>

  <!-- Person B -->
  <text x="900" y="370" fill="#3A6FD4" font-size="18" font-weight="700" font-family="system-ui,-apple-system,sans-serif" text-anchor="middle">
    ${escapeXml(truncate(nameB, 20))}
  </text>
  <rect x="660" y="385" width="480" height="24" rx="12" fill="#EDE6DF"/>
  <rect x="660" y="385" width="${barWidthB}" height="24" rx="12" fill="#3A6FD4"/>
  <text x="900" y="440" fill="#3A6FD4" font-size="36" font-weight="800" font-family="system-ui,-apple-system,sans-serif" text-anchor="middle">
    ${scoreB}
  </text>

  <!-- Footer line -->
  <line x1="60" y1="550" x2="1140" y2="550" stroke="#EDE6DF" stroke-width="2"/>

  <!-- Footer text -->
  <text x="60" y="590" fill="#E8445A" font-size="22" font-weight="800" font-family="system-ui,-apple-system,sans-serif">
    youbethejudge.ai
  </text>
  <text x="1140" y="590" fill="#6B5E58" font-size="18" font-weight="600" font-family="system-ui,-apple-system,sans-serif" text-anchor="end">
    Winner: ${escapeXml(winner)}
  </text>
</svg>`;

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.status(200).send(svg);
  } catch (e) {
    res.status(500).send("Error generating image");
  }
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
