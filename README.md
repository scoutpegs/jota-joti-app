Here is a much more complete `README.md` you can put into the project. It explains the whole application, how the pieces connect, what each section does, and what to change when you want to update the site.

````markdown
# JOTA-JOTI Dashboard

A responsive JOTA-JOTI Scout dashboard and preparation portal designed to work as a normal website and as an installed Progressive Web App (PWA) on phones, tablets and computers.

The application has several main parts:

1. Countdown / preparation page
2. PIN login page
3. Remembered-session system
4. Dashboard categories
5. Category submenus
6. Password / access popup
7. Embedded HTML pages from the data source
8. External website launching
9. Activity suggestions
10. PWA installation / Add to Home Screen system
11. Service worker / offline shell
12. Responsive mobile, tablet and desktop styling

---

# 1. HOW THE WHOLE SITE WORKS

The application is a single-page HTML application.

The main frontend is:

```text
index.html
````

The other important files are:

```text
manifest.json
photo1.png
sw.js
README.md
```

The application communicates with the backend through the Apps Script API configured near the top of the JavaScript section inside `index.html`.

The overall flow is:

```text
User opens the app
       |
       v
Check PWA / device state
       |
       v
Check event date
       |
       +-----------------------+
       |                       |
       | Before final 24h      | Final 24h / event
       v                       v
 Countdown / Prep page       Dashboard
       |                       |
       | Login                 | Remembered account?
       v                       |
   PIN screen                 v
       |                  Dashboard
       v
Backend login
       |
       v
User + Categories + Links + Logos
       |
       v
Remember session
       |
       v
Dashboard
```

The application does not need a separate frontend framework.

Everything is currently contained inside the HTML application.

---

# 2. MAIN FILES

## index.html

This is the main application.

It contains:

* HTML
* CSS
* JavaScript
* login screen
* countdown
* dashboard
* menus
* popup
* embedded HTML viewer
* PWA install interface
* animations
* responsive layouts

Most changes to the site's appearance and behaviour are made here.

---

# 3. manifest.json

The manifest controls the PWA installation information.

It tells the browser:

* the app name
* short name
* icon
* start URL
* application scope
* theme colour
* background colour
* standalone behaviour
* supported orientation

Important settings include:

```json
"name": "JOTA-JOTI Dashboard",
"short_name": "JOTA-JOTI",
"display": "standalone",
"orientation": "any"
```

### Changing the app name

Change:

```json
"name": "JOTA-JOTI Dashboard"
```

for the full application name.

Change:

```json
"short_name": "JOTA-JOTI"
```

for the shorter Home Screen name.

---

# 4. photo1.png

This is the main local application image.

It is used for things such as:

* PWA icon
* Apple Home Screen icon
* browser icon
* application branding
* fallback image locations

If replacing it, keep the filename unless you also update every reference to it.

---

# 5. sw.js

`sw.js` is the service worker.

It controls the PWA's cached application shell.

The service worker allows the application to:

* install as an app
* reload faster
* open its cached shell when connectivity is temporarily unavailable
* receive updated versions after deployment

The application shell contains:

```text
index.html
manifest.json
photo1.png
```

Live dashboard information is NOT supposed to be replaced with fake data just because the network is unavailable.

The service worker cache version is changed whenever an important application update is made.

For example:

```javascript
const CACHE_NAME = 'jota-joti-shell-v3-session-ui';
```

After a major update, change the version:

```javascript
const CACHE_NAME = 'jota-joti-shell-v4';
```

This forces browsers to recognise the new cache.

---

# 6. EVENT TIMING

The event date is controlled inside `index.html`.

The important setting looks like:

```javascript
const EVENT_START_ISO = "2026-10-16T00:00:00+08:00";
```

The application calculates the final 24-hour handoff automatically:

```javascript
const FINAL_DAY_MS = EVENT_START_MS - (24 * 60 * 60 * 1000);
```

This means:

```text
Before final 24 hours
        |
        v
Countdown / preparation page

Final 24 hours
        |
        v
Dashboard becomes the main page
```

---

# 7. CHANGING THE EVENT DATE

Change:

```javascript
const EVENT_START_ISO = "2026-10-16T00:00:00+08:00";
```

For example:

```javascript
const EVENT_START_ISO = "2027-10-15T00:00:00+08:00";
```

The timezone is important.

`+08:00` represents UTC+8.

Do not remove the timezone unless you deliberately want the browser's own timezone handling.

---

# 8. COUNTDOWN

The countdown displays:

```text
Days
Hours
Minutes
Seconds
```

The values are calculated from:

```javascript
EVENT_START_MS - Date.now()
```

The countdown updates every second while the countdown page is active.

Once the application has moved to dashboard mode, the timer is stopped.

This is important because the old version repeatedly rebuilt the dashboard once the timer ended.

The newer implementation prevents the countdown from continuing to control the dashboard.

---

# 9. LOGIN / PIN SYSTEM

The login system uses a four-digit PIN.

The keypad is deliberately numeric:

```text
1   2   3

4   5   6

7   8   9

    0   DEL
