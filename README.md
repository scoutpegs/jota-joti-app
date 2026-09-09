# JOTA-JOTI Dashboard — Boulder Scout Group

Unofficial dashboard for JOTA-JOTI 2026. A countdown page turns into a PIN-protected
dashboard of categories and links in the final 24 hours before the event.

## Structure

```
index.html, style.css, script.js   → the website (deploy these + sw.js, manifest.json, photo1.png to GitHub Pages)
google-apps-script/Code.gs         → the backend API (paste into Extensions → Apps Script on the Google Sheet)
spreadsheet/JOTA-JOTI-Data.xlsx    → a copy of the live data (Users, Categories, Links, Logos, block lists)
```

## Deploying the website (GitHub Pages)

1. Push `index.html`, `style.css`, `script.js`, `sw.js`, `manifest.json` and `photo1.png` to the root of this repo.
2. In the repo settings, enable **Pages** → deploy from the `main` branch, root folder.
3. The site is unofficial JOTA-JOTI dashboard software created by Boulder Scout Group.

## Deploying the backend (Google Apps Script)

1. Open the Google Sheet, then **Extensions → Apps Script**.
2. Replace the script contents with `google-apps-script/Code.gs`.
3. Run **JOTA-JOTI Admin → Run full setup** from the Sheet's menu (reload the Sheet first).
4. **Deploy → New deployment → Web app**, execute as yourself, access "Anyone".
5. Copy the deployment URL into `API_URL` at the top of `script.js`.

## Admin tools (in the Google Sheet menu, "JOTA-JOTI Admin")

- **Manage a scout's account** — search by PIN, Participant ID or name; edit a
  child's name/email; resend the parent's account-details email; or send a
  completion certificate once they've finished JOTA-JOTI.
- **Clear cached data** — forces the dashboard to pull fresh data immediately
  after editing the sheet (the API otherwise caches shared sheets for ~45
  seconds so the site stays fast with lots of people using it at once).
- **Create backup now** / automatic nightly backups to Drive.

## Notes

- Scouts sign in with a 4-digit PIN only. Once signed in, the login is
  remembered on that device — the app won't ask for the PIN again until
  someone taps "Forget saved PIN" or logs out.
- Categories, links and logos are always read live from the sheet on every
  request (nothing about them is cached in the app itself beyond the short
  server-side cache described above).
