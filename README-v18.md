# Boulder Scout Group JOTA-JOTI 2026 — v18

This release fixes the live admin failures recorded in the supplied browser HAR.

## Changes

### Admin API
A new protected `adminBootstrap` endpoint returns the complete admin dataset in one request:
- Users
- Categories
- Activities
- Links
- Media / Logos
- Settings
- Sender and mail quota

The individual admin endpoints remain available for compatibility.

### Admin client
The admin browser client now:
- uses `adminBootstrap` first
- falls back to sequential requests when an older Apps Script is deployed
- retries transient 404/non-JSON responses from Google Apps Script redirects
- adds a cache-busting request value to prevent stale redirect reuse

### Users
The backend returns the full admin user record needed by the interface, including:
`Password`, `ParentPhone`, `PaperworkStatus`, `EmailStatus`, `ScoutGroup`, `EOIReceived`, `AccountCreated`, `Notes` and `AllowedCategories`.

### Layout images
The missing `hall-layout.png` and `site-layout.png` files are included in this release and added to the service worker shell.

## Deployment
Keep the existing Apps Script deployment URL. Replace the Apps Script source with the v18 `Code.gs`, save, and update the deployed version.
Then publish the GitHub Pages files at repository root.