```

The PIN display shows the actual numbers entered.

For example:

```text
1   2   3   —
```

If all four digits are entered:

```text
1   2   3   4
```

The fourth digit automatically submits the PIN.

---

# 10. PHYSICAL KEYBOARD SUPPORT

The PIN system also supports a physical keyboard.

The user can type:

```text
0
1
2
3
4
5
6
7
8
9
```

The application treats them the same way as pressing the on-screen keypad.

Backspace/Delete can remove the last digit.

This is useful when the application is being used on:

* Windows
* Mac
* Chromebooks
* desktop browsers
* laptops
* physical keyboards connected to tablets

---

# 11. REMEMBERED LOGIN

Once a real account successfully logs in, the application remembers the account on that device.

The purpose is to prevent this:

```text
Reload
   |
Login screen
   |
Login again
   |
Reload
   |
Login again
```

Instead:

```text
Reload
   |
Remembered account restored
   |
Dashboard / timer appears immediately
   |
Fresh backend refresh happens in background
```

The remembered session is intended to make the application feel like an installed app.

A fresh backend request is still made so account data can be updated.

---

# 12. NETWORK FAILURE AND LOGIN

A temporary network problem should not immediately sign a remembered user out.

For example:

```text
User is already remembered
        |
Internet temporarily unavailable
        |
Keep the remembered interface
        |
Try refreshing again later
```

However, a real backend response saying that the PIN/account is invalid should clear the remembered session.

This prevents an old or disabled account from remaining permanently approved.

---

# 13. FORGETTING AN ACCOUNT

The application has a "Forget saved PIN" / account reset mechanism.

This removes the locally remembered session.

After forgetting the account, the user must enter the PIN again.

---

# 14. BACKEND API

The application communicates with an Apps Script web application.

The API URL is configured near the beginning of the JavaScript:

```javascript
const API_URL = "...";
```

If the Apps Script deployment changes, update that URL.

A typical login request looks like:

```text
?action=login&pin=1234
```

The application expects a response containing information such as:

```text
success
user
categories
links
logos
```

Depending on the backend version, additional data such as:

```text
activities
```

may also be supplied.

---

# 15. USER DATA

The backend's user object is used for the current account.

Typical account fields can include things such as:

```text
Name
Username
Password
Email
ParentEmail
```

The exact fields depend on the backend response.

The frontend uses the user's name for the dashboard greeting.

For example:

```text
GOOD MORNING
Hunter
```

---

# 16. DASHBOARD GREETING

The greeting automatically changes according to the device's local time.

Current logic:

```text
05:00–11:59
Good morning

12:00–16:59
Good afternoon

17:00–20:59
Good evening

21:00–04:59
Welcome
```

The account name appears underneath the greeting.

---

# 17. CATEGORIES

The dashboard is built from category data returned from the backend.

A category normally contains information such as:

```text
CategoryKey
Title
LogoURL
```

The category key connects the category to the Links data.

Example:

```text
CategoryKey: games
Title: Games
```

A link with:

```text
CategoryKey: games
```

will appear inside the Games category.

---

# 18. HOW TO ADD A NEW CATEGORY

Categories should be added to the backend data source rather than hardcoded into the frontend.

For example:

```text
CategoryKey: games
Title: Games
LogoURL: https://example.com/games.png
```

Then links using:

```text
CategoryKey: games
```

will automatically appear inside the category.

This means the frontend does not need to be rewritten every time a new category is added.

---

# 19. CATEGORY LOGOS

Each category can have its own logo.

The frontend uses:

```javascript
cat.LogoURL
```

If a logo is missing, a fallback folder icon may be used.

To change a logo, change the logo URL in the source data.

---

# 20. CATEGORY SUBMENUS

If a category has:

```text
0 links
```

it displays an empty state.

If a category has:

```text
1 link
```

the application can open that item directly.

If it has:

```text
2 or more links
```

the application opens a submenu.

Example:

```text
Games
   |
   +-- Minecraft
   +-- Terraria
   +-- Other Games
```

The submenu has a Back button.

---

# 21. THE ORIGINAL SUBMENU BUG

An earlier version repeatedly called the dashboard handoff function after the timer ended.

This caused:

```text
Click category
     |
submenu opens
     |
timer update
     |
dashboard rebuild
     |
submenu closes
```

The repaired application stops that behaviour.

The dashboard tracks its current view:

```text
login
categories
submenu
```

The countdown no longer repeatedly rebuilds the dashboard.

---

# 22. LINKS

Links are normally supplied by the backend.

A link can contain information such as:

```text
LinkID
CategoryKey
Title
URL
RequiresLogin
RequiresEmail
CanEmbed
LogoURL
Active
```

The exact field names depend on the backend version.

---

# 23. ACCESS LEVELS

The application supports three main access levels.

### Level 0

No special account requirement.

The site can open directly.

### Level 1

The application can use saved account information.

The popup can show copyable information such as:

```text
Username
Password
Email
```

### Level 3

The destination requires its own account or its own details.

The application warns the user before opening it.

For example:

```text
This site needs its own account.
```

or:

```text
This site needs your own email address.
```

---

# 24. PASSWORD / ACCESS POPUP

When a protected link is selected, the application opens the access popup.

The popup is a bottom-sheet style interface.

It contains:

* title
* explanation
* saved credentials where appropriate
* warnings
* Continue / Take me to the site button
* Not Now button when required

---

# 25. POPUP BEHAVIOUR

The access popup is designed so that it remains open until the user chooses an action.

Inside the popup:

```text
Tap credential
    |
