JOTA-JOTI 2026 fix bundle

1. Code.gs
- Uses a 6-hour Users cache instead of 10 minutes.
- Invalidates the Users cache immediately when Users changes.
- Publishes/rebuilds the PIN index immediately after a new form-created account is appended.
- Flushes the new row before rebuilding the index.
- Uses new cache-key versions so old cached data is ignored.
- Reduces cache chunk size for safer CacheService storage.

2. script.js
- Uses the Apps Script deployment URL recorded as the current WEB_APP_URL in Code.gs.
- Makes login response handling robust to HTTP errors/non-JSON responses.
- Reuses the same login fetch function for saved-account prefetch and normal login.
- Removes the delayed startup health request so startup does not make an unnecessary extra API call.

3. sw.js
- Bumped the PWA shell version from v11 to v12 so the corrected script is fetched and old cached script.js is retired.


## Admin Centre fixes

- Increased the Google Sheets modal size so the Admin Centre is usable without cramped controls.
- Added a **Refresh from Users** button that forces a fresh Admin Centre load.
- Fixed the live-load timestamp so data is only marked fresh after `adminBootstrap()` succeeds.
- Recipient picker now hides disabled Users instead of allowing them to be selected and only failing later during send.
- Switching to Youth section or Saved group clears hidden individual selections so the send audience cannot be accidentally mixed.
- PDF account-list export now opens a blank tab immediately on the button click and navigates it after the PDF is generated, avoiding popup-blocker failures.
- PDF errors are shown clearly in both the Admin Centre and the opened tab.
