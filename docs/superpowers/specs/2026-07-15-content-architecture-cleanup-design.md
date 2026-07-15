# LuxurEat Content Architecture Cleanup Design

## Goal

Remove confirmed dead and duplicate source code, separate product, event, journal, and brand content by domain, and make text and media easy to update from one authoritative location without changing the current visual design or interactions.

## Constraints

- Preserve all current uncommitted user changes.
- Do not upload or push to `backup` or `main`.
- Preserve current Chinese and English page behavior and WordPress theme output.
- Keep the existing static HTML, CSS, and JavaScript stack; add no framework or runtime dependency.
- Keep existing `window.LUXUREAT_*_DATA` browser interfaces where practical to minimize regression risk.
- Treat `.deploy/`, generated ZIP files, and QA screenshots as build artifacts rather than editable sources.

## Source Structure

```text
assets/
  data/
    products.js
    events.js
    journal.js
    brand.js
  js/
    core.js
    products.js
    events.js
    journal.js
    brand.js
  media/
    products/
    events/
    journal/
    brand/
  fonts/
```

Each domain has one data source and, only when needed, one interaction/rendering script. Shared navigation, scroll restoration, footer behavior, and other site-wide behavior live in `core.js`.

## Content Ownership

### Products

`assets/data/products.js` owns bilingual product names, descriptions, prices, units, identifiers, specifications, primary images, and galleries. Product grids, product details, recommendations, and the shopping bag must resolve product information from this source rather than copying values into HTML or another script.

Product images live in `assets/media/products/` and use descriptive names based on product identifiers.

### Events

`assets/data/events.js` owns bilingual event metadata, card copy, article copy, dates, locations, calendar links, statuses, and image references. The home-page latest-event module, recent-event module, archive, and event reader use this source.

Event images live in `assets/media/events/`. The supplied image `codex-clipboard-03987bc2-3f2b-426c-9de0-e610c89fb338.png` becomes the current Marca China 2026 event image and is referenced by both the latest-event card and event reader.

### Journal

The current `assets/data/articles.js` is renamed to `assets/data/journal.js`. It owns bilingual journal metadata, article body copy, related-article relationships, and media references. Journal cards, archives, and readers use this source.

Journal images live in `assets/media/journal/` with descriptive article-oriented names.

### Brand

`assets/data/brand.js` owns repeated bilingual brand facts and reusable brand-module copy. Page-specific prose that appears only once may remain in its HTML page; repeated or cross-page copy must come from `brand.js`.

Brand imagery, logos, QR codes, and reusable editorial brand photography live in `assets/media/brand/`.

## JavaScript Boundaries

- `core.js`: navigation, menu state, internal-link prefetching, scroll restoration, back-to-top, and footer actions.
- `products.js`: product catalog controls, product details, gallery controls, shopping bag, and product recommendations.
- `events.js`: latest/recent event rendering and event reader behavior.
- `journal.js`: journal archive and article reader behavior.
- `brand.js`: brand-module hydration only where shared content requires it.

Code remains in one file when splitting it would create a file with no independent responsibility. Shared helpers are duplicated only when they are trivial and domain-local; otherwise they remain in `core.js` under a small public namespace.

## HTML and CSS Boundaries

HTML retains semantic page structure, navigation, and stable mount points. Dynamic records are rendered from domain data rather than duplicated in page markup.

`integration.css` remains the single stylesheet unless a block is both large and clearly domain-specific. The cleanup removes selectors only after confirming they are absent from all source HTML and generated JavaScript class names. CSS is not split solely to make the directory look symmetrical.

## Cleanup Rules

1. Delete code only after tracing all static and dynamically generated references.
2. Remove obsolete compatibility branches, duplicate render paths, and superseded event templates.
3. Do not edit generated `.deploy/` files directly.
4. Rebuild generated theme output after source changes.
5. Preserve top-level redirect stubs because they are public compatibility entrypoints.
6. Keep QA scripts that verify current behavior; remove or merge only tests that assert the same behavior through the same path.

## Data Flow

```text
domain data file
  -> domain renderer/interaction script
  -> HTML mount points and modal views
  -> WordPress theme build copies the same source files
```

There is no second product, event, journal, or brand database inside page HTML. A price, image, title, or article-body edit therefore propagates to every consumer after refresh and rebuild.

## Failure Handling

- Missing optional records leave their module empty rather than breaking unrelated page behavior.
- Missing required identifiers are reported by verification scripts.
- Rendering escapes content before inserting it as HTML.
- Media paths are checked during verification so moved or renamed files cannot silently break pages.

## Verification

- Run all existing QA scripts plus focused content-architecture checks.
- Verify every data image path exists.
- Verify product prices and images are not duplicated in HTML or shopping-bag code.
- Verify latest-event and event-reader media resolve to the supplied Marca China image.
- Build and verify the WordPress theme.
- Serve the static site and inspect representative Chinese and English pages at desktop and mobile widths.
- Review the final diff for accidental edits to existing user work and for newly orphaned files.

## Non-Goals

- No visual redesign.
- No change to product, event, article, or brand wording beyond correcting duplicated sources and the requested event image.
- No framework migration, CMS migration, API, database, or new package dependency.
- No remote upload, branch push, or production deployment.