Copy
    |
Popup remains open
```

Click:

```text
Take me to the site
```

and the site is launched.

Click:

```text
Not Now
```

and the popup closes.

Press:

```text
Escape
```

and the popup closes.

Tap outside the popup:

```text
Dark background
```

and the popup slides down and closes.

---

# 26. POPUP ANIMATION

The popup uses the original slide-up style.

Opening:

```text
Bottom of screen
       ^
       |
   popup slides up
```

Closing:

```text
popup
   |
   v
slides down
```

The background overlay fades at the same time.

This is intentionally different from simply changing:

```css
display: none;
```

because the application should feel responsive and app-like.

---

# 27. COPYING CREDENTIALS

Credential rows can be tapped.

The application tries:

```javascript
navigator.clipboard.writeText(...)
```

If clipboard access is unavailable, it uses a fallback selection method.

After copying, the button changes to:

```text
COPIED!
```

and later returns to:

```text
COPY
```

---

# 28. EMBEDDED HTML FROM THE DATA SOURCE

One of the important features of this application is that a data-source URL field can contain either:

1. A normal website URL
2. A complete HTML page / HTML fragment

The application detects raw HTML by checking whether the value behaves like an HTTP/HTTPS URL.

A normal URL:

```text
https://example.com
```

is treated as a website.

A value such as:

```html
<!DOCTYPE html>
<html>
...
</html>
```

is treated as embedded HTML.

---

# 29. HOW HTML SITES OPEN

Embedded HTML opens in the application's embedded-page view.

The embedded page has its own top navigation.

The top navigation contains:

```text
Back
Page title
Loading / Ready status
Open in browser
```

The HTML content fills the rest of the viewport.

The embedded HTML should therefore use essentially:

```text
┌──────────────────────────────┐
│ Back   Site title       ...  │
├──────────────────────────────┤
│                              │
│                              │
│        EMBEDDED HTML         │
│                              │
│                              │
└──────────────────────────────┘
```

The top bar stays outside the HTML frame.

---

# 30. EMBEDDED HTML SIZE

The iframe uses the available screen height.

It is intended to work on:

* iPhone
* iPad
* Android phones
* Android tablets
* desktop browsers
* laptops

Safe-area handling is included so the embedded page does not interfere with iPhone/iPad notches or home indicators.

---

# 31. EMBEDDED HTML LOADING

When an HTML page is opening, the application can show a loading spinner.

The spinner uses the original rotating style:

```css
.spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255,255,255,0.2);
    border-top: 4px solid #ffb300;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
```

The loading state should disappear when the embedded frame has loaded.

---

# 32. EMBEDDED HTML JAVASCRIPT

Raw HTML loaded into the embedded frame is sandboxed.

The iframe allows the permissions required by the application, including appropriate script/form behaviour.

The HTML page can therefore contain its own:

```text
HTML
CSS
JavaScript
forms
buttons
interactive content
```

This makes it possible for a data-source row to represent an entire mini application rather than just a link.

---

# 33. EMBEDDED HTML BACK BUTTON

The Back button belongs to the application, not to the embedded HTML.

Clicking it closes the embedded view.

The frame is reset to:

```text
about:blank
```

so the previous embedded page does not continue running in the background.

---

# 34. OPEN IN BROWSER

Embedded pages can also have an option to open the content outside the application's iframe when appropriate.

This is useful when:

* the embedded site does not support iframes
* the page needs a normal browser environment
* the user needs browser navigation
* an external site blocks embedding

---

# 35. EXTERNAL NORMAL LINKS

Normal external websites can be opened separately.

For example:

```text
https://example.com
```

can open in a new tab/window.

The application does not treat every URL as embedded HTML.

---

# 36. ACTIVITIES

Some versions of the application also support activity data.

An activity can contain fields such as:

```text
Title
Description
Duration
Difficulty
Participants
Equipment
InstructionsURL
LeaderRequired
CategoryKey
LogoURL
```

An activity can appear inside a category alongside ordinary links.

---

# 37. ACTIVITY POPUP

Selecting an activity can show information such as:

```text
Title
Description
Duration
Difficulty
Participants
Equipment
Instructions
Leader requirement
```

The same bottom-sheet animation system is used.

---

# 38. SIGNUP / ACCOUNT CREATION

The application can contain a signup button.

The signup destination is controlled by a constant such as:

```javascript
const SIGNUP_FORM_URL = "...";
```

To change the registration form, update that URL.

The site does not need a second signup backend if the existing form already handles account creation.

---

# 39. PWA / APP REQUIREMENT

The application is designed to be installed as an app.

This is important for the intended phone/tablet experience.

The site can show an installation overlay explaining how to add it to the Home Screen.

---

# 40. IPHONE

On iPhone, Safari does not always provide the same installation prompt as Android.

The app therefore provides manual instructions similar to:

```text
Open Safari
        |
Share
        |
Add to Home Screen
        |
Add
        |
