# JOTA-JOTI Dashboard — Boulder Scout Group

Unofficial JOTA-JOTI 2026 website and administration system for Boulder Scout Group.

## Public routes

- `/` — main countdown/dashboard
- `/setup` — family setup guide
- `/skip` — dashboard testing route
- `/track` — JID World Tracker
- `/admin` — protected leader admin centre

## `/admin`

The admin centre is the live management interface. It reads and writes the existing Google Sheet instead of maintaining a separate copy. It handles participant accounts, PINs, passwords, activities, categories, links/resources, photos/logos, paperwork reminders, settings, cache control and audit history.

Participant tools include a private print view, **Download account CSV** and **Download password PDF**. Activity/category/link editors can reuse images already present in the live **Logos** sheet or upload a new image.

## Live sheet import behaviour

Existing `LogoKey` values are resolved through the `Logos` sheet automatically. Existing direct image URLs are respected as fallbacks. The admin repair action fills missing `LogoURL`, `PhotoURL`, `IsHTML` and `Active` values without replacing existing rows.

## Backend

`Code.gs` is the private Google Apps Script backend. **Do not upload it to the public GitHub Pages repository.** Deploy it from the Apps Script project attached to the live JOTA-JOTI spreadsheet.

The admin API uses short-lived session tokens. The only unauthenticated admin request is `adminLogin`; participant data, credentials and admin writes require the issued token.

## Deployment

See `ADMIN-CENTRE.md` and `START-HERE.txt`.
