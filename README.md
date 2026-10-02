# JOTA-JOTI 2026

Boulder Scout Group JOTA-JOTI website, Google Apps Script backend and clean spreadsheet template.

This package was cleaned so the normal account flow is deliberately simple:

`Google Form -> Users sheet -> Login`

The account system does not use a second user database. The `Users` sheet is the authoritative account store.

## What is in this package

### Public GitHub Pages files

Upload these files to the root of the GitHub Pages repository:

- `index.html` - main countdown and dashboard
- `setup.html` - parent/scout setup guide
- `skip.html` - countdown-free test page for trusted testing
- `track.html` - JID tracker
- `admin.html` - protected admin web interface
- `admin.js` - admin client logic
- `admin.css` - admin styling
- `script.js` - dashboard client logic
- `style.css` - dashboard styling
- `config.js` - the main frontend settings file
- `sw.js` - PWA service worker and clean routes
- `404.html` - GitHub Pages clean-route fallback
- `manifest.json` - PWA metadata
- `photo1.png` - site icon/fallback image

### Private deployment files

Keep these out of the public GitHub Pages repository:

- `private/Code.gs` - Google Apps Script backend
- `private/JOTA-JOTI-Sheet-Template.xlsx` - clean spreadsheet template

The `.gitignore` already excludes `private/Code.gs` and ZIP files from normal Git commits.

## 1. Deploy the frontend

1. Open the GitHub repository used for the site.
2. Upload the public files listed above to the repository root.
3. Make sure `index.html`, `config.js`, `script.js`, `style.css` and `sw.js` are all in the same folder.
4. Enable GitHub Pages for the repository.
5. Open the site root once. Then test `/setup`, `/skip`, `/track` and `/admin`.

The packaged configuration currently points at:

`https://kalscouts.github.io/jota-joti-app/`

Change it in `config.js` when the repository or Pages address changes.

## 2. Configure the frontend

All main frontend settings are in `config.js`.

Important values:

- `API_URL` - deployed Apps Script Web App URL
- `SITE_URL` - GitHub Pages site URL
- `SITE_NAME` - displayed site name
- `SCOUT_GROUP` - group name
- `SIGNUP_FORM_URL` - Google Form URL
- `EVENT_START_ISO` - countdown start time
- `ADMIN_URL` - clean admin route
- `SFH3_URL` - Leader training course URL

Do not put admin passwords, sheet data or other private values into `config.js`.

## 3. Configure Google Sheets

Use `private/JOTA-JOTI-Sheet-Template.xlsx` as the starting template. Import it into Google Sheets, then keep the sheet names unchanged.

The important sheets are:

- `Form responses 1`
- `EmailLog`
- `EmailGroups`
- `Users`
- `Categories`
- `Links`
- `Logos`
- `BlockedURLs`
- `BlockedCategories`
- `Settings`
- `EmailTemplates`

### Users is the source of truth

New accounts are written directly into `Users`.

Login reads `Users` directly.

There is no user backup lookup, backup registration step, restore step or user synchronisation step.

The original `Users` columns are kept in the same order. Five extra columns are used only for the Leader workflow:

- `TrainingType`
- `TrainingStatus`
- `ScoutLearnAccountStatus`
- `TrainingNotes`
- `FormResponseKey`

## 4. Deploy the Apps Script

1. Open the Google Sheet.
2. Open **Extensions -> Apps Script**.
3. Remove any old deployment code from the project.
4. Paste the packaged `private/Code.gs` into a single Apps Script file.
5. Save the project.
6. Run `setupEOISystem` once from the Apps Script editor.
7. Approve the Google permissions requested by the script.
8. Deploy the project as a **Web app**.
9. Set the web app to execute as the account that owns the sheet and make the access setting suitable for the public GitHub frontend.
10. Put the final Web App `/exec` URL into `config.js`.

The first setup also creates the single spreadsheet `onFormSubmit` trigger used for registrations and removes old clock-based triggers.

## 5. Test the API

Open the Web App URL in a browser and try:

- `?action=health`
- `?action=diagnostics`
- `?action=categories`
- `?action=links`
- `?action=logos`
- `?action=blocks`
- `?action=all`

For a real account test use the login endpoint with a valid PIN only. Do not paste real credentials into the README or GitHub repository.

The user-facing login endpoint reads the live `Users` sheet. It does not use the dashboard cache for authentication.