Open the new JOTA-JOTI icon
```

The application detects iOS standalone mode.

---

# 41. IPAD

iPad is also supported.

Depending on the iPadOS/Safari version, the Share button may appear in a different location.

The application therefore provides an instruction suitable for iPad as well.

The same Home Screen / standalone behaviour is used.

---

# 42. ANDROID

Android browsers such as Chrome may provide a native install prompt.

The application can remember the browser's installation prompt.

Where a native prompt is unavailable, the application can provide:

```text
Install app
```

or:

```text
Add to Home screen
```

instructions.

---

# 43. DESKTOP PWA

On supported desktop browsers, the site can also be installed as a PWA.

The manifest and service worker are responsible for this.

---

# 44. PWA DETECTION

The application checks for standalone display mode.

For example:

```javascript
window.matchMedia('(display-mode: standalone)').matches
```

iOS also has its own standalone state:

```javascript
window.navigator.standalone === true
```

These checks should be kept when changing the installation system.

---

# 45. HEADER

The main header contains the site branding and navigation.

The header is designed to remain visible while navigating the main application.

It includes:

* Scouts branding
* JOTA-JOTI branding
* login/account controls where appropriate
* timer navigation where appropriate

---

# 46. PIN PAGE DESIGN

The PIN screen is deliberately simple.

The current design uses:

```text
Enter Scout PIN

JOTA-JOTI Dashboard

Pre-login information

Connection status

PIN display

1   2   3

4   5   6

7   8   9

    0  DEL

Continue as Guest
I DON'T HAVE AN ACCOUNT
BACK TO TIMER
```

The layout should remain compact rather than filling the page with unnecessary decorative blocks.

---

# 47. PIN RESPONSIVENESS

The PIN keypad automatically scales for:

* small phones
* normal phones
* large phones
* iPhone
* Android
* iPad
* Android tablets
* laptops
* desktop monitors
* landscape mode

The number of columns remains three.

The final row remains centred.

---

# 48. KEYBOARD ACCESSIBILITY

The PIN should continue working without requiring a mouse/touchscreen.

Users can:

* type digits
* use keypad digits
* use Delete/Backspace
* use Enter where appropriate
* use keyboard focus
* use Escape for dismissible overlays

---

# 49. ANIMATION SYSTEM

The application uses the original animation system.

Important animations include:

```css
@keyframes fadeIn
@keyframes slideUpIn
@keyframes pulse
@keyframes spin
```

---

# 50. FADE IN

The fade animation is used for things such as:

* login
* dashboard
* submenu
* content transitions

Base style:

```css
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

---

# 51. SLIDE UP

The slide-up animation is used for the loading/welcome layer and bottom-sheet interfaces.

```css
@keyframes slideUpIn {
    from {
        transform: translateY(100%);
    }

    to {
        transform: translateY(0);
    }
}
```

---

# 52. PULSE

The welcome message can pulse while the application is loading.

```css
@keyframes pulse {
    0% {
        opacity: 1;
    }

    50% {
        opacity: 0.8;
        transform: scale(0.98);
    }

    100% {
        opacity: 1;
    }
}
```

---

# 53. SPINNER

The main loading spinner uses:

```css
.spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255,255,255,0.2);
    border-top: 4px solid #ffb300;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
```

The important animation is:

```css
@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
```

Do not remove this animation if the loading screen is expected to show the spinning wheel.

---

# 54. CARD ANIMATIONS

Dashboard category cards use hover and press feedback.

Typical behaviour:

```text
Hover
   |
slightly lifts

Click
   |
slightly shrinks
```

This helps the user understand that a card is interactive.

---

# 55. POPUP ANIMATIONS

The access popup slides up from the bottom.

The overlay fades in.

Closing reverses the process.

The popup must maintain its visible/open state after the opening animation completes.

Do not use the animation itself as the source of truth for whether the popup is open.

The JavaScript state controls that.

---

# 56. ACCESSIBILITY / REDUCED MOTION

The application should respect:

```css
prefers-reduced-motion
```

Users who request reduced motion should receive simpler transitions.

Do not remove the reduced-motion support when changing the animation system.

---

# 57. COLOURS

The primary Scout/JOTA-JOTI colour is represented by:

```css
--scout-purple: #5a2c84;
```

The lighter purple background is:

```css
--scout-light-purple: #f3ebf8;
```

The application also uses:

```css
--bg-color
--surface
--text-main
--text-sub
```

These variables make it easier to change the site's core theme.

---

# 58. CHANGING THE MAIN PURPLE

To change the main purple, change:

```css
--scout-purple: #5a2c84;
```

Be aware that this colour is used in:

* headings
* buttons
* borders
* PIN numbers
* dashboard titles
* badges
* navigation
* loading elements

Changing the variable is therefore preferable to changing individual rules.

---

# 59. CHANGING THE PAGE BACKGROUND

The page background is controlled by the `body` CSS.

Keep it simple.

The intended design does not rely on:

* neon glows
* excessive glassmorphism
* huge decorative blobs
* heavy gradient backgrounds

The application is designed to look more like a polished app/dashboard.

---

# 60. ADDING A NEW BUTTON

A normal button can use an existing class such as:

```html
<button class="activity-open-btn">
    Take me to the site
</button>
```

Using an existing class is preferable to creating a new style for every button.

---

# 61. CHANGING BUTTON TEXT

Button text is usually defined directly in JavaScript.

Examples:

```javascript
button.innerText = "Take me to the site";
```

