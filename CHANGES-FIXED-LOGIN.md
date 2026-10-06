# JOTA-JOTI fixed login bundle

## Root cause found
The project contained multiple Apps Script Web App URLs. The participant login page was calling a different deployment from the live V5 deployment documented for the exact Boulder Scout Group spreadsheet.

## Canonical live Web App
https://script.google.com/macros/s/AKfycbw-hxoPf6btTvwNXBXK7w_4hhCH98w6_mrZGb5ChjfhYF-x4-FAaNKGkhzDFmPavYo/exec

This URL is now used consistently by:
- `script.js`
- `config.js`
- `admin.js`
- `Code.gs`
- `Code (1).gs`

## Spreadsheet source of truth
The backend remains hard-wired to the live spreadsheet ID already documented by the project:
`1l6ZXb8ah7HrnE5D75nNtpu3IdQ-mpg1-M6RvsbBxJGk`

The supplied workbook confirms the expected `Users` sheet layout and live account rows.

## Other fixes
- `index.html` now loads `config.js` before `script.js`.
- `script.js` uses `window.JOTA_CONFIG.API_URL` when available, with the canonical URL as fallback.
- Public diagnostics no longer expose sample participant PINs; it reports counts instead.
- `Code (1).gs` is kept identical to the fixed backend so the duplicate file cannot reintroduce a stale deployment URL.
- Existing live-sheet PIN lookup remains the final source of truth, with cache used only as the fast path.