## 6. Google Form registration

Use the existing Expression of Interest form structure.

The uploaded form contains these main fields:

- Parent/Guardian Full Name
- Parent/Guardian Email
- Child First Name
- Child Last Name
- Child's age/year group
- Which activities would your child like access to?
- The two required acknowledgements
- Terms and conditions agreement

The form explicitly describes itself as an Expression of Interest rather than final registration, so further paperwork and permissions may still be required.

## 7. Leader onboarding

A submission whose section/age value is `Leader` is treated as a Leader.

Leaders do **not** receive the normal participant Y3 workflow.

Instead they receive instructions for:

**SFH 3 - Being Safe Online**

Course:

https://learn.scout.org/resource/sfh-3-being-safe-online

The Leader email explains that they should complete the course, reply with the completed course or required confirmation, and contact the group by reply if they do not already have a Scout Learn account.

The admin panel can update these simple statuses:

- Course required
- Account details requested
- Login details sent
- Course in progress
- Course completed
- Completion received
- Approved

The Scout Learn account field tracks:

- Unknown
- Has account
- Account details requested
- Login details sent

## 8. GitHub images and logos

Put image files into the GitHub Pages repository and reference them directly from the `Logos` sheet.

Examples:

`/scout-logo.png`

`/jota-logo.png`

`images/chat.png`

`./images/minecraft.jpg`

Full external URLs also work, for example:

`https://example.com/image.webp`

Supported image types include PNG, JPG, JPEG, WEBP and GIF.

The dashboard resolves relative paths against the GitHub Pages project root. Missing or broken images fall back to the site's fallback image instead of breaking the page.

## 9. Admin area

Open:

`/admin`

The admin page asks for the Apps Script admin password and exchanges it for a short-lived admin session token.

The admin client does not contain the admin password.

Admin actions include live Users lookup, sections, categories, saved groups, sender information, email preview/send and Leader training status updates.

## 10. Email sending

The Apps Script sends onboarding emails after writing the account into `Users`.

If the email send fails, the account is still considered created and the `EmailStatus` field records the failure. The registration does not wait for a backup operation.

Leader onboarding is selected automatically for Leaders so they are not sent both workflows.

## 11. Health and reliability behaviour

The public dashboard uses a short timeout for API calls and shows a retryable error rather than leaving the user on an endless loading screen.

Public category/link/logo/block data may be cached for speed. Authentication does not use that cache.

Cache maintenance is best-effort. A cache failure is not allowed to break user registration or authentication.

The service worker installs each shell file independently so one missing optional file does not prevent the whole service worker from installing.

## 12. What was cleaned up

The delivered package removes the old backup implementation and the old clock-based backup trigger from the deployable backend.

It also removes the old duplicate/nested ZIP archives and obsolete patch-note files from the final project package.

The cleaned backend fixes the missing Leader helper functions, validates parent email addresses on form processing, keeps login and registration on the original Users sheet, protects admin endpoints with the admin session, returns the blocked data from the blocks endpoint, and uses the same frontend API URL in the admin and main dashboard.

The GitHub Pages routing was also repaired so `/setup` points to the real `setup.html` file and `/admin` loads the real admin page.

## 13. Maker credit

Site and email materials use:

**Made by Hunter Miller from Boulder Scout Hall**

## 14. Final pre-launch checklist

Before allowing real registrations:

1. Submit a dummy participant form.
2. Check that exactly one new account is added directly to `Users`.
3. Confirm no second user store is involved.
4. Confirm the new PIN works immediately.
5. Submit a dummy Leader entry using the `Leader` section value.
6. Confirm the Leader receives SFH 3 instructions and not the normal Y3 message.
7. Open `/admin` and confirm the Leader training card appears.
8. Run the Apps Script `runSystemTest` function.
9. Open the public `health` endpoint.
10. Test the site on a phone, tablet and desktop.

## Important deployment note

The automated cloud checks could not be completed from this packaging environment because the deployed Apps Script URL was not reachable here. The Apps Script source was syntax checked and exercised with a local mock flow covering participant registration, Leader registration, immediate Users-sheet login, disabled-user rejection and API routing. The frontend files were structurally checked and their JavaScript was syntax checked. Browser end-to-end testing was not possible because the available Chromium runtime is blocked by the environment. You still need to perform the final Google Apps Script permission, trigger, email and live-account tests in your Google account before public launch.
