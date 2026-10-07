# Complete Admin Centre Release — 7 October 2026

This release turns `/admin` into the main private management centre for the JOTA-JOTI portal.

### Included
- Real `/admin` route with password login and short-lived admin sessions.
- Participant table with username, password and PIN visibility, search/filtering and editing.
- Private printable account/password sheet plus the existing generated password PDF.
- Per-participant parent welcome-email resend button.
- Activity builder with category, description, duration, difficulty, participants, equipment, leader-required flag, URL/HTML instructions, embed permission, image picker and archive/restore.
- Category builder with descriptions, logos and archive/restore.
- Link/resource builder with URL/HTML mode, embed permission, login/email requirements, approval/moderation flags, logo and archive/restore.
- Media library with image upload to the `JOTA-JOTI Media` Google Drive folder.
- Paperwork reminder email tool that rechecks paperwork status on the server immediately before sending and excludes `Complete`, `Completed` and `Done`.
- Existing bulk email composer remains available.
- Settings editor, full setup action, public cache clear action and admin audit log.
- `Activities` and `AdminAuditLog` sheets are created automatically by `setupEOISystem()`.
- Public participant dashboard now renders activities alongside links and keeps activities in its remembered-session cache.
- Clean 404 page and clean `/admin`, `/setup`, `/track` and `/skip` routing.
- Service worker updated to v14 and serves `/admin` directly when installed.

### Deployment
1. Upload `Code.gs` to the Apps Script project. Keep `Code (1).gs` in sync if that copy is also used.
2. Run `setupEOISystem()` once, or sign into `/admin` and use **System & Settings → Run full setup**.
3. Deploy/update the Apps Script web app as the account that can edit the live spreadsheet.
4. Publish the static files to the GitHub Pages repository.
5. Open `/admin` and sign in using the admin password stored in Apps Script Script Properties.

See `ADMIN-CENTRE.md` for the detailed operating notes.
