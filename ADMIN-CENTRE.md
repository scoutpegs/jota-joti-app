# JOTA-JOTI Admin Centre

The web admin centre is now available at `/admin`. The old hidden admin route is no longer used.

## What `/admin` manages

- **Overview** — account counts, paperwork status, active activities/categories/links, cache and connection status.
- **Participants** — search users, view usernames/PINs/passwords, edit account details, status and paperwork, print a private password sheet, or generate the existing private password PDF.
- **Activities** — create/edit/archive activities, choose a category, add description, duration, difficulty, participants, equipment, leader requirement, instructions as URL or HTML, embedding permission, and a photo.
- **Categories** — create/edit/archive categories, descriptions and logos.
- **Links & Resources** — create/edit/archive links or raw HTML resources, control embedding, login/email requirements, approvals, moderation and logos.
- **Photos & Logos** — upload images to a managed Drive folder, copy their public view URL, and hide old media.
- **Emails** — send a paperwork reminder to every parent who still needs paperwork, with a server-side recheck immediately before sending; also includes the existing bulk email composer.
- **System & Settings** — run full spreadsheet setup, clear the public cache, edit settings, view the admin audit log, and regenerate the private password PDF.

## First-time setup

1. Open the Apps Script project and replace the deployed `Code.gs` with this version. Keep `Code (1).gs` in sync if your Apps Script project uses that copy.
2. Deploy the Apps Script as a web app using the account that owns/edits the JOTA-JOTI spreadsheet.
3. Run `setupEOISystem()` once from Apps Script, or sign into `/admin` and use **System & Settings → Run full setup**.
4. The setup creates/repairs the required `Activities` and `AdminAuditLog` sheets as well as the existing JOTA-JOTI sheets.
5. The first admin password is created in Apps Script Script Properties when none exists. Keep it private.
6. Open the GitHub Pages site and go to `/admin`.

## Security

The public portal never exposes the admin tables. Every admin action except the initial `adminLogin` request requires a short-lived session token. Passwords are deliberately shown only inside the private admin centre and private password output because the current participant system stores the account password in the Users sheet.

The paperwork-reminder endpoint checks `PaperworkStatus` again on the server immediately before sending, so accounts marked `Complete`, `Completed`, or `Done` are excluded even if the page was left open for a while.

## Photos

Uploaded images are stored in a Google Drive folder named `JOTA-JOTI Media`. The server attempts to make each image viewable by link and stores its view URL in the `Logos` sheet. If your Workspace policy blocks public link sharing, use another accessible image URL from the admin picker instead.

## Public activities

Activities are included in the public dashboard bundle. They appear inside their chosen category next to regular links/resources. A participant can open an activity details sheet showing its description, metadata, photo, notes and instructions.

## 404 / clean routes

`404.html` now keeps the friendly 404 screen for unknown pages and boots `/admin`, `/setup`, `/track` and `/skip` through clean routes when GitHub Pages falls back to `404.html`. The service worker also handles `/admin` directly when it is installed.