or:

```javascript
button.innerText = "Not Now";
```

Search `index.html` for the visible text if you need to change it.

---

# 62. CHANGING THE DASHBOARD TITLE

The dashboard title can be changed in the HTML.

Look for the relevant:

```html
<div class="section-title">
```

or a JavaScript assignment such as:

```javascript
innerText = ...
```

The actual categories are normally data-driven, so do not hardcode individual category names unless there is a reason to do so.

---

# 63. CHANGING THE PIN TITLE

Look for:

```html
<h2 class="login-title">
    Enter Scout PIN
</h2>
```

Change the text there.

---

# 64. CHANGING THE PIN INSTRUCTIONS

The pre-login instructions can be changed in:

```html
<p class="prelogin-note">
```

Be careful when changing this because it explains the relationship between pre-login mode and the countdown.

---

# 65. CHANGING THE CONNECTION STATUS

The connection indicator uses a small dot and text.

It can show states such as:

```text
Connected
```

or:

```text
Dashboard service is currently unreachable
```

The status should represent a real backend/network check.

Do not hardcode it as permanently connected.

---

# 66. DEBUGGING THE DASHBOARD

The application contains diagnostic functions in the JavaScript.

Useful functions include:

```javascript
getDashboardUiState()
```

and:

```javascript
assertDashboardUiStable()
```

These can be run from the browser developer console.

For example:

```javascript
getDashboardUiState()
```

can show the current internal dashboard state.

---

# 67. DASHBOARD VIEW STATES

The dashboard tracks views such as:

```text
login
categories
submenu
```

This is important.

Do not replace the state system with repeated direct calls such as:

```javascript
dashboard.style.display = ...
```

everywhere.

Use the existing view functions when possible.

---

# 68. IMPORTANT FUNCTIONS

Some of the main JavaScript functions include:

```text
initializeCombinedPortal()
showTimerMode()
openPreLogin()
returnToTimer()
openDashboardMode()
updateCountdown()
startCountdown()
stopCountdown()
restoreRememberedSessionInstantly()
refreshRememberedSession()
fetchUserData()
logout()
buildDashboard()
openSubMenu()
showDashboard()
openSite()
launchSite()
showAccessPopup()
openEmbeddedSite()
closeEmbeddedSite()
openSheet()
closeSheet()
createCopyRow()
initializePWA()
registerAppServiceWorker()
```

These functions control most of the site's behaviour.

---

# 69. INITIALIZATION

The application starts from:

```javascript
DOMContentLoaded
```

and then calls:

```javascript
initializeCombinedPortal()
```

The initialization process sets up:

* login state
* PWA
* greetings
* countdown
* remembered session
* dashboard mode
* connection checks

---

# 70. DO NOT DUPLICATE INITIALIZATION

Only one main initialization sequence should run.

Running the initialization twice can cause:

* duplicate timers
* duplicate service workers
* duplicate network requests
* repeated dashboard builds
* popup state resets

If changing initialization, make sure it still happens only once.

---

# 71. LIVE DATA

Categories, links, logos and user information should come from the backend.

The application should not silently replace missing live data with fake dashboard content.

This is especially important for:

* user credentials
* site links
* account permissions
* categories
* restricted sites

---

# 72. SHEET DATA ORGANISATION

The frontend is designed around data structures that commonly correspond to backend tables/sheets such as:

```text
Users
Categories
Links
Logos
Activities
```

Earlier backend versions can also contain additional configuration tables such as:

```text
BlockedURLs
BlockedCategories
Settings
```

The exact backend sheet names and columns are controlled by the Apps Script backend.

If the backend changes its column names, update the backend and frontend together.

---

# 73. USERS DATA

The Users data represents Scout accounts.

It can contain fields used for:

```text
PIN
Name
Username
Password
Email
other account information
```

The frontend does not invent accounts.

The PIN must be accepted by the real backend.

---

# 74. CATEGORIES DATA

Categories describe the groups visible on the dashboard.

Typical data:

```text
CategoryKey
Title
LogoURL
```

---

# 75. LINKS DATA

Links describe websites or HTML pages.

Typical fields:

```text
LinkID
CategoryKey
Title
URL
RequiresLogin
RequiresEmail
CanEmbed
LogoURL
Active
```

---

# 76. LOGOS DATA

Some backend versions use a dedicated logos dataset.

The frontend may receive:

```text
logos
```

alongside categories and links.

The exact use depends on the backend implementation.

---

# 77. ACTIVITIES DATA

Activities can describe real-world Scout/JOTA-JOTI activities.

Typical fields:

```text
Title
Description
CategoryKey
Duration
Difficulty
Participants
Equipment
InstructionsURL
LeaderRequired
LogoURL
```

---

# 78. HOW TO ADD A LINK

To add a link, create a backend row containing the correct fields.

For example:

```text
CategoryKey: chat
Title: JOTA-JOTI Chat
URL: https://example.com/chat
RequiresLogin: 0
RequiresEmail: 0
CanEmbed: false
```

After the backend is updated, refreshing the app should load the new entry.

---

# 79. HOW TO MAKE A LINK REQUIRE LOGIN

Set the appropriate access requirement.

For example:

```text
RequiresLogin = 1
```

