# JOTA-JOTI Admin Centre — Boulder Scout Group

The live management interface is **`/admin`**. It is the private control centre for the JOTA-JOTI portal. The website itself is public, but every admin data operation requires a short-lived Apps Script session token.

## What `/admin` manages

### Participants
- Search by name, Participant ID, PIN, username, parent, email or section.
- Edit name, age/section, PIN, username, activity password, youth email, parent details, status, paperwork status, category access and notes.
- Resend the parent account/welcome email.
- Print the account table.
- Download the full account list as CSV.
- Download the private password/account PDF.

### Activities
- Add/edit/archive activities.
- Select any live category.
- Set duration, difficulty, participants, equipment and leader requirement.
- Use a normal URL or paste HTML instructions.
- Turn embedding on/off.
- Select an existing image from the **live Logos sheet**.
- Upload a new PNG/JPG/WEBP/GIF directly from the activity editor.

### Categories
- Add/edit/archive categories.
- Set the stable CategoryKey and display title.
- Select an existing sheet logo or upload a new one.
- Keep descriptions and Active state in the live sheet.

### Links & Resources
- Add/edit/archive normal websites.
- Paste complete HTML instead of a URL when required.
- Control embedding, login, email, parent approval, leader approval, moderation and Active state.
- Reuse a logo already stored in Logos, or upload a new one.

### Photos & Logos
The admin centre reads the existing **Logos** sheet directly. If a category/link/activity already has a LogoKey and that key exists in Logos, the matching image is used automatically. If a row already contains a LogoURL, that URL is also respected.

Uploading a new image creates a managed file in Google Drive and adds a corresponding row to Logos.

### Emails
- Paperwork reminder preview.
- Reminder emails are rechecked on the server immediately before sending, so `Complete`, `Completed` and `Done` participants are skipped.
- Existing bulk email composer with merge tags remains available.

### System & Settings
- Run full setup.
- Import/repair existing live sheet content.
- Clear dashboard/login caches.
- Edit non-secret Settings values.
- Review AdminAuditLog.

## First-time deployment

1. Open the live Boulder JOTA-JOTI Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Replace the backend `Code.gs` with the private copy in the Apps Script package.
4. Save.
5. Run `setupEOISystem()` once from the Apps Script editor and approve the requested Google permissions.
6. Deploy the Apps Script as a Web app: **Execute as Me** and access set so the public website can reach it.
7. Open the GitHub Pages site at `/admin`.
8. Enter the admin password shown by the first setup run. Keep it private.
9. In `/admin` use **System & Settings → Import / repair live sheet content** once.

## Important live-sheet behaviour

The admin page does not replace the live workbook with its own copy. It reads and writes the existing Users, Categories, Links, Logos, Activities and Settings sheets. This means existing categories, links and logos stay usable. The repair function adds missing headers/defaults only where needed.

Existing logo relationships are resolved like this:

`Category/Link/Activity LogoKey → Logos.LogoKey → Logos.LogoURL`

If a direct LogoURL/PhotoURL is already present, it is used as a fallback even when the LogoKey is missing.

## Password exports

The account PDF and CSV intentionally contain private credentials. Store them with the event paperwork and do not place them in a public repository or public chat.

## Clean routes

- `/` — public countdown/dashboard
- `/setup` — parent setup guide
- `/skip` — testing route that bypasses the countdown
- `/track` — JID tracker
- `/admin` — protected admin centre

`404.html` and the service worker handle the clean routes for GitHub Pages.
