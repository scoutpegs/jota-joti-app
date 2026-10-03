# Boulder Scout Group JOTA-JOTI 2026 ship checklist

## Google Sheet
Use the existing Boulder Scout Group workbook exactly as supplied. Do not rename, add, remove, or reorder sheets.

## Apps Script
Copy `Code.gs` into the Apps Script project bound to the existing workbook, save it, then run `setupEOISystem()` once.

The setup creates exactly one application Form submit trigger for `onFormSubmit`. The application does not use scheduled tasks, backup stores, or backup authentication.

## Web app
Deploy the Apps Script as a web app and copy its `/exec` URL into `config.js` if the packaged value is different.

## GitHub Pages
Upload the package root to the existing Boulder Scout repository. `Code.gs` may remain in the public root because this package is open source by design. Never publish the private workbook, participant credentials, or Apps Script deployment secrets.

## Email test before sending to families
Run `testParentEmail()` from Apps Script and confirm the message goes to the Google account that is running the script. For a Leader, submit a test EOI marked Leader and confirm the Leader receives SFH 3 instructions instead of the Y3 workflow.

## URL tests
Open the normal site URL and `/skip`. `/skip` only bypasses the timer. `.skip` is the returning-device session shortcut.

## Account test
Submit a test EOI, verify the new row is written directly to `Users`, then log in immediately using that account. Refresh the page and confirm the saved signed session restores the dashboard without asking for the PIN again.
