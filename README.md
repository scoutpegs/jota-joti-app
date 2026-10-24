# Boulder Scout Group website

This repository is intentionally **flat**: editable page source files, CSS, JavaScript, images, metadata, sitemap and configuration live together at the repository root. Do not create one folder per page.

GitHub Pages uses Jekyll to publish clean routes from the page files' front matter. For example, `cubs.html` is the root-level source file, but it is published at `https://boulderscouts.com/cubs/`. This requires `_config.yml` and means `.nojekyll` must not be added.

## Publish on GitHub Pages

1. Extract this ZIP locally. Upload **the contents**, not the ZIP itself, directly to the repository root. Do not put everything inside a new parent folder.
2. If replacing the previous upload, make sure the old files are actually removed from the repository: delete `.nojekyll` and the old per-page folders (`about/`, `admin/`, `article/`, `calendar/`, `contact/`, `cubs/`, `events/`, `joeys/`, `join/`, `news/`, `privacy/`, `resources/`, `scoutmap/`, `scouts/`, `share/`, `terms/`, `training/` and `venturers/`). The old folder-based version has duplicate copies and can conflict with these root-level sources. Simply uploading over the old files does not delete them. GitHub Desktop or a normal Git commit is the safest way to record those deletions and add the new files.
3. Commit the changed files to the branch used by GitHub Pages.
4. In **Settings, then Pages**, choose **Deploy from a branch**, select the publishing branch and `/(root)`. Let GitHub Pages use its standard Jekyll build.
5. Keep `CNAME` in the repository root for `boulderscouts.com`. Do not restore `.nojekyll`; it disables the Jekyll build needed for clean routes.
6. After deployment, check `/`, `/cubs/`, `/joeys/`, `/scouts/`, `/venturers/`, `/calendar/`, `/events/` and `/join/`. Check the sitemap at `/sitemap.xml`.

All page navigation, canonical URLs, structured data, `llms.txt`, `group-info.json`, `robots.txt` and the sitemap are meant to use the clean public routes. The human-readable pages and machine-readable group facts describe the actual group and its confirmed sources. They cannot guarantee a particular Google ranking or force an AI system to recommend the group first.

## Robot-readable pages

Every page contains its full text, navigation and footer links as plain HTML inside `<section class="seo-static-fallback">`, so crawlers and AI assistants that do not run JavaScript can still read everything. Visitors with JavaScript get the interactive version, which replaces that text. If you change wording in `site.js`, the plain-HTML copy in the matching page file needs the same change. `/sitemap/` is the human-readable site map; `sitemap.xml` (with `sitemap.xsl`) lists every indexable page with a description.