causes the application to use the saved account details where appropriate.

---

# 80. HOW TO REQUIRE AN EXTERNAL ACCOUNT

Use the external access level.

For example:

```text
RequiresLogin = 3
```

The popup can warn that the destination requires its own account.

---

# 81. HOW TO REQUIRE AN EMAIL

Use:

```text
RequiresEmail
```

with the appropriate level.

The application can distinguish between:

```text
saved account email
```

and:

```text
user's own email required
```

---

# 82. HTML IN THE DATA SOURCE

If the URL field contains a normal URL:

```text
https://example.com
```

it is treated as a normal URL.

If the URL field contains HTML:

```html
<html>
    ...
</html>
```

the application treats it as embedded HTML.

This is one of the most important capabilities of the site.

---

# 83. SAFE HTML HANDLING

Raw HTML is loaded into the embedded iframe rather than inserted directly into the main application's DOM.

This prevents the embedded page from unnecessarily replacing the main application's elements.

It also gives the embedded page its own document.

---

# 84. WHAT NOT TO CHANGE

Avoid changing these unless you understand the consequences:

```text
dashboard state handling
timer handoff handling
PWA detection
service-worker registration
API URL
access-level interpretation
HTML iframe sandbox
session storage logic
```

These areas are interconnected.

A small change can cause the application to:

* reopen login
* lose the dashboard
* repeatedly rebuild categories
* stop PWA installation
* stop embedded HTML
* lose remembered accounts

---

# 85. COMMON CHANGE: NEW CATEGORY

Recommended process:

```text
1. Add category to backend.
2. Give it a unique CategoryKey.
3. Add LogoURL.
4. Add links using the same CategoryKey.
5. Deploy/update backend.
6. Reload app.
```

Do not hardcode the category into `buildDashboard()` unless absolutely necessary.

---

# 86. COMMON CHANGE: NEW WEBSITE

Recommended process:

```text
1. Add new link to backend.
2. Give it a CategoryKey.
3. Add title.
4. Add URL or HTML.
5. Configure access requirements.
6. Configure embedding if applicable.
7. Refresh the app.
```

---

# 87. COMMON CHANGE: NEW HTML APP

Recommended process:

```text
1. Add the HTML to the appropriate backend field.
2. Make sure the value is recognised as raw HTML.
3. Add it to the correct category.
4. Test the HTML independently.
5. Test it inside the application's embedded view.
```

Test:

* buttons
* forms
* JavaScript
* scrolling
* mobile layout
* iframe behaviour

---

# 88. COMMON CHANGE: CHANGE LOGO

Change the data-source `LogoURL`.

The frontend will automatically use the new image.

Do not needlessly edit every generated card in JavaScript.

---

# 89. COMMON CHANGE: CHANGE COLOUR

Prefer changing CSS variables:

```css
--scout-purple
--scout-light-purple
--bg-color
--surface
--text-main
--text-sub
```

rather than searching for every individual colour.

---

# 90. COMMON CHANGE: CHANGE ANIMATION SPEED

For example:

```css
animation: fadeIn 0.5s ease;
```

could become:

```css
animation: fadeIn 0.35s ease;
```

The spinner:

```css
animation: spin 1s linear infinite;
```

could become:

```css
animation: spin 0.8s linear infinite;
```

A smaller number means faster animation.

---

# 91. COMMON CHANGE: DISABLE ANIMATION FOR ACCESSIBILITY

The application should retain:

```css
@media (prefers-reduced-motion: reduce)
```

This lets supported devices reduce or remove animations automatically.

Do not delete it.

---

# 92. INSTALLING THE APPLICATION FOR TESTING

For PWA installation, the application normally needs to be served over:

```text
HTTPS
```

or an appropriate secure/local development environment.

Opening `index.html` directly from:

```text
file://
```

does not accurately reproduce all PWA behaviour.

---

# 93. TESTING THE APPLICATION

After modifying the code, test:

```text
Countdown
PIN keypad
Keyboard PIN input
Invalid PIN
Valid PIN
Remembered login
Logout
Dashboard
Category
Submenu
Back button
Password popup
Outside popup click
Copy credentials
Take me to site
External site
Embedded HTML
Embedded HTML JavaScript
Embedded HTML Back button
Spinner
PWA install
iPhone layout
iPad layout
Android layout
Desktop layout
Landscape mode
```

---

# 94. IMPORTANT TIMER TEST

Do not test only the normal login screen.

The timer handoff is particularly important.

Test:

```text
Before final 24 hours
        |
Countdown

Final 24 hours
        |
Dashboard

Open category
        |
Open submenu
        |
Wait
        |
Submenu must stay open
```

The countdown must not rebuild the dashboard repeatedly.

---

# 95. IMPORTANT POPUP TEST

Test:

```text
Open protected link
        |
Popup appears
        |
Wait several seconds
        |
Popup must still be open
```

Then test:

```text
Click inside
        |
Must remain open
```

Then:

```text
Click outside
        |
Slide down
        |
Close
```

Then reopen and test:

```text
Take me to the site
        |
Destination opens
        |
Popup closes
```

---

# 96. IMPORTANT EMBED TEST

Test an HTML entry containing:

```html
<h1>Test</h1>
<button onclick="...">Test button</button>
```

