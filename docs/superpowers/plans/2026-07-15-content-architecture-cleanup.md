# LuxurEat Content Architecture Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make products, events, journal entries, and shared brand content independently maintainable from one source per domain, remove confirmed obsolete code, and replace the latest-event image with the supplied Marca China artwork.

**Architecture:** Keep the current static HTML/CSS/JavaScript site and WordPress packaging pipeline. Domain data remains browser-native JavaScript, domain interactions move out of the monolithic `main.js`, and media is physically organized by owning domain; page HTML keeps semantic layout and mount points only.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node.js standard library, Playwright QA scripts, classic WordPress theme build script.

## Global Constraints

- Preserve all current uncommitted user changes.
- Do not upload or push to `backup` or `main`.
- Preserve current Chinese and English page behavior and WordPress theme output.
- Add no framework, runtime package, or image dependency.
- Keep existing `window.LUXUREAT_*_DATA` browser interfaces where practical.
- Do not edit `.deploy/`, generated ZIP files, or QA screenshots directly.
- Keep the current visual design, typography, and interactions.

## Target File Map

```text
assets/data/products.js       product records, price, copy, media references
assets/data/events.js         event records, article copy, event media references
assets/data/journal.js        journal records and related-article links
assets/data/brand.js          repeated contact and brand facts
assets/js/core.js             global navigation and page utilities
assets/js/products.js         catalog, product modal, bag, recommendations
assets/js/events.js           latest/recent events and event reader
assets/js/journal.js          article reader and journal archive
assets/js/brand.js            shared brand-field binding
assets/media/products/*       product and gallery media
assets/media/events/*         event media
assets/media/journal/*        article and journal-card media
assets/media/brand/*          logo, QR code, and shared brand/editorial media
```

---

### Task 1: Establish Content-Architecture Regression Checks

**Files:**
- Create: `qa/verify_content_architecture.cjs`
- Modify: `qa/verify_events.cjs`
- Modify: `qa/verify_event_reader.cjs`

**Interfaces:**
- Consumes: current source tree and `window.LUXUREAT_*_DATA` globals.
- Produces: one runnable check that fails on duplicate source ownership, missing media, or old paths.

- [ ] **Step 1: Add a failing architecture verification script**

Create `qa/verify_content_architecture.cjs` using only Node.js standard modules:

