# Boulder Scout Group JOTA-JOTI 2026

This package is the cleaned deployment of the existing Boulder Scout Group JOTA-JOTI site. It keeps the original dashboard layout and visual framework, but removes the old backup implementation, makes `Users` the authoritative account store, adds trusted-device `.skip` login, and adds the separate Leader SFH 3 training workflow.

## Public site files

Upload these files to the root of the existing Boulder Scout GitHub Pages repository:

`index.html`, `setup.html`, `skip.html`, `track.html`, `admin.html`, `script.js`, `style.css`, `admin.js`, `admin.css`, `config.js`, `sw.js`, `404.html`, `manifest.json`, `photo1.png`.

Do not upload the `private` folder or the attached spreadsheet to the public repository.

## 1. Google Sheet

Use the attached Boulder Scout spreadsheet exactly as supplied. Keep these existing sheet names unchanged:

`Form responses 1`, `EmailLog`, `EmailGroups`, `Users`, `Categories`, `Links`, `Logos`, `BlockedURLs`, `BlockedCategories`, `Settings`, `EmailTemplates`, `Setup Guide`.

Do not add, rename, reorder, or replace sheets just for this application. `Users` is the single source of truth for accounts.

## 2. Apps Script

Open the attached Google Sheet, then `Extensions → Apps Script`. Replace the existing script with `private/Code.gs`. Save it. Run `setupEOISystem()` once from the Apps Script editor and approve the Google permissions.

Setup validates the existing spreadsheet structure without changing it and installs only the `onFormSubmit` trigger. There is no backup trigger or backup operation.

Deploy as a Web App:

`Execute as: Me`

`Who has access: Anyone`

Copy the final `/exec` URL into `config.js` as `API_URL`.

## 3. Frontend configuration

`config.js` is the one public configuration file. Change only values that are specific to your deployment:

`API_URL` = Apps Script `/exec` URL

`SITE_URL` = the Boulder Scout GitHub Pages/custom-domain site URL

`SIGNUP_FORM_URL` = the existing Boulder Scout Google Form

`EVENT_START_ISO` = the existing event start used by the framework

`SCOUT_GROUP` = `Boulder Scout Group`

`SFH3_URL` = `https://learn.scout.org/resource/sfh-3-being-safe-online`

## 4. Clean routes

`/` = normal countdown/dashboard

`/skip` = timer test route only. It loads the same dashboard/login page without waiting for the countdown. It does not bypass authentication or permissions.

`/setup` = parent/scout setup guide

`/track` = JID tracker

`/admin` = protected admin page

GitHub Pages uses `404.html` and the service worker so these clean paths resolve without changing the address bar.

## 5. `.skip` trusted-device shortcut

After a successful login, the browser stores a signed, time-limited session token and a non-sensitive participant identifier/display name. The raw PIN and password are not stored for the shortcut.

On a returning device, `.skip` can continue as the recognised user after the server validates the live account. If the session is expired, disabled, or missing, the user is returned to normal PIN login.

`Log Out` clears the trusted-device session from the browser. `Forget this device` clears the trusted-device token and its local dashboard cache.

## 6. GitHub images / Logos sheet

The frontend accepts all of these image path forms from the `Logos` sheet:

`/scout-logo.png`

`images/scout-logo.png`

`./images/scout-logo.png`

`https://example.com/scout-logo.png`

Project-root `/filename.png` paths are resolved against the GitHub Pages repository path so they also work when the repository is not hosted at the domain root. Missing or broken images fall back to the local app logo.

## 7. Leader training

A person identified as `Leader` through the existing `AgeYear`/`AgeGroup` data is not sent the participant Y3 workflow. Their onboarding email instead points to `SFH 3 – Being Safe Online` and explains that they should reply if they do not already have a Scout Learn account.

Leader training status is stored in the existing `PaperworkStatus` and `Notes` fields. No new spreadsheet columns are required. The admin page can identify Leaders and update their training and Scout Learn status.

## 8. Admin

Open `/admin`. The page is protected by the Apps Script admin password. It reads live `Users` data before send operations and logs emails to the existing `EmailLog` sheet.

The admin bootstrap now loads users, sections, categories, groups and sender information in one protected request.

## 9. API tests

Open the deployed Apps Script `/exec?action=health` to check that the Web App responds. `diagnostics` performs a deeper spreadsheet schema check.

Public API actions preserved include `health`, `diagnostics`, `login`, `user`, `categories`, `links`, `logos`, `blocks`, and `all`. The protected admin actions remain available with the existing names.

## 10. Important security points

No admin password is stored in frontend source. Normal dashboard data is not persisted with the password. Authentication is live against the `Users` sheet. A cache failure cannot make login fail.

The previous backup implementation is not part of this package and is not required for registration, login, dashboard loading, or administration.

## 11. What was fixed

The cleanup repaired missing internal helpers, removed stale user caching, removed insecure unauthenticated admin endpoints, removed PIN leakage from diagnostics, added timeouts and POST login requests, removed the direct PIN from browser storage, added signed trusted-device sessions, added `/skip` route handling, corrected the setup route, consolidated public configuration, added GitHub project-path image handling, and added the Leader SFH 3 workflow without changing the spreadsheet structure.

## 12. Live tests still required

The final live step still needs your Google account, Google Form trigger, deployed Apps Script URL, and the real GitHub Pages host. Run one test participant submission, one Leader submission, one valid login, one invalid login, `/skip`, `/admin`, and one Leader training status update after deployment.
