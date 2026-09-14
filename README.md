# JOTA-JOTI Dashboard — Boulder Scout Group

Unofficial JOTA-JOTI 2026 website for Boulder Scout Group.

## Public GitHub Pages files

Upload the files in this package to the root of the GitHub Pages repository:

- `index.html` — main countdown/dashboard
- `index (1).html` — parent setup guide, available through `/setup`
- `skip.html` — testing page that skips the countdown
- `admin.html` — admin interface shell; protected by the Apps Script admin session
- `admin.js` — admin interface logic
- `admin.css` — admin styling
- `script.js` — main dashboard logic
- `style.css` — main dashboard styling
- `sw.js` — PWA service worker and clean-route handling
- `404.html` — clean-route fallback for GitHub Pages
- `manifest.json` — PWA metadata
- `photo1.png` — PWA icon/logo

## Clean routes

- `/` → main countdown/dashboard
- `/setup` → parent setup guide
- `/skip` → dashboard test route

The admin route is deliberately not documented in the public repository. Use the private deployment notes supplied with the project.

## Important security rule

Do **not** upload the Google Apps Script backend, spreadsheet ID, private admin notes, or old ZIP backups to a public GitHub repository.

The public admin page does not contain the admin password. It asks Apps Script for a short-lived admin session after the password is entered.

## Backend

The Apps Script backend is supplied separately as a private deployment package. It must be deployed as a Google Apps Script Web App running as the owner with access configured as required by the project.

The protected admin endpoints are:

- `adminLogin`
- `adminUsers`
- `adminSections`
- `adminCategories`
- `adminGroups`
- `adminSender`
- `adminPreview`
- `adminSend`

The old unauthenticated `openAdmin*` endpoints must not be used.

## Updating

The public site can be uploaded to GitHub Pages without exposing the private Apps Script source. When the Apps Script deployment URL changes, update the API URL in the public client files and redeploy the private backend separately.
