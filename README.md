# JOTA-JOTI Dashboard — Boulder Scout Group

Unofficial JOTA-JOTI 2026 participant dashboard with a Google Sheets / Apps Script backend and a GitHub Pages admin centre.

## GitHub Pages

Deploy the repository root with GitHub Pages. The participant site is `/` and the private admin UI is:

`https://scoutpegs.github.io/jota-joti-app/admin/`

The admin page is **not** a security boundary by itself. It uses a server-side password and short-lived session token supplied by the Apps Script backend.

## Google Apps Script setup

1. Open the Google Sheet used by the dashboard.
2. Open **Extensions → Apps Script**.
3. Replace the Apps Script project with `google-apps-script/Code.gs`.
4. Save and reload the Sheet.
5. Use **JOTA-JOTI Admin → Run full setup**.
6. The setup creates/repairs the required sheets, installs the form-submit and backup triggers, creates an `EmailLog` sheet, and generates an admin password if one does not already exist.
7. Keep the generated admin password private. You can use **JOTA-JOTI Admin → Show admin password** later, or **Reset admin password** if required.
8. Deploy **Deploy → New deployment → Web app** with **Execute as: Me** and **Who has access: Anyone**.
9. The current deployment URL is already configured in `index.html`/`script.js` and `admin/admin.js`. If you create a new deployment, update the `API_URL` in those files.

### Important permissions

The first Apps Script run will ask for permission to read the spreadsheet, send email, use Drive/Docs for backups/certificates, and create triggers. Approve these permissions while signed in as the organiser/admin account that should send the emails.

## Admin email centre

The `/admin/` page supports:

- Parents, youth, or parents + youth.
- Pick individual scouts by searchable name.
- Youth sections: Joeys, Cubs, Scouts, Venturers, Leaders.
- Activity categories from the live `Categories` sheet.
- Saved groups from the optional `EmailGroups` sheet (`GroupKey`, `GroupName`, `ParticipantIDs`, `Active`, `Notes`).
- Everyone in the live `Users` sheet, with individual removal before sending.
- Search by name, PIN, username, Participant ID, parent, or email.
- Per-recipient merge tags: `{{childFirstName}}`, `{{childLastName}}`, `{{childFullName}}`, `{{parentName}}`, `{{username}}`, `{{pin}}`, `{{participantID}}`, `{{youthSection}}`, `{{ageYear}}`, `{{ageGroup}}`, `{{email}}`, `{{youthEmail}}`, `{{parentEmail}}`.
- Google Drive file attachments by Drive URL or file ID.
- Personalised completion certificates with selectable placement: PDF attachment only, certificate block before the message, certificate block after the message, or block + PDF attachment.
- Custom certificate title, event line, message and footer, all supporting merge tags.
- Live recipient preview before sending.
- Google Mail sending quota checking.
- Per-recipient failure reporting.
- `EmailLog` audit entries for successful and failed sends.
- Server-side exclusion of disabled Users rows.

The server always re-reads the `Users` sheet when resolving recipients. This prevents a stale browser list from sending to a person who was disabled or changed after the page loaded. The browser composer keeps the email HTML under 60,000 characters because the GitHub Pages admin uses a JSONP request to reach Apps Script.

## User dashboard

Scouts continue to use the 4-digit PIN login and the existing dashboard. The admin system does not expose passwords or account data through the public dashboard endpoints.

## Sheets

The setup expects/creates:

- `Users`
- `Categories`
- `Links`
- `Logos`
- `BlockedURLs`
- `BlockedCategories`
- `Settings`
- `EmailLog`
- `EmailGroups`

The `Users` sheet can contain the account fields already used by the existing EOI system, including `ParticipantID`, `PIN`, `Name`, `Username`, `Email`, `AllowedCategories`, `Password`, `ParentEmail`, `ParentName`, `AgeGroup`, `AgeYear`, `Status`, `PaperworkStatus`, and `EmailStatus`.

## Security notes

Do not put the admin password in GitHub. It is stored in Apps Script **Script Properties**. The GitHub admin page only receives a temporary token after successful sign-in. Resetting the password immediately prevents new sessions from being created with the old password; existing cached sessions naturally expire within six hours.

Do not make the `Users` spreadsheet publicly accessible. The GitHub site should only communicate with the Apps Script web app. Emails are sent individually rather than as a visible CC/BCC list, so selected recipients do not see one another's addresses.
