# v18 QA summary

Source inspected: supplied browser HAR from `scoutpegs.github.io/jota-joti-app`.

Observed issues fixed:
1. Live `admin.js` launched eight protected Apps Script requests in parallel. Some redirected `googleusercontent` responses returned HTTP 404.
2. Live `adminUsers` response did not contain `Password`, `ParentPhone`, `PaperworkStatus`, `EmailStatus` or several other fields already used by the admin UI.
3. `hall-layout.png` returned HTTP 404.
4. `site-layout.png` returned HTTP 404.
5. The site service worker did not include the two layout images.
6. The live deployment was not using the full v17 admin user response even though the source package contained it, so a deployment update is required.

v18 changes are designed so the admin page can run through one bootstrap request and still fall back to older individual endpoints.
