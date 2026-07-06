# Dream Day ✦

A daily planner, accountability journal, and AI coach — built around one question:
*what do you want for your life?*

## Repository layout

```
app/www/index.html    The entire app (planner, journal, coach, dictation, paywall)
worker/worker.js      AI backend — Cloudflare Worker (proxies Anthropic, verifies subscriptions)
worker/wrangler.toml  Worker config (enables Cloudflare's GitHub auto-deploy)
docs/                 Landing page + privacy policy (served free by GitHub Pages)
```

The iOS project is generated locally with Capacitor (see below) and lives in `ios/` once created.

## One-time setup

### 1. Push this repo to GitHub
Use GitHub Desktop (easiest): File → Add Local Repository → choose this folder →
Publish repository (keep it **private**).

### 2. Backend — connect Cloudflare to GitHub (no more copy-paste, ever)
1. Cloudflare dashboard → Workers & Pages → Create → **Workers** tab → **Connect to Git**.
2. Pick this repo. Set **root directory** to `worker/`. Deploy.
3. Worker → Settings → Variables and Secrets → add secret `ANTHROPIC_API_KEY`.
4. (Later, when the beta ends) add secret `REVENUECAT_SECRET` to require subscriptions.

From now on, editing `worker/worker.js` and pushing = automatic deploy.

### 3. Website — turn on GitHub Pages
Repo → Settings → Pages → Source: **Deploy from a branch** → Branch `main`, folder `/docs` → Save.
Your site appears at `https://YOURNAME.github.io/dream-day/` and the privacy policy at
`.../privacy.html`. Put that privacy URL in `CONFIG.LINKS.privacy` in the app, and use it in
App Store Connect. Replace `CONTACT@EXAMPLE.COM` in both docs pages with a real email.

### 4. App config
Edit the `CONFIG` block at the top of the `<script>` in `app/www/index.html`:
- `AI_ENDPOINT` — your Worker URL
- `REVENUECAT_APPLE_KEY` — RevenueCat public key (`appl_...`)
- `DEV_PREMIUM` — `true` for personal/beta builds, `false` for the App Store build
- `LINKS.privacy` — your GitHub Pages privacy URL

### 5. iOS app (Mac + Xcode)
```bash
cd app
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/ios @revenuecat/purchases-capacitor
npx cap init "Dream Day" com.YOURNAME.dreamday --web-dir=www
npx cap add ios && npx cap sync && npx cap open ios
```
In Xcode: set Signing team, add app icon, add `NSMicrophoneUsageDescription` and
`NSSpeechRecognitionUsageDescription` to Info.plist. Run on device to test.

After any change to `app/www/index.html`, run `npx cap sync` before building in Xcode.

## Everyday workflow
1. Edit files locally.
2. Commit + push in GitHub Desktop.
3. Worker redeploys itself; Pages site updates itself.
4. For the iOS app: `npx cap sync` → build/Archive in Xcode.

## Launch sequence (short version)
1. Apple Developer Program ($99/yr, Individual) → App Store Connect: Paid Apps agreement,
   banking, tax, Small Business Program.
2. Create app record + subscription `dreamday_coach_monthly` ($2.99).
3. RevenueCat: project → entitlement `coach` → offering with the product → copy `appl_` key.
4. TestFlight beta (AI free while `REVENUECAT_SECRET` is unset) → gather her audience.
5. Flip: set `REVENUECAT_SECRET` on the Worker, submit `DEV_PREMIUM:false` build for review.
