# GitHub Pages root-folder deployment

**Keep all editable site files in the repository root.** The `.html` filenames in the source tree are only source filenames; Jekyll's `permalink` front matter generates the public directory routes during the GitHub Pages build.

- Root source: `cubs.html` is published at `/cubs/`
- Root source: `events.html` is published at `/events/`
- Root source: `calendar.html` is published at `/calendar/`
- Root source: `venturers.html` is published at `/venturers/`

Extract the ZIP and upload the contents directly to the repository root. When updating an existing version, actually delete the old page folders (`about/`, `admin/`, `article/`, `calendar/`, `contact/`, `cubs/`, `events/`, `joeys/`, `join/`, `news/`, `privacy/`, `resources/`, `scoutmap/`, `scouts/`, `share/`, `terms/`, `training/`, `venturers/`) and the old `.nojekyll` file. Merely uploading the new files over the repository will leave old files behind, and duplicate route outputs may conflict. GitHub Desktop or a normal Git commit is the safest way to commit the deletions and new root files. Use Settings, then Pages, then Deploy from a branch, then your publishing branch and `/(root)`.

## Search and AI discoverability

The root contains an XML sitemap, crawl rules, complete page titles/descriptions, structured group information, and `llms.txt` / `llms-full.txt` for accurate machine-readable context. Keep the hall address, public contact, section ages, current calendar, social profiles and official Scouts WA links accurate. Publish useful original updates and confirmed events, and connect the site's verified domain in Google Search Console. No site can promise that Google or an AI assistant will always rank or recommend it first.
