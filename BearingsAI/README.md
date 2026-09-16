# Bearings AI

A bright, touch-friendly frontend for **Escuela Gaspar Castaño de Sosa**. It has three ready-to-demo experiences:

- Student Station: no student sign-in, guided educational questions, microphone input where the browser supports it, and this week’s reading nook.
- Teacher Space: a 60-second wrap-up recorder, editable AI summary, publish flow, and an Imagen-ready illustration studio.
- Family Update: a public, read-only daily classroom update.

The app is intentionally a static site today, so it can be hosted for free and viewed immediately. Demo actions work without accounts or API keys. The future AI/database calls have clear, secure extension points.

## Run locally

Open [`index.html`](index.html) in a current browser. For microphone features, use a local web server or a deployed HTTPS site (browsers require a secure context for microphone permissions).

If Python is installed, from this folder run:

```powershell
py -m http.server 8080
```

Then visit `http://localhost:8080`. Or use any static-host feature in an editor such as VS Code Live Server.

## Deploy free

This project contains only static HTML, CSS, JavaScript, and an image asset. That makes it suitable for free static hosting:

1. Create a GitHub repository and upload these files.
2. In the repository, open **Settings → Pages** and select **Deploy from a branch**, then choose `main` and `/ (root)`.
3. GitHub gives the project a public HTTPS address. Microphone permissions work there after the visitor grants them.

Cloudflare Pages and Netlify’s free tiers also work: connect the repository and set the build command to empty and publish directory to `/`.

## Connect services safely later

Never put a Google Gemini/Imagen API key or Supabase service-role key in browser JavaScript. Instead:

1. Copy `config.example.js` to `config.js` and set only the HTTPS URLs of your own serverless endpoints.
2. Let those functions store real secrets in encrypted environment variables.
3. Point the four endpoints at small functions that validate input, apply the school guardrails, and call Gemini/Imagen or Supabase.

The expected request/response shapes are written beside each setting in [`config.example.js`](config.example.js). The schema for the public family timeline is in [`supabase/schema.sql`](supabase/schema.sql). It permits public reads but deliberately has no browser-side write policy. The server-side Gemini, Imagen, and safety contracts are ready in [`docs/AI-GUARDRAILS.md`](docs/AI-GUARDRAILS.md).

For the student-assistant function, apply a system instruction that limits replies to third-grade educational help, refuses essay-writing and non-school requests, asks guiding questions first, and does not request personal information. The browser’s demo assistant uses the same interaction pattern, but server-side enforcement is required before a real launch.

## Demo notes

- Teacher demo code: `1234`. This is visual gating only, not security. Replace it with Supabase Auth before publishing real classroom information.
- “Publish” stores the draft in the browser for the demo; a configured `publishUpdateEndpoint` will receive the same data.
- The illustration panel makes a styled local preview when no endpoint is configured. With `imagenEndpoint`, return `{ "imageUrl": "..." }` or `{ "imageBase64": "..." }`; the page renders it and enables download automatically.
- The supplied Bearings AI logo is stored at `assets/bearings-ai-logo.png` and used in the header mark.
