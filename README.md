# You Be The Judge — Deploy Guide

AI-powered argument resolution app. Vite + React front-end, with a Vercel serverless function (`/api/claude`) that proxies to the Anthropic API so your key stays server-side.

## Project layout

```
youbethejudge/
├── api/claude.js      ← Vercel serverless proxy (injects ANTHROPIC_API_KEY)
├── src/
│   ├── App.jsx        ← full app (patched to call /api/claude)
│   └── main.jsx
├── index.html         ← loads Plus Jakarta Sans
├── vite.config.js
├── vercel.json
└── package.json
```

## 1. Local run (optional)

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local   # only needed for local API
npm run dev
```

Open http://localhost:5173. Note: the `/api/claude` route only works locally if you run `vercel dev` (via `npm i -g vercel`) instead of `npm run dev`, because it's a Vercel serverless function. Plain `vite dev` will hit a 404 on `/api/claude`.

## 2. Deploy to Vercel

**Option A — via the web UI (easiest):**

1. Create a free account at https://vercel.com.
2. Push this folder to a new GitHub repo (or drag-drop the folder into Vercel's "Add New → Project" importer).
3. Vercel auto-detects Vite. Leave build command (`npm run build`) and output dir (`dist`) as-is.
4. **Environment Variables** → add:
   - `ANTHROPIC_API_KEY` = `sk-ant-...` (get one at https://console.anthropic.com)
5. Click **Deploy**. You'll get a `youbethejudge.vercel.app` URL in ~60 seconds.

**Option B — via CLI:**

```bash
npm i -g vercel
cd youbethejudge
vercel                     # first deploy, follow prompts
vercel env add ANTHROPIC_API_KEY   # paste your key, select Production
vercel --prod              # redeploy with the env var set
```

## 3. Connect YouBeTheJudge.AI (GoDaddy → Vercel)

In **Vercel → your project → Settings → Domains**:

1. Click **Add**, type `youbethejudge.ai`, confirm.
2. Vercel will also offer to add `www.youbethejudge.ai` — accept it. It's common to make one the primary and 301 the other; Vercel handles that with a click.
3. Vercel will show you **two DNS records** to create. They will look like this:

   | Type  | Name / Host | Value                  |
   |-------|-------------|------------------------|
   | A     | @           | `76.76.21.21`          |
   | CNAME | www         | `cname.vercel-dns.com` |

   (Vercel shows the exact values — use whatever it shows, not what's above, in case they change.)

Now in **GoDaddy**:

1. Log in → **My Products** → find `youbethejudge.ai` → click **DNS** (or "Manage DNS").
2. **Delete** any existing A record on `@` that points to a GoDaddy parking page. Also delete the default `CNAME www → @` if Vercel gave you a different CNAME target.
3. Click **Add** → **A Record**:
   - Type: `A`
   - Name: `@`
   - Value: `76.76.21.21` (or whatever Vercel showed)
   - TTL: `1 Hour` (default is fine)
4. Click **Add** → **CNAME**:
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com` (or whatever Vercel showed) — GoDaddy may auto-append a trailing dot, that's OK.
   - TTL: `1 Hour`
5. **Save**.

Back in Vercel, the domain status will flip from "Invalid Configuration" to "Valid Configuration" — usually within 5–30 minutes, sometimes up to a few hours. Vercel provisions an SSL cert automatically once DNS propagates, so `https://youbethejudge.ai` will just work.

## 4. What the app does NOT yet have (prod gaps)

The uploaded zip is a front-end prototype. These features are mocked and will need a backend before launch:

- **Remote flow** (two phones, shared 6-char code) — currently simulated with a demo button. Needs server-side case store + realtime (Supabase realtime or similar).
- **Court vote / comment persistence** — currently React state only. Needs a DB.
- **User accounts** — none yet. Suggest magic link or Google OAuth.
- **Push notifications** — in-app only. Needs FCM/APNs.
- **Comment moderation** — basic word filter. Needs Claude moderation pass + report queue.

See `youbethejudge-dev-brief.md` (in the original handoff) for the full production spec.

## 5. Security note

The prototype in the zip called `https://api.anthropic.com/v1/messages` directly from the browser. That will NOT work in production (CORS + would require exposing your API key to every visitor). This deploy fixes that by routing all Claude calls through `/api/claude`, a Vercel serverless function that attaches the key server-side. **Never commit your API key** — only add it in the Vercel Environment Variables UI.