Confirm:

```text
HTML opens
Spinner appears
HTML fills page
Button works
Back works
Frame closes
```

---

# 97. IMPORTANT SESSION TEST

Test:

```text
Login
        |
Reload
        |
Account remembered
        |
No unnecessary login prompt
```

Then:

```text
Disconnect network temporarily
        |
Reload
        |
Remembered session remains visible
```

Then:

```text
Backend rejects account
        |
Session is cleared
        |
Login is shown
```

---

# 98. MOBILE TESTING

Test at least:

```text
Small iPhone
Normal iPhone
Large iPhone
iPad portrait
iPad landscape
Android phone
Android tablet
```

Look for:

* clipped buttons
* content behind notch
* content behind home indicator
* horizontal scrolling
* oversized keypad
* popup overflow
* embedded iframe height
* header overlap

---

# 99. LANDSCAPE TESTING

Landscape mode is particularly important for:

* iPhone
* Android phones
* iPad
* tablets

Make sure:

```text
PIN keypad
```

does not extend beyond the viewport.

---

# 100. PERFORMANCE

The application is intended to feel fast.

To keep it fast:

* avoid rebuilding the dashboard unnecessarily
* avoid repeated login requests
* avoid unnecessary timers
* avoid repeated DOM creation
* stop intervals that are no longer required
* avoid loading large images unnecessarily
* keep live backend data separate from UI rendering
* keep the service worker shell small

---

# 101. BACKUPS

The project contains a:

```text
backups/
```

folder.

This contains earlier versions of important files.

Before making a large structural change, make another copy.

For example:

```text
backups/index-before-new-dashboard-change.html
```

This makes it possible to revert if a change breaks something.

---

# 102. DEPLOYMENT

A typical deployment consists of:

```text
index.html
manifest.json
photo1.png
sw.js
```

and any other required project files.

Upload the complete project.

Do not upload only `index.html` if the PWA files are also required.

---

# 103. SERVICE WORKER AFTER DEPLOYMENT

If an installed app still appears to use an older version:

1. Confirm the new files are deployed.
2. Confirm the service-worker cache version changed.
3. Reload the application.
4. Close/reopen the installed application.
5. Test again.

Changing:

```javascript
CACHE_NAME
```

is particularly useful after major app-shell changes.

---

# 104. TROUBLESHOOTING: LOGIN WON'T WORK

Check:

```text
API_URL
```

Then check:

```text
Apps Script deployment
```

Then check whether the browser can reach the backend.

Also check the browser console.

---

# 105. TROUBLESHOOTING: LOGIN KEEPS APPEARING

Check:

```text
SAVED_PIN_KEY
AUTH_SESSION_KEY
```

and the remembered session functions.

Also check whether the backend is rejecting the account.

Do not simply force the application to stay logged in if the backend has genuinely rejected the account.

---

# 106. TROUBLESHOOTING: POPUP DISAPPEARS

Check:

```text
openSheet()
closeSheet()
```

and the access popup state.

The popup should not have a timer automatically calling:

```javascript
closeSheet()
```

unless the user explicitly requested that behaviour.

Check outside-click handling.

---

# 107. TROUBLESHOOTING: HTML PAGE DOES NOT OPEN

Check whether the data value is actually:

```text
http://
https://
```

or raw HTML.

If raw HTML detection fails, the application may incorrectly treat the content as a URL.

---

# 108. TROUBLESHOOTING: HTML PAGE IS TOO SMALL

Check:

```text
#embed-screen
#embed-frame
.embed-header
```

The iframe should fill the remaining viewport.

Avoid adding fixed heights to the iframe unless required for a specific design.

---

# 109. TROUBLESHOOTING: SPINNER DOES NOT SPIN

Check that the CSS contains:

```css
.spinner {
    animation: spin 1s linear infinite;
}
```

and:

```css
@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
```

Also check whether a global reduced-motion rule is intentionally disabling animation.

---

# 110. TROUBLESHOOTING: DASHBOARD FLASHES

Check whether a timer function is calling:

```javascript
openDashboardMode()
```

repeatedly.

The dashboard should only switch modes when required.

Do not place dashboard rebuilding inside a one-second timer.

---

# 111. TROUBLESHOOTING: PWA DOES NOT INSTALL

Check:

```text
manifest.json
sw.js
HTTPS
scope
start_url
icons
```

Also test from the actual browser rather than a `file://` URL.

On iPhone/iPad, use Safari's:

```text
Share
Add to Home Screen
```

workflow.

---

# 112. TROUBLESHOOTING: OLD VERSION STILL APPEARS

This is often caused by the service worker.

Try:

```text
Update CACHE_NAME
```

then redeploy.

Also inspect the browser's service-worker storage when testing.

---

# 113. DEVELOPMENT RULE

When changing a feature:

```text
Change one area
        |
Syntax check
        |
Test the feature
        |
Test related features
        |
Create backup
        |
Deploy
```

Do not change login, timer, PWA and dashboard logic simultaneously without testing between changes.

---

# 114. RECOMMENDED DEVELOPMENT ORDER

For large updates use this order:

```text
1. Backend/data structure
2. API response
3. Login/session
4. Dashboard data
5. Navigation
6. Embedded pages
7. Styling
8. Animations
9. PWA
10. Mobile testing
```

