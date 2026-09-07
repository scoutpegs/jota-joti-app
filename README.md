# JOTA-JOTI Dashboard — Improved Build

This build keeps the original application structure and adds a stronger session/reload flow, a stable timer-to-dashboard handoff, responsive UI improvements, and PWA install support.

## Key behaviour

- Remembered users are restored immediately on reload so the login screen does not flash every time.
- The most recent account identity is remembered locally, while dashboard categories, links and logos are still fetched from the live backend/Sheet service.
- A background refresh updates the remembered session without blocking the first screen.
- A temporary network failure does not force the user to log back in.
- A genuine backend rejection clears the remembered session and requires a fresh PIN.
- The final-day countdown handoff is one-time and cannot repeatedly rebuild the dashboard.
- Category/submenu state is protected from timer updates and accidental DOM rebuilds.
- iPhone/iPad Safari installation instructions remain available, including the iPad share-menu location guidance.
- Android install instructions support both native PWA install and Add to Home screen flows.
- The service worker version is bumped so updated deployments can replace old cached shells.
- No fake dashboard/sheet data is substituted when the backend is unavailable.

## Backups

The `backups/` directory contains the original and intermediate fixed versions of the main HTML/service-worker files.
