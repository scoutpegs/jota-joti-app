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
