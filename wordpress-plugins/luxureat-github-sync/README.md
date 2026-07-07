# LuxurEat GitHub Sync

WordPress admin plugin for exporting the live site's public content to GitHub.

The recommended target is `errpenk/luxureat-website-source`, because that repository is the source of truth. `errpenk/luxureat-wordpress-theme` is available as a selectable target, but it is a generated deployment repository and is not recommended for content snapshots.

## What It Exports

- Site title, tagline, URL, language, and timezone.
- Active theme name, version, stylesheet, and template.
- Front page settings.
- Published pages and posts.
- Navigation menus and menu items.
- Public media attachment URLs, captions, descriptions, MIME types, and alt text.

It does not export users, comments, drafts, passwords, private post content, plugin files, cache files, or server files.

## GitHub Token

Create a fine-grained personal access token in GitHub with access only to the repository you want to sync.

Required permission:

- Contents: Read and write

Recommended repository:

- `errpenk/luxureat-website-source`

Optional repository:

- `errpenk/luxureat-wordpress-theme`

Keep the token private. The plugin stores it in WordPress options and never prints the stored token back into the admin form.

## Install

1. Upload `luxureat-github-sync.zip` in WordPress under Plugins -> Add New -> Upload Plugin.
2. Activate **LuxurEat GitHub Sync**.
3. Open Tools -> LuxurEat GitHub Sync.
4. Paste the GitHub token.
5. Keep the repository set to `errpenk/luxureat-website-source`.
6. Keep the file path as `content/wordpress-export.json`.
7. Click **Save Settings**.
8. Click **Sync to GitHub**.