This makes problems easier to locate.

---

# 115. DESIGN PRINCIPLES

The current visual direction is intentionally clean.

Avoid:

* generic neon gradients
* excessive glowing borders
* unnecessary glassmorphism
* huge empty gaps
* repeated identical card layouts where they are not useful
* generic stock illustrations
* meaningless marketing slogans
* excessive tiny eyebrow labels
* overly complicated nested HTML

The interface should feel like a real Scout event application rather than a generic AI-generated landing page.

---

# 116. CONTENT PRINCIPLES

Use direct language.

Prefer:

```text
Enter Scout PIN
```

over:

```text
Empower your next-generation Scout access workflow
```

Use real instructions.

For example:

```text
Enter your 4-digit PIN.
```

is better than generic marketing copy.

---

# 117. CODE PRINCIPLES

Keep the code understandable.

Prefer:

```javascript
openEmbeddedSite(site);
```

over duplicating all of the iframe logic in several places.

Prefer existing CSS classes over adding a new class for every tiny change.

Keep the state system centralised.

Avoid unnecessary comments that only describe obvious HTML sections.

---

# 118. SECURITY / DATA PRINCIPLES

The frontend is not a replacement for backend security.

The backend should remain responsible for deciding whether a PIN is valid.

The frontend should not invent successful login responses.

Do not put backend secrets into the frontend.

Do not hardcode real private credentials into the HTML.

---

# 119. ACCOUNT CREDENTIAL DISPLAY

The application can display saved account information when a Link requires it.

This is intended for the authenticated user's own information.

The access popup should only display values that the current backend response supplies.

Do not hardcode another person's credentials into the frontend.

---

# 120. FINAL PROJECT STRUCTURE

The expected project structure is approximately:

```text
jota-joti-app-main/
│
├── index.html
├── manifest.json
├── sw.js
├── photo1.png
├── README.md
│
└── backups/
    ├── older index.html versions
    └── older sw.js versions
```

---

# 121. QUICK REFERENCE

## Change event date

Search:

```javascript
EVENT_START_ISO
```

## Change API

Search:

```javascript
API_URL
```

## Change signup form

Search:

```javascript
SIGNUP_FORM_URL
```

## Change main purple

Search:

```css
--scout-purple
```

## Change PIN title

Search:

```html
Enter Scout PIN
```

## Change countdown

Search:

```javascript
updateCountdown
```

## Change dashboard rendering

Search:

```javascript
buildDashboard
```

## Change categories/submenus

Search:

```javascript
openSubMenu
showDashboard
```

## Change access popup

Search:

```javascript
showAccessPopup
openSheet
closeSheet
```

## Change HTML embedding

Search:

```javascript
openEmbeddedSite
closeEmbeddedSite
```

## Change loading spinner

Search:

```css
.spinner
@keyframes spin
```

## Change PWA installation

Search:

```javascript
initializePWA
registerAppServiceWorker
```

## Change cache version

Search:

```javascript
CACHE_NAME
```

---

# 122. FINAL TEST CHECKLIST

Before calling a release complete, verify:

* [ ] Countdown appears
* [ ] Countdown reaches final 24-hour handoff correctly
* [ ] Login opens
* [ ] PIN keypad works
* [ ] Physical keyboard works
* [ ] Invalid PIN behaves correctly
* [ ] Valid PIN works
* [ ] Remembered account works after reload
* [ ] Temporary network failure does not unnecessarily log the user out
* [ ] Genuine account rejection clears the session
* [ ] Dashboard loads
* [ ] Category cards work
* [ ] Submenus work
* [ ] Submenu stays open while the application is idle
* [ ] Back button works
* [ ] Protected links show the access popup
* [ ] Access popup stays open
* [ ] Copy buttons work
* [ ] Outside click closes popup
* [ ] Not Now closes popup
* [ ] Take me to the site works
* [ ] Normal external links work
* [ ] Raw HTML links work
* [ ] Embedded HTML fills the page
* [ ] Embedded HTML JavaScript works
* [ ] Embedded page Back button works
* [ ] Embedded spinner works
* [ ] Main login spinner works
* [ ] Animations work
* [ ] Reduced-motion behaviour works
* [ ] iPhone layout works
* [ ] iPad layout works
* [ ] Android layout works
* [ ] Desktop layout works
* [ ] Landscape layout works
* [ ] PWA manifest works
* [ ] Service worker updates correctly
* [ ] Home Screen installation works
* [ ] Old service-worker cache does not continue serving a broken version

---

# 123. VERSIONING

When making a major update, update a version identifier in the README.

Example:

```text
Version: 3.0
```

A useful release note should include:

```text
Version
Date
Major changes
Bug fixes
PWA changes
Backend changes
Testing performed
```

---

# 124. CURRENT PURPOSE OF THE APPLICATION

The application is intended to provide one central place for Scouts to:

* prepare for JOTA-JOTI
* see the event countdown
* sign in using their Scout PIN
* access organised categories
* open approved websites
* access interactive HTML applications
* view relevant activity information
* use saved account information where appropriate
* install the portal as a mobile app

The goal is for the application to behave consistently across browser, phone, tablet and installed-PWA environments while keeping the main interface simple and responsive.

```
```
