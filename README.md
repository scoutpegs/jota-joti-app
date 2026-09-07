# JOTA-JOTI PIN Reference Layout

This build keeps the working PIN, keyboard, session, PWA, dashboard and Sheet-HTML functionality while applying the supplied reference screenshot as the visual target for the PIN page.

## PIN page changes
- Clean light-grey page background; no decorative page gradients or neon borders.
- 84px desktop header with centered Scouts Australia/JOTA-JOTI branding and a compact navigation action.
- Responsive title, subtitle, pre-login note and connection state.
- Four PIN positions show the actual entered numbers as they are typed.
- Keypad uses the reference layout: 1–9 in three columns, with 0 and DEL centered on the final row.
- Desktop keypad: 80x74px buttons with 18px gaps.
- Smaller breakpoints scale the same arrangement for phones and landscape devices.
- Keyboard focus and touch/press states remain animated.
- The existing spinning login loader and embedded-page loader remain intact.
- Password/access sheet keeps its slide-up behavior.

## Validation
- JavaScript syntax check: passed.
- Service worker syntax check: passed.
- Manifest JSON validation: passed.
- The final build was created from the last working PIN-number version rather than from an already-corrupted intermediate source.


## Password/access popup stability repair

The access/password popup is now persistent after opening. Clicking outside the popup no longer dismisses it. It remains visible until the user explicitly chooses **Take me to the site**, **Not Now**, or presses Escape. The popup has a stable open state after its entrance animation, preventing the previous animation from finishing and snapping the popup back down.

The destination launch is triggered before the close animation starts so the action cannot be lost during the transition.

## Full-page embedded HTML + outside-tap popup fix

- Embedded HTML now uses the entire app viewport underneath its own top navigation row.
- The embedded iframe fills the remaining height on phones, tablets, iPad and desktop.
- Safe-area insets are respected for iPhone/iPad notches and browser chrome.
- A tap/click on the darkened area outside the access popup closes it with the normal slide-down animation.
- Clicks inside the access popup are isolated so copying credentials, scrolling, and pressing buttons cannot trigger an outside-close.
- The popup still only closes after an explicit Continue/Take me to the site action, Not Now, Escape, or an outside tap.
- Service-worker cache revision was bumped for the updated embedded-page and popup behavior.
