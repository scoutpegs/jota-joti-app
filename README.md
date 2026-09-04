# JOTA-JOTI Dashboard — PWA package

Your original dashboard logic was **not changed**. What was added on top of it:
1. Extra responsive spacing rules (safe-area padding for notched iPhones, fluid container padding, breakpoints for small phones/tablets/desktops).
2. A blocking "Add to Home Screen" popup for iPhone/iPad/Android with step-by-step instructions and small vector icons (no emojis anywhere in the file).
3. PWA setup (`manifest.json`, `sw.js`, `photo1.png`) so it can actually be installed as an app icon.

## Files
```
index.html      ← your dashboard (unchanged logic + added spacing/PWA/install-popup code)
manifest.json   ← tells iOS/Android "this is an app" + name + icon
sw.js           ← service worker (installable + keeps working if offline)
photo1.png      ← the app icon/logo — currently a plain purple placeholder
```

## The logo
`photo1.png` is now your real logo — the atom/scout icon you uploaded, padded to a perfect square and scaled up to 512×512px so it works crisply as a Home Screen icon, browser tab icon, and install-popup image. Your source image was 224×225px, so it's been upscaled slightly; it looks clean at icon sizes, but if you ever get a higher-resolution version of the same logo, just overwrite `photo1.png` (same filename, square) and nothing else needs to change.

## Deploying on GitHub Pages
1. Push `index.html`, `manifest.json`, `sw.js`, and `photo1.png` into the **same folder** of your repo (e.g. repo root).
2. Repo → Settings → Pages → Source: deploy from branch → `main` (or `master`), `/ (root)` → Save.
3. Open the `https://<username>.github.io/<repo>/` URL GitHub gives you after ~1 minute.
4. All paths in the code are relative, so this works whether the site sits at the repo root or in a subfolder — no edits needed either way.

## The install popup
On iPhone/iPad/Android, opening the site in a normal browser tab shows a **full-screen popup that can't be dismissed** — there's no "continue anyway" option, so the dashboard genuinely doesn't open until the app is installed. It:
- **Detects your exact device and browser** and shows matching steps: iPhone vs iPad (share button is in a different toolbar location on each), and for Android — Chrome, Samsung Internet, Firefox, or Edge (each has its menu button in a different place).
- Shows each step as a **numbered row with a small icon** (share icon, plus icon, menu-dots icon, home icon — all drawn as plain vector SVGs, no emoji) describing exactly what to tap, instead of a pointing arrow.
- On Android, if Chrome offers its native install prompt, an **"Install Now"** button appears that triggers it directly.
- Has an **"I've added it — Check again"** button, and also re-checks automatically every 1.5 seconds while open, and instantly when the tab regains focus (e.g. switching to the Home Screen to add the icon, then back to the browser) — no reload needed.
- Once opened from the actual installed Home Screen icon, it's never shown again.

**Desktop browsers are not affected** — the popup only triggers for iPhone/iPad/Android user agents.

**iOS constraint worth knowing:** Apple only allows "Add to Home Screen" from **Safari** itself. If an iPhone/iPad user opens the link in Chrome, Firefox, or an in-app browser (e.g. from Instagram), there's no way to add it from there — the popup detects this and tells them to switch to Safari.

## Testing checklist
- [ ] Open on an actual iPhone in Safari → popup appears with iPhone-specific wording ("bottom toolbar") → follow steps → popup disappears automatically once added.
- [ ] Open on an actual iPad in Safari → popup shows iPad-specific wording ("top toolbar").
- [ ] Open the link inside Instagram/Facebook's in-app browser on iPhone → popup shows the "switch to Safari" warning.
- [ ] Open on an Android phone in Chrome → popup shows Chrome steps, "Install Now" button appears if the browser supports it.
- [ ] Open on Samsung Internet / Firefox Android if you have access → confirm the menu-location wording matches that browser.
- [ ] Open on a laptop/desktop browser → confirm the popup does **not** appear and the dashboard works normally.
- [ ] After installing on a phone, open the app from the Home Screen icon → confirm it opens full-screen (no browser bar) and skips the popup entirely.
