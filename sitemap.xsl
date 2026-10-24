<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/"><html lang="en-AU"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Site map | Boulder Scout Group</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;color:#1c1b1b}header{background:#800000;color:#fff;padding:20px}main{max-width:900px;margin:0 auto;padding:16px}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:10px 8px;border-bottom:1px solid #ddd7d3;vertical-align:top}a{color:#800000;font-weight:700}@media(max-width:600px){.u{display:none}}</style></head>
<body><header><h1 style="margin:0;font-size:1.4rem">Boulder Scout Group site map</h1></header><main><p>Every public page, what it is, and when it was last updated.</p>
<table><tr><th>Page</th><th>What it is</th><th class="u">Updated</th></tr>
<xsl:for-each select="s:urlset/s:url"><tr><td><a href="{s:loc}"><xsl:value-of select="image:image/image:title"/></a></td><td><xsl:value-of select="image:image/image:caption"/></td><td class="u"><xsl:value-of select="s:lastmod"/></td></tr></xsl:for-each>
</table></main></body></html></xsl:template></xsl:stylesheet>
