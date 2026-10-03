# Boulder Scout Group – JOTA-JOTI 2026

## This package

This package is the cleaned Boulder Scout Group JOTA-JOTI deployment built from the supplied site framework.

It keeps the existing frontend structure and uses the exact existing Google Sheet schema. The live workbook is intentionally **not** included in this public deployment package because the supplied workbook contains real account credentials and participant information. Continue using that workbook as the bound Google Sheet for the Apps Script.

## Important data rule

The original `Users` sheet is the single source of truth for accounts.

Registration:
`Google Form → Users sheet → account ready`

Login:
`PIN → Users sheet → signed session → dashboard`

There is no backup account store, backup spreadsheet, backup Drive folder, backup trigger, backup restore path, or backup authentication dependency.

## Apps Script

1. Open the exact supplied Boulder JOTA-JOTI Google Sheet.
2. Open **Extensions → Apps Script**.
3. Replace the existing backend with `backend/Code.gs` from this package.
4. Save.
5. Run `setupEOISystem()` once and authorise the required permissions.
6. Deploy as **Web app**.
7. Use the deployed `/exec` URL in `config.js` if it differs from the packaged value.

`repairSystem` can be used as a lightweight recovery/validation helper if the installable Form trigger needs to be reinstalled.

## Frontend

Upload the files in the package root to the Boulder Scout GitHub Pages repository.

The frontend configuration is in `config.js`.

Change only these values when needed:

* `API_URL`
* `SITE_URL`
* `SIGNUP_FORM_URL`
* `EVENT_START_ISO`

The site is configured for the Boulder Scout URL:
`https://scoutpegs.github.io/jota-joti-app/`

## `/skip` and `.skip`

`/skip` is the timer test route. It bypasses the countdown/waiting stage only. It does not bypass account authentication or admin permissions.

`.skip` is the returning-device/session shortcut. A signed session token and a small non-sensitive account snapshot are kept on the trusted device so reloads can restore the dashboard immediately. The encrypted credential vault is persistent browser storage; the plain-text PIN and password are not written directly to localStorage.

## Leader workflow

Leaders do not receive the participant Y3 workflow.

They are directed to:
`https://learn.scout.org/resource/sfh-3-being-safe-online`

A Leader without a Scout Learn account is told to reply to the email and request their access details.

## GitHub images

Image paths may be stored as `/image.png`, `images/image.png`, `./images/image.png`, or full external URLs. The frontend resolves these without proxying them through the backend.

## Email previews

Open:

* `emails/parent-welcome.html`
* `emails/leader-welcome.html`

The live Apps Script generates the same layouts with escaped account-specific values and a plain-text fallback.

## Tests performed

Static syntax checks, duplicate-function checks, backup-code scans, branding scans, spreadsheet-schema validation, login/registration mock flows, session tests, leader workflow tests, email template checks, frontend route checks, service-worker checks, and package integrity checks are included in the final QA process.

Live Google authorization, live Form submission, real MailApp delivery and the final GitHub Pages deployment still require your Google account and deployed services.

## Security

Do not upload the attached live workbook or a copy containing participant passwords to a public GitHub repository. Keep the workbook private in Google Sheets and keep `Code.gs` and deployment secrets out of public repositories where practical.

## Account details and trusted devices

After a successful sign in, the browser keeps an encrypted copy of the login details needed to restore the account on that device. The site never stores the PIN or password as plain text in localStorage. The dashboard has a **My Login** button where the saved username, PIN, password and participant ID can be viewed and copied. Sensitive values start masked and are revealed only when the user taps Reveal.

The signed session is refreshed in the background. If the server session expires, the encrypted device vault can silently authenticate the account again. Browser storage can still be cleared by the user, browser privacy settings, or device cleanup tools, so no browser storage system can literally guarantee permanent storage. **Forget This Device** removes the saved account from that browser.

## URL routes

`/skip` bypasses only the event timer and continues through the normal site flow. It never bypasses account or admin permissions. `.skip` remains the trusted-device/user shortcut.

## Forms

The setup page loads the three section forms from the `forms/` folder so they work as normal GitHub Pages files instead of carrying large base64 PDF strings inside the HTML.


## What changed in the run-ready build

* Clicking any link that needs a login or email now shows **all** account details (username, PIN, password, email, parent/guardian email, participant ID) with tap-to-copy, for both "saved account" and "external site" links. The popup opens instantly and fills from memory, then the encrypted vault, then the server.
* Setup no longer fails on harmless header differences. The Form header now matches your real sheet, and missing `EmailLog` / `EmailGroups` sheets are created automatically.
* Links whose `Active` cell is blank are now shown (only an explicit FALSE/0/No hides a link). This brings back games_002–006 and chat_004.
* `BlockedCategories` rows with `AppliesTo = participants` no longer hide content from Leader accounts.
* New accounts always receive the `event` and `website` categories.
* Faster logins: cached session secret and simpler row mapping.
* Service worker cache bumped to v14 so phones pick up the new code.

Keep `backend/` out of the public GitHub repo (or just paste `Code.gs` into Apps Script and delete the folder).
