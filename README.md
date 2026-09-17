# JOTA-JOTI Dashboard — Boulder Scout Group

Unofficial JOTA-JOTI 2026 website for Boulder Scout Group.

## Public GitHub Pages files

Upload the files in this package to the root of the GitHub Pages repository:

- `index.html` — main countdown/dashboard
- `index(1).html` — parent setup guide, available through `/setup`
- `skip.html` — testing page that skips the countdown
- `track.html` — JID World Tracker, available through `/track`
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
- `/track` → JID World Tracker (world map, JID collection, certificates)

The admin route is deliberately not documented in the public repository. Use the private deployment notes supplied with the project.

## JID World Tracker

`track.html` is a self-contained page (its own map, its own local storage, no backend calls) that scouts use to log the JIDs they collect during JOTA-JOTI and see them plotted on a world map. It can be reached two ways, and both stay in sync because they share the same browser storage on the same site:

1. Directly at `/track`.
2. As a normal dashboard link. Add a row to the **Links** sheet, for example:

   | LinkID | CategoryKey | Title | URL | CanEmbed |
   |---|---|---|---|---|
   | chat_004 | chat | JID Map Collector | `https://scoutpegs.github.io/jota-joti-app/track` | TRUE |

   (fill in the other columns — RequiresLogin, RequiresEmail, ParentApproval, LeaderApproved, Moderated, Active, LogoKey, LogoURL, BlockStatus, Notes — the same way as the existing rows). With `CanEmbed` set to `TRUE`, clicking it opens the tracker inside the dashboard's existing embed screen, which already has its own Back button.

If a scout is logged in to the dashboard, the certificate button on the tracker already knows their name (it reads the same login session the dashboard keeps) and pre-fills it, so they don't have to type it in each time — they can still edit it before creating the certificate.

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