```js
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const load = (file, key) => {
  const context = {
    window: {},
    URL,
    location: { href: "https://example.test/" },
    document: { currentScript: { src: `https://example.test/${file}` } },
  };
  vm.runInNewContext(read(file), context, { filename: file });
  return context.window[key];
};
const localMedia = (value) => String(value || "")
  .replace(/^https:\/\/example\.test\//, "")
  .replace(/^\.\.\//, "");

for (const file of [
  "assets/data/products.js",
  "assets/data/events.js",
  "assets/data/journal.js",
  "assets/data/brand.js",
  "assets/js/core.js",
  "assets/js/products.js",
  "assets/js/events.js",
  "assets/js/journal.js",
  "assets/js/brand.js",
]) assert(fs.existsSync(path.join(root, file)), `missing ${file}`);

const products = load("assets/data/products.js", "LUXUREAT_PRODUCT_DATA");
const events = load("assets/data/events.js", "LUXUREAT_EVENT_DATA");
const journal = load("assets/data/journal.js", "LUXUREAT_ARTICLE_DATA");

const media = [
  ...Object.values(products.images || {}),
  ...Object.values(products.galleries || {}).flat(),
  ...(events.events || []).flatMap((event) => [event.image, event.poster]),
  ...Object.values(journal.images || {}),
];
for (const value of new Set(media)) {
  const file = localMedia(value);
  assert(file.startsWith("assets/media/"), `legacy media path: ${value}`);
  assert(fs.existsSync(path.join(root, file)), `missing media: ${file}`);
}

const sourceFiles = [
  ...fs.readdirSync(path.join(root, "zh")).filter((name) => name.endsWith(".html")).map((name) => `zh/${name}`),
  ...fs.readdirSync(path.join(root, "en")).filter((name) => name.endsWith(".html")).map((name) => `en/${name}`),
];
const html = sourceFiles.map(read).join("\n");
assert(!html.includes("assets/images/"), "HTML still references assets/images");
assert(!html.includes("assets/article-images/"), "HTML still references assets/article-images");
assert(!html.includes("latest-event.js"), "HTML still loads the obsolete latest-event.js");
assert(!fs.existsSync(path.join(root, "main.js")), "legacy main.js still exists");
assert(!fs.existsSync(path.join(root, "latest-event.js")), "legacy latest-event.js still exists");

const event = events.events.find((item) => item.id === "marca-china-2026");
assert(event?.image?.endsWith("/marca-china-2026.png"), "latest event does not use supplied PNG");
assert(event.image === event.poster, "latest event card and reader do not share one image");

console.log("content architecture verification passed");
```

- [ ] **Step 2: Update event assertions to the new canonical path**

In `qa/verify_events.cjs` and `qa/verify_event_reader.cjs`, replace assertions for `assets/images/marca-china-2026.jpeg` with:

```js
assert(event.image === "../assets/media/events/marca-china-2026.png", "event image must use the supplied event artwork");
```

and:

```js
assert(result.image?.includes("assets/media/events/marca-china-2026.png"), `${lang} event image is not shared`);
```

- [ ] **Step 3: Run the checks and confirm they fail for the expected legacy paths**

Run:

```bash
node qa/verify_content_architecture.cjs
node qa/verify_events.cjs
```

Expected: both fail because domain scripts/media do not yet exist and the event still uses the JPEG path.

---

### Task 2: Move Media Into Domain-Owned Directories

**Files:**
- Create: `assets/media/products/*`
- Create: `assets/media/events/marca-china-2026.png`
- Create: `assets/media/journal/*`
- Create: `assets/media/brand/*`
- Modify: `assets/data/products.js`
- Modify: `assets/data/events.js`
- Rename: `assets/data/articles.js` to `assets/data/journal.js`
- Delete after reference audit: `assets/images/*`, `assets/article-images/*`, `assets/images/marca-china-2026.jpeg`

**Interfaces:**
- Consumes: current image files and supplied `/var/folders/16/dcpchxyd7w17hb4j4dwk7q9c0000gn/T/codex-clipboard-03987bc2-3f2b-426c-9de0-e610c89fb338.png`.
- Produces: descriptive stable media paths referenced by all domain data and HTML.

- [ ] **Step 1: Create domain media directories and copy the supplied event image**

Run:

```bash
mkdir -p assets/media/products assets/media/events assets/media/journal assets/media/brand
cp /var/folders/16/dcpchxyd7w17hb4j4dwk7q9c0000gn/T/codex-clipboard-03987bc2-3f2b-426c-9de0-e610c89fb338.png assets/media/events/marca-china-2026.png
```

- [ ] **Step 2: Move active product media with descriptive names**

Move current product and gallery files into `assets/media/products/` and update `assets/data/products.js` so the media map has explicit names:

```js
const images = {
  beluga: asset("media/products/imperial-beluga.jpg"),
  oscetra: asset("media/products/royal-oscetra.jpg"),
  spoon: asset("media/products/mother-of-pearl-spoons.jpg"),
  champagne: asset("media/products/vintage-champagne.jpg"),
  ice: asset("media/products/silver-ice-server.jpg"),
  truffle: asset("media/products/truffle-pairing.jpg"),
};
```

Use descriptive gallery names such as `imperial-beluga-detail.jpg`, `imperial-beluga-service.jpg`, and `imperial-beluga-table.jpg`; do not retain `lux-NNN.jpg` names inside the new directories.

- [ ] **Step 3: Rename article data and move journal-owned media**

Rename `assets/data/articles.js` to `assets/data/journal.js`. Change its base helper to:

```js
const journalImage = (file) => asset(`media/journal/${file}`);
```

Move all currently referenced `assets/article-images/*` and journal-card images into `assets/media/journal/` using their existing descriptive article names. For reused imagery, keep one physical file under its primary owner and point other domain data to that canonical path instead of duplicating bytes.

- [ ] **Step 4: Move remaining active shared imagery to brand media**

Move logos, QR code, contact, gifting, certification, home-editorial, and other shared page imagery into `assets/media/brand/` with descriptive names. Update all `zh/*.html`, `en/*.html`, `integration.css`, and data-file references.

- [ ] **Step 5: Remove only media with zero remaining references**

Run this audit after references have been updated:

```bash
for file in assets/images/* assets/article-images/*; do
  name=$(basename "$file")
  rg -q --fixed-strings "$name" --glob '!assets/images/**' --glob '!assets/article-images/**' . || rm "$file"
done
rmdir assets/images assets/article-images 2>/dev/null || true
```

Expected: old directories are empty and removed. If a referenced file remains, move it to its owning domain and update the reference before rerunning.

- [ ] **Step 6: Run the media portion of the architecture check**

Run:

```bash
node qa/verify_content_architecture.cjs
```

Expected: it still fails on legacy scripts, but no longer reports old or missing media paths.

---

### Task 3: Split Global and Product Behavior From `main.js`

**Files:**
- Create: `assets/js/core.js`
- Create: `assets/js/products.js`
- Modify later: all page script includes
- Delete later: `main.js`

**Interfaces:**
- Consumes: `window.LUXUREAT_PRODUCT_DATA` from `assets/data/products.js`.
- Produces: the same DOM attributes, local-storage cart format, modal hashes, and global interactions currently provided by `main.js`.

- [ ] **Step 1: Move site-wide behavior unchanged into `core.js`**

Move these existing blocks without changing behavior:

```text
navigation menu setup
internal-link prefetch IIFE
scroll restoration IIFE
back-to-top IIFE
initLuxInfoPopovers
initLuxGiftScroller
initLuxFooterActions
photo-stack pointer/keyboard controls
```

End `core.js` with direct initializers guarded by their existing element checks:

```js
initLuxInfoPopovers();
initLuxGiftScroller();
initLuxFooterActions();
```

- [ ] **Step 2: Move all product and bag behavior into `products.js`**

Move these existing functions and related helpers together:

```text
renderLuxProductCatalog
syncLuxProductBindings
initLuxCaviarControls
initLuxProductDetails
all data-bag-* delegated handlers
bag rendering and recommendation rendering
cart storage helpers
```

Initialize catalog controls only after rendering:

```js
renderLuxProductCatalog();
syncLuxProductBindings();
initLuxCaviarControls();
initLuxProductDetails();
```

The cart continues storing only product ID and quantity. Every rendered title, price, currency, and image must be looked up from `window.LUXUREAT_PRODUCT_DATA.products`.

- [ ] **Step 3: Run product and bag checks before deleting `main.js`**

Temporarily load `core.js` and `products.js` after `main.js` is removed from one local test page, then run:

```bash
node tools/verify-cart.mjs
node qa/verify_bag_recommendations.cjs
```

Expected: both exit successfully with no duplicated event listeners or product values.

---

### Task 4: Separate Event and Journal Readers

**Files:**
- Create: `assets/js/events.js`
- Create: `assets/js/journal.js`
- Delete: `latest-event.js`
- Modify: `assets/data/journal.js`

**Interfaces:**
- Consumes: `window.LUXUREAT_EVENT_DATA` and `window.LUXUREAT_ARTICLE_DATA`.
- Produces: latest-event rendering, recent-event rendering, event hash opening, journal article modal, and journal archive.

- [ ] **Step 1: Put latest and recent event rendering in `events.js`**

Move the current `latest-event.js` renderer plus `renderRecentEvents` and `renderEvent` from `initLuxReader` into `assets/js/events.js`. Keep the existing delegated trigger contract:

```js
document.addEventListener("click", (clickEvent) => {
  const trigger = clickEvent.target.closest("[data-event-open]");
  if (!trigger) return;
  clickEvent.preventDefault();
  openLuxEvent(trigger.dataset.eventOpen);
});
```

Expose only the event opener needed for hash startup:

```js
window.LUXUREAT_EVENTS = { open: openLuxEvent };
```

- [ ] **Step 2: Put article and archive rendering in `journal.js`**

Move the remaining article-only parts of `initLuxReader` into `assets/js/journal.js`, including:

```text
article labels and archive groups
reader shell creation
renderArticle
renderArchive
related-article navigation
reader back/close behavior
data-reader-open and data-reader-archive delegation
```

Preserve `window.LUXUREAT_ARTICLE_DATA` to avoid rewriting the data object. The event script may reuse the existing `.lux-reader` shell through this minimal interface:

```js
window.LUXUREAT_READER = {
  show(html, options = {}) { /* existing reader shell and header behavior */ },
  close() { /* existing close behavior */ },
};
```

Place this small shell API in `journal.js`; `events.js` must gracefully return when the reader API is unavailable.

- [ ] **Step 3: Delete superseded script files**

After all pages use the domain scripts, remove:

```bash
rm main.js latest-event.js
```

- [ ] **Step 4: Run event and reader checks**

Run:

```bash
node qa/verify_events.cjs
node qa/verify_reader_modal.cjs
node qa/verify_event_reader.cjs
```

Expected: all exit successfully and both languages open the correct article/event without horizontal overflow.

---

### Task 5: Centralize Repeated Brand Data Without Turning Pages Into Templates

**Files:**
- Create: `assets/data/brand.js`
- Create: `assets/js/brand.js`
- Modify: `zh/contact.html`
- Modify: `en/contact.html`
- Modify: `zh/gifting.html`
- Modify: `en/gifting.html`

**Interfaces:**
- Consumes: repeated phone, email, office, and reusable brand labels.
- Produces: `window.LUXUREAT_BRAND_DATA` and `[data-brand-field]` binding.

- [ ] **Step 1: Add the shared brand record**

Create `assets/data/brand.js`:

```js
(() => {
  window.LUXUREAT_BRAND_DATA = {
    zh: {
      phone: "+86 15721452475",
      email: "china@luxureat.com",
      chinaOffice: "上海 · LuxurEat China Ltd",
    },
    en: {
      phone: "+86 15721452475",
      email: "china@luxureat.com",
      chinaOffice: "Shanghai · LuxurEat China Ltd",
    },
  };
})();
```

- [ ] **Step 2: Add minimal declarative binding**

Create `assets/js/brand.js`:

```js
(() => {
  const lang = document.documentElement.lang?.startsWith("zh") ? "zh" : "en";
  const data = window.LUXUREAT_BRAND_DATA?.[lang];
  if (!data) return;
  document.querySelectorAll("[data-brand-field]").forEach((node) => {
    const value = data[node.dataset.brandField];
    if (value != null) node.textContent = value;
  });
})();
```

- [ ] **Step 3: Replace repeated contact text with binding points**

For repeated contact fields, keep readable fallback text in HTML and add an attribute:

```html
<a href="tel:+8615721452475" data-brand-field="phone">+86 15721452475</a>
<a href="mailto:china@luxureat.com" data-brand-field="email">china@luxureat.com</a>
```

Do not move one-off editorial paragraphs into `brand.js`; they remain in their owning page.

- [ ] **Step 4: Verify fallback and hydrated values**

Run a local page once with JavaScript disabled and once enabled. Expected: contact text is readable in both cases and identical when hydrated.

---

### Task 6: Update Page Includes and WordPress Theme Packaging

**Files:**
- Modify: `zh/*.html`
- Modify: `en/*.html`
- Modify: `scripts/build-luxureat-theme.mjs`
- Modify: `tools/verify-theme.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: domain data and scripts.
- Produces: correct dependency order in static pages and generated WordPress theme.

- [ ] **Step 1: Replace legacy script tags in every page**

Use this dependency order, loading only domain files used by each page:

```html
<script src="../assets/data/brand.js"></script>
<script src="../assets/data/products.js"></script>
<script src="../assets/data/events.js"></script>
<script src="../assets/data/journal.js"></script>
<script src="../assets/js/core.js"></script>
<script src="../assets/js/brand.js"></script>
<script src="../assets/js/products.js"></script>
<script src="../assets/js/journal.js"></script>
<script src="../assets/js/events.js"></script>
```

For example, a contact page loads brand data, `core.js`, and `brand.js`; a bag page additionally loads product data and `products.js`; a journal page loads journal/event data plus both reader scripts.

- [ ] **Step 2: Update the theme builder's source checks and include stripping**

Replace the hard-coded legacy script list with the new domain files:

```js
const dataFiles = ["brand.js", "products.js", "events.js", "journal.js"];
const scriptFiles = ["core.js", "brand.js", "products.js", "journal.js", "events.js"];
```

Have `ensureSource()` verify every file, have `stripKnownLocalIncludes()` remove each static include, and let `copyDir(source/assets, theme/assets)` package both `assets/data`, `assets/js`, and `assets/media`. Remove copies of root `main.js` and `latest-event.js`.

- [ ] **Step 3: Enqueue scripts in dependency order in generated `functions.php`**

Generate WordPress enqueues in this order:

```php
wp_enqueue_script('luxureat-brand-data', $theme_uri . '/assets/data/brand.js', array(), filemtime($theme_dir . '/assets/data/brand.js'), true);
wp_enqueue_script('luxureat-product-data', $theme_uri . '/assets/data/products.js', array(), filemtime($theme_dir . '/assets/data/products.js'), true);
wp_enqueue_script('luxureat-event-data', $theme_uri . '/assets/data/events.js', array(), filemtime($theme_dir . '/assets/data/events.js'), true);
wp_enqueue_script('luxureat-journal-data', $theme_uri . '/assets/data/journal.js', array(), filemtime($theme_dir . '/assets/data/journal.js'), true);
wp_enqueue_script('luxureat-core', $theme_uri . '/assets/js/core.js', array(), filemtime($theme_dir . '/assets/js/core.js'), true);
wp_enqueue_script('luxureat-brand', $theme_uri . '/assets/js/brand.js', array('luxureat-brand-data'), filemtime($theme_dir . '/assets/js/brand.js'), true);
wp_enqueue_script('luxureat-products', $theme_uri . '/assets/js/products.js', array('luxureat-product-data'), filemtime($theme_dir . '/assets/js/products.js'), true);
wp_enqueue_script('luxureat-journal', $theme_uri . '/assets/js/journal.js', array('luxureat-journal-data'), filemtime($theme_dir . '/assets/js/journal.js'), true);
wp_enqueue_script('luxureat-events', $theme_uri . '/assets/js/events.js', array('luxureat-event-data', 'luxureat-journal'), filemtime($theme_dir . '/assets/js/events.js'), true);
```

- [ ] **Step 4: Update theme verification and documentation**

Change `tools/verify-theme.mjs` to assert new data/script/media files exist and old root scripts do not. Update `README.md` and generated theme README wording to describe `assets/data`, `assets/js`, and `assets/media`.

- [ ] **Step 5: Build and verify the WordPress theme**

Run:

```bash
node scripts/build-luxureat-theme.mjs "$PWD" "$PWD/.deploy"
node tools/verify-theme.mjs "$PWD/.deploy"
```

Expected: both commands exit 0; the generated theme contains the domain files and supplied event PNG.

---

### Task 7: Remove Confirmed Dead and Duplicate CSS/JavaScript

**Files:**
- Modify: `integration.css`
- Modify as evidence requires: `assets/js/*.js`, `qa/*.cjs`, `tools/*.mjs`
- Delete only when confirmed unused: obsolete source assets and duplicate QA scripts

**Interfaces:**
- Consumes: final HTML, domain scripts, data-rendered class names, and QA checks.
- Produces: smaller source files with no known orphaned LuxurEat selectors or superseded render paths.

- [ ] **Step 1: Generate a conservative selector candidate list**

Run:

```bash
rg -o '\.lux-[A-Za-z0-9_-]+' integration.css | sort -u > /tmp/lux-css-selectors.txt
rg -o 'lux-[A-Za-z0-9_-]+' zh en assets/js assets/data | sed 's/^/./' | sort -u > /tmp/lux-source-classes.txt
comm -23 /tmp/lux-css-selectors.txt /tmp/lux-source-classes.txt > /tmp/lux-unused-candidates.txt
```

Review every candidate manually because class names may be assembled dynamically or represent state added by JavaScript.

- [ ] **Step 2: Delete only corroborated unused selector blocks**

For each candidate, require both checks to return no consumer before deletion:

```bash
rg -n --fixed-strings 'candidate-class' zh en assets/js assets/data qa tools scripts
git log -S'candidate-class' --oneline --all
```

Keep selectors for `.open`, `.visible`, `.is-list`, `.is-active`, `.is-at-top`, and other runtime state classes when their parent component is active.

- [ ] **Step 3: Remove duplicated helper implementations only when one shared call path exists**

Use `rg` to find repeated money formatting, HTML escaping, reader shell creation, and cart lookup. Keep domain-local one-liners; move only behavior shared by two or more domain scripts into a small `window.LUXUREAT_CORE` object.

- [ ] **Step 4: Check source syntax and whitespace**

Run:

```bash
node --check assets/js/core.js
node --check assets/js/products.js
node --check assets/js/events.js
node --check assets/js/journal.js
node --check assets/js/brand.js
git diff --check
```

Expected: every command exits 0.

---

### Task 8: Full Functional and Visual Verification

**Files:**
- Modify only if a verification exposes a regression.

**Interfaces:**
- Consumes: final source tree and local HTTP server.
- Produces: evidence that content synchronization, interactions, and theme packaging still work.

- [ ] **Step 1: Run all non-visual verification scripts**

Run:

```bash
node qa/verify_content_architecture.cjs
node qa/verify_events.cjs
node qa/verify_latest_event.cjs
node qa/verify_reader_modal.cjs
node qa/verify_home_editorial.cjs
node tools/verify-cart.mjs
node qa/verify_bag_recommendations.cjs
node scripts/build-luxureat-theme.mjs "$PWD" "$PWD/.deploy"
node tools/verify-theme.mjs "$PWD/.deploy"
```

Expected: all commands exit 0.

- [ ] **Step 2: Start the local preview server**

Run:

```bash
python3 -m http.server 8770
```

Expected: server remains available at `http://127.0.0.1:8770/`.

- [ ] **Step 3: Run Playwright interaction checks**

In another terminal, run:

```bash
node qa/verify_event_reader.cjs
node qa/verify_visual.cjs
```

Expected: both exit 0. Confirm the latest event card and reader show `marca-china-2026.png` at desktop and mobile widths.

- [ ] **Step 4: Verify representative user flows manually**

Inspect:

```text
/zh/index.html
/en/index.html
/zh/caviar.html
/en/products.html
/zh/bag.html
/en/bag.html
/zh/journal.html#event-marca-china-2026
/en/journal.html#event-marca-china-2026
```

Check menu behavior, product grid/list controls, product details, bag recommendations, journal archive, event reader, latest-event image, keyboard close behavior, and mobile overflow.

- [ ] **Step 5: Review the final source diff and orphan report**

Run:

```bash
git status --short
git diff --stat
git diff --check
find assets/media -type f | sort
rg -n 'assets/(images|article-images)|main\.js|latest-event\.js' --glob '!.deploy/**' .
```

Expected: no legacy source references; only intentional user changes and this refactor appear in the diff.

- [ ] **Step 6: Create one local implementation commit only after verification**

Because the working tree already contained overlapping uncommitted page work before this plan, create one reviewed commit after all checks rather than partially committing mixed files:

```bash
git add -A assets zh en integration.css scripts tools qa README.md main.js latest-event.js
git commit -m "refactor: organize site content by domain"
```

Do not push the commit.
