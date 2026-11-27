# CAT Catalogue Writer — Operations Runbook & User Guide

This document has two parts:
- **[Part 1: Developer & Maintainer Operations Runbook](#part-1-developer--maintainer-operations-runbook)** — exact step-by-step procedures for adding/upgrading/hiding/removing schemas, managing ContextHub connections, adding translations, and deploying.
- **[Part 2: Catalogue Record Writer User Guide](#part-2-catalogue-record-writer-user-guide)** — how researchers and data stewards use the application standalone and inside ContextHub.

> For a full walkthrough of the codebase and internal architecture, see [`docs/DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md).

---

# Part 1: Developer & Maintainer Operations Runbook

## 1. Schema Management Overview (The 4-Point Sync Rule)

Before modifying any schema, understand the **four places** that work together whenever schemas change:

| # | Location | Role |
|---|---|---|
| 1 | `public/schemas/*.json` or `public/schemas/hidden/*.json` | Untouched OCA package JSON files served statically at `/schemas/...` and indexed at build time by `config-overrides.js` into `__SCHEMA_INDEX__`. |
| 2 | `KNOWN_SCHEMA_MANIFEST` in `src/utils/schemaRegistry.js` | Maps every schema package SAID (`d`) to `{ family, version, status: "active" \| "deprecated", isVersionOf? }`. Drives outdated-schema detection and upgrade targets. |
| 3 | `FALLBACK_SCHEMA_INDEX` in `src/utils/schemaRegistry.js` | Mirrors `public/schemas/` (`visible`) and `public/schemas/hidden/` (`hidden`) for Jest/non-webpack runs when `__SCHEMA_INDEX__` is not injected. |
| 4 | `SCHEMA_CONTEXT_MAP` in `src/utils/schemaMapping.js` | Maps the schema's canonical name (`meta[0].name`) to its JSON-LD `@context` URL or namespace object used during record export. |

> **Golden Rules**
> 1. **Never edit the internals of an OCA package JSON** to tweak UI labels/behavior — request a regenerated OCA package from the schema author instead, because modifying fields invalidates the cryptographic SAID (`d`).
> 2. **Always restart `npm start`** (or re-run `npm run build`) after adding, moving, renaming, or deleting any file in `public/schemas/` so `config-overrides.js` regenerates `__SCHEMA_INDEX__`.

### Current Active Schemas Inventory (Reference)

| Schema Family (`meta[0].name`) | File (`public/schemas/`) | Active SAID (`d`) |
|---|---|---|
| `Basic DMP` | `Basic_OCA_package.json` *(see note in Developer Guide §9)* | `EA5-t0oGau19k-wmR4-WsxD44ed6-WpUQUC26ztoTta3` *(v6 in `hidden/`: `EOuPm5G...`)* |
| `cataloguerecord_DCAT.top` | `cataloguerecord_DCAT.top_OCA_package.json` | `EFyyq7pbgewSwaeAZlBKl4Zk2nciNTfB2CpnEjphcnQ8` |
| `ContextHub_dataset_catalogue_record` | `ContextHub_dataset_catalogue_record_OCA_package.json` | `EMEb1rkdFU80zKjzCKVrRe8V69m8HTm1brZV7v8BbAJ5` |
| `ContextHub_project_catalogue_record` | `ContextHub_project_catalogue_record_OCA_package.json` | `EE4QpFQwDzOP1xjn9iffzZm5Wx1RlybSeU7RKIFsGkTs` |
| `ContextHub_questionnaire_catalogue_record` | `ContextHub_questionnaire_catalogue_record_OCA_package.json` | `ELj685L9fDdQUFJV-5EffI1sUMrYu2j1jKOhy8u3SXi8` |
| `ContextHub_sample_catalogue_record` | `ContextHub_sample_catalogue_record_OCA_package.json` | `EBnRcfUjeyJ_U8RHxfYuhlo7PokXxzpqsT5djkSHE_vh` |
| `ContextHub_schema_catalogue_record` | `ContextHub_schema_catalogue_record_OCA_package.json` | `EPfNmX2yI8Ctn_HxVzqTwZyzVkP_whK2kOtJPeYWD3pT` |
| `Dublin_Core_Project` | `Dublin_Core_Project_OCA_package.json` | `EJ4icsxrpbxRHy0Eo_zHMB9_kTkrZ4hmT7r4CKLtL41_` |
| `Dublin_Core_Repository` | `Dublin_Core_Repository_OCA_package.json` | `EDqM_wwgWgRrEd609T9X8wTasxpp1e_QJYmdBxFVRoii` |
| `OpenAIRE Application Profile Parent` | `OpenAIRE_OCA_package.json` | `ELFQbADu3w__7hDbaF6iY_1nOa68LgJWmqf3B_dTV0e5` |
| `Project description` | `Project_schema_v2.json` | `EEWsnDGmkD53-TbApvjmMW-gRurySkBaX_fPN_BrPGna` |
| `schema_catalogue_record` | `schema_catalogue_record_OCA_package.json` | `EAMDDRFBhdGg8OcfgzMFLFq5DT6LbroGkc-zM6iKnsuc` |

---

## 2. How to Add a Brand-New Schema

Use this procedure when introducing a completely new schema family (not replacing an older version).

### Step 1 — Inspect the OCA Package JSON
Before dropping the file in, extract its top-level SAID (`d`) and canonical name (`oca_bundle.bundle.overlays.meta[0].name`):

```bash
node -e "const d = require('./path/to/New_Schema_OCA_package.json'); console.log({ said: d.d, name: d?.oca_bundle?.bundle?.overlays?.meta?.[0]?.name, hasForm: Boolean(d?.extensions?.adc) });"
```

Verify:
- `said` is a real non-empty SAID (not a placeholder like `####...####`).
- `name` is non-empty and does **not** accidentally collide with an existing visible schema's `name` (if it does, follow [§3 Adding a New Version](#3-how-to-add-a-new-version-of-an-existing-schema) instead).

### Step 2 — Place the File in `public/schemas/`
Copy the untouched JSON file into `public/schemas/`, e.g.:
```text
public/schemas/ContextHub_workflow_catalogue_record_OCA_package.json
```

### Step 3 — Register Metadata in `src/utils/schemaRegistry.js`
1. Add an entry to `KNOWN_SCHEMA_MANIFEST`:
   ```js
   "<NEW_PACKAGE_SAID>": {
     family: "<EXACT_META_NAME>",
     version: "1.0.0", // Use "0.1.0" for initial draft plugins if desired
     status: "active",
   },
   ```
2. Add a matching entry to `FALLBACK_SCHEMA_INDEX.visible` (keep alphabetical by `name`):
   ```js
   {
     name: "<EXACT_META_NAME>",
     said: "<NEW_PACKAGE_SAID>",
     filePath: "./schemas/<FILENAME>.json",
   },
   ```

### Step 4 — Register the JSON-LD `@context` in `src/utils/schemaMapping.js`
Add `<EXACT_META_NAME>` to `SCHEMA_CONTEXT_MAP`:
```js
"<EXACT_META_NAME>": {
  "dcat": "http://www.w3.org/ns/dcat#",
  "dcterms": "http://purl.org/dc/terms/",
  "foaf": "http://xmlns.com/foaf/0.1/",
  "prov": "http://www.w3.org/ns/prov#",
  "adms": "http://www.w3.org/ns/adms#"
},
// Or a string URL, e.g. "http://purl.org/dc/terms/", or an array [url, { prefix: uri }]
```
*(Note: `ViewPage.jsx` automatically injects `dcat` if omitted, but defining the full namespace map explicitly is best practice.)*

### Step 5 — Restart, Test & Verify
1. Stop and restart `npm start` (required for `__SCHEMA_INDEX__`).
2. Open `http://localhost:3000`:
   - Confirm `<EXACT_META_NAME>` appears in the HomePage schema dropdown.
   - Click **Write a Record** and verify route `/form/<slugified-name>?schema=...` loads without errors.
   - Test Mandatory / Recommended / Complete filter pills, repeatable fields, nested child cards, and ORCID lookup (if the schema includes `prov.qualifiedAttribution`).
   - Fill required fields -> click **Review** -> click **Download (.json)** and verify the exported file contains the exact `@context`, `@schema_id: "<NEW_PACKAGE_SAID>"`, `@schema_version`, and a valid `d` SAID.
   - Upload the downloaded `.json` back on the HomePage and confirm schema auto-detection locks onto `<EXACT_META_NAME>` with **no** outdated warning.
3. Run `npm test -- --watchAll=false` and `npm run build`.

> **If this schema is for ContextHub:** Share the new `name`, URL slug (`slugify(name)`), and `said` with the ContextHub team so ContextHub registers the matching schema plugin SAID and launch URL.

---

## 3. How to Add a New Version of an Existing Schema

Use this procedure when updating an existing schema family (e.g., upgrading `ContextHub_schema_catalogue_record` from `v0.1.0` -> `v1.0.0`, or `v1.0.0` -> `v2.0.0`). **Always archive the old package to `public/schemas/hidden/`** so previously published records can still be viewed on their original schema and upgraded cleanly.

### Step 1 — Move the Old Schema JSON to `public/schemas/hidden/`
Move the outgoing file from `public/schemas/` into `public/schemas/hidden/`.
- If the new file has the **same filename** as the old one, consider adding a version suffix to the archived file (e.g., `hidden/Project_OCA_package.v1.json`) or keeping the filename inside `hidden/` if no older archive already uses that name.
- Check `git show 28789db` for a real production example of moving `ContextHub_schema_catalogue_record_OCA_package.json` to `public/schemas/hidden/` and placing the new bundle in `public/schemas/`.

### Step 2 — Place the New Schema JSON in `public/schemas/`
Copy the new untouched OCA package JSON into `public/schemas/`.

### Step 3 — Update `KNOWN_SCHEMA_MANIFEST` in `src/utils/schemaRegistry.js`
1. Mark the **old SAID** as `"deprecated"`:
   ```js
   "<OLD_SAID>": {
     family: "<FAMILY_NAME>",
     version: "1.0.0",
     status: "deprecated",
   },
   ```
2. Add the **new SAID** with the **exact same `family`**, bumped SemVer `version`, `isVersionOf: "<OLD_SAID>"`, and `status: "active"`:
   ```js
   "<NEW_SAID>": {
     family: "<FAMILY_NAME>",
     version: "2.0.0",
     isVersionOf: "<OLD_SAID>",
     status: "active",
   },
   ```
   > **Critical invariant:** Only **one** entry per `family` should have `status: "active"`. `getSchemaPluginOutdatedStatus()` and `getLatestSchemaForFamily()` look up the first entry in the family with `status: "active"`.

### Step 4 — Update `FALLBACK_SCHEMA_INDEX` in `src/utils/schemaRegistry.js`
1. Move the old entry from `FALLBACK_SCHEMA_INDEX.visible` into `FALLBACK_SCHEMA_INDEX.hidden` (updating `filePath` to `"./schemas/hidden/<OLD_FILENAME>.json"`).
2. Add the new entry in `FALLBACK_SCHEMA_INDEX.visible` pointing to `"./schemas/<NEW_FILENAME>.json"`.

### Step 5 — Check `SCHEMA_CONTEXT_MAP` in `src/utils/schemaMapping.js`
- If `meta[0].name` stayed identical, existing `@context` continues to work.
- If the schema's namespaces changed or `meta[0].name` changed, update `SCHEMA_CONTEXT_MAP` accordingly.

### Step 6 — Verify Both Fresh Creation and Upgrade Flows
1. Restart `npm start`.
2. **Test fresh creation:** Create and export a new record using the schema -> verify `@schema_id` is `<NEW_SAID>` and `@schema_version` is the new version.
3. **Test backward compatibility + upgrade:** Upload an **old** record JSON (containing `@schema_id: "<OLD_SAID>"`) on HomePage:
   - Confirm the amber **"Form Questionnaire Outdated"** alert appears showing `v<OLD>` -> `v<NEW>`.
   - Click **View Record** -> confirm the old record still renders accurately against its original archived schema.
   - Return to HomePage, re-upload the old record, and click **Upgrade to v&lt;NEW&gt;**:
     - Confirm the blue **"Upgrading Form Questionnaire"** banner appears on `FormPage`.
     - Verify matching fields pre-filled, missing required fields are listed as warning chips, and removed/renamed fields appear under the expandable unmapped-values reference panel.
     - Complete any required fields -> **Update & Review** -> confirm green **"Schema Plugin Upgraded"** banner on `ViewPage` and verify exported JSON has `@schema_id: "<NEW_SAID>"` and `dcterms.isVersionOf: "<OLD_RECORD_SAID>"`.
4. Run `npm test -- --watchAll=false` and `npm run build`.

---

## 4. How to Hide (Retire) vs. Permanently Remove a Schema

### Option A: Hide a Schema (Recommended When Existing Records Exist)
Hiding removes the schema from the HomePage creation dropdown so users can't create *new* records with it, while keeping it loadable by `@schema_id` so existing records can still be viewed or edited.

1. Move `public/schemas/<FILE>.json` -> `public/schemas/hidden/<FILE>.json`.
2. In `src/utils/schemaRegistry.js`:
   - Move the entry from `FALLBACK_SCHEMA_INDEX.visible` to `FALLBACK_SCHEMA_INDEX.hidden` (updating `filePath` to `"./schemas/hidden/<FILE>.json"`).
   - Keep its entry in `KNOWN_SCHEMA_MANIFEST` (set `status: "deprecated"` if a replacement exists in the same family, or keep as-is if standalone retired).
3. Keep its entry in `SCHEMA_CONTEXT_MAP` (`src/utils/schemaMapping.js`).
4. Restart `npm start`, run `npm test -- --watchAll=false`.

### Option B: Permanently Remove a Schema
> **Warning:** Permanently deleting a schema breaks viewing/editing any previously exported JSON record whose `@schema_id` points to that SAID. Only do this for unused/test schemas or after confirming zero records in ContextHub or storage depend on it.

1. Check whether any unit test loads the file directly:
   - Specifically, `src/pages/FormPage.prefill.test.jsx` reads `public/schemas/hidden/dataset_catalogue_record_OCA_package.json` from disk! Update tests if removing a schema referenced by tests.
2. Delete the `.json` file from `public/schemas/` (or `public/schemas/hidden/`).
3. Remove its entry from `KNOWN_SCHEMA_MANIFEST` in `src/utils/schemaRegistry.js`.
4. Remove its entry from `FALLBACK_SCHEMA_INDEX.visible` (or `.hidden`) in `src/utils/schemaRegistry.js`.
5. Remove its entry from `SCHEMA_CONTEXT_MAP` in `src/utils/schemaMapping.js` (only if no other version of that family remains).
6. Restart `npm start`, run `npm test -- --watchAll=false` and `npm run build`.

---

## 5. How to Remove Old / Deprecated Versions of a Schema

When retiring historical schema versions from `public/schemas/hidden/`:

1. Confirm no active or archived ContextHub records still reference `<OLD_SAID>` (otherwise ContextHub users won't be able to view old records on their original schema or auto-detect the schema family on manual upload).
2. Delete `public/schemas/hidden/<OLD_FILE>.json`.
3. Remove `<OLD_SAID>` from `FALLBACK_SCHEMA_INDEX.hidden` in `src/utils/schemaRegistry.js`.
4. Decide on `KNOWN_SCHEMA_MANIFEST` in `src/utils/schemaRegistry.js`:
   - **Full removal:** Delete the `"<OLD_SAID>"` entry, and if the active version has `isVersionOf: "<OLD_SAID>"`, remove or re-point `isVersionOf`.
   - **Upgrade-only stub (optional):** If you want old uploaded records to still be *recognized as outdated* and offer an upgrade into the latest version even after deleting the old `.json` file, keep `"<OLD_SAID>"` in `KNOWN_SCHEMA_MANIFEST` (with `status: "deprecated"`). Note: users will be able to **Upgrade**, but clicking **View Record** on the original schema will fail to fetch the deleted JSON.
5. Restart `npm start` and run `npm test -- --watchAll=false`.

---

## 6. How to Manage & Test the ContextHub Connection

### 6.1 Adding a New ContextHub Host Origin (Staging / New Domain)

You **must** update **both** files below and redeploy; updating only one will either block the iframe via CSP or silently drop `postMessage` events:

1. **`staticwebapp.config.json`** — add the origin to `frame-ancestors` in `Content-Security-Policy`:
   ```json
   "Content-Security-Policy": "default-src 'self'; ... frame-ancestors 'self' http://localhost:* https://*.semanticengine.org https://csdcc.datacontexthub.org https://contexthub-dev.climatesmartagrifood.ca https://new-contexthub.example.org"
   ```
2. **`src/utils/postMessageSecurity.js`** — add the origin to `EXACT_ALLOWED_ORIGINS` (or add a wildcard domain rule in `isAllowedOrigin()`):
   ```js
   const EXACT_ALLOWED_ORIGINS = new Set([
     "https://csdcc.datacontexthub.org",
     "https://contexthub-dev.climatesmartagrifood.ca",
     "https://new-contexthub.example.org",
   ]);
   ```
3. Add a unit test assertion in `src/utils/coreUtils.test.js` (`postMessageSecurity allowlists...`) and run `npm test -- --watchAll=false`.

### 6.2 How ContextHub Launches Catalogue Writer (URL Patterns)

Replace `<WRITER_BASE>` with the deployed Catalogue Writer origin (or `http://localhost:3000` locally):

- **Create new record (iframe):**
  ```text
  <WRITER_BASE>/form/contexthub-dataset-catalogue-record?schema=ContextHub_dataset_catalogue_record&iframe=true&mode=write&lang=en&userOrcid=0000-0002-1825-0097&userName=Jane%20Doe&orcidVerified=true
  ```
- **Edit existing record (iframe + `postMessage` prefill):**
  ```text
  <WRITER_BASE>/form/contexthub-dataset-catalogue-record?schema=ContextHub_dataset_catalogue_record&iframe=true&mode=edit&isPublished=true&version=1.0.0&lang=en
  ```
- **Upgrade outdated record to latest schema version (iframe):**
  ```text
  <WRITER_BASE>/form/contexthub-schema-catalogue-record?schema=ContextHub_schema_catalogue_record&iframe=true&mode=upgrade&sourceSchemaId=EKXaGk0pzYY8hMX0uAzyU3gOTPw1saFN-IPzgHWw7I1I&targetSchemaId=EPfNmX2yI8Ctn_HxVzqTwZyzVkP_whK2kOtJPeYWD3pT&isPublished=true&version=1.0.0
  ```
- **Standalone deep-link with HTTP GET/POST `dataUrl`:**
  ```text
  <WRITER_BASE>/?schema=ContextHub_dataset_catalogue_record&dataUrl=https%3A%2F%2Fcsdcc.datacontexthub.org%2Fapi%2Frecords%2F123
  ```

### 6.3 Host-Side (ContextHub) `postMessage` Reference Snippet

When ContextHub embeds Catalogue Writer in an `<iframe>`, ContextHub should implement a listener like:

```js
const WRITER_ORIGIN = "https://<catalogue-writer-host>";

window.addEventListener("message", (event) => {
  if (event.origin !== WRITER_ORIGIN) return;
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;

  const iframeWin = iframeRef.current?.contentWindow;
  if (!iframeWin) return;

  if (msg.type === "REQUEST_USER_CONTEXT") {
    iframeWin.postMessage(
      {
        type: "SET_USER_CONTEXT",
        user: { orcid: currentUser.orcid, name: currentUser.name, orcidVerified: currentUser.orcidVerified },
      },
      WRITER_ORIGIN
    );
  }

  if (msg.type === "REQUEST_RECORD") {
    if (mode === "write") {
      iframeWin.postMessage({ type: "CLEAR_RECORD" }, WRITER_ORIGIN);
    } else if (mode === "upgrade") {
      iframeWin.postMessage(
        {
          type: "UPGRADE_RECORD",
          record: existingRecordJson,
          sourceSchemaId: existingRecordJson["@schema_id"],
          targetSchemaId: latestSchemaSaid,
          isPublished: true,
          version: resourceVersion,
        },
        WRITER_ORIGIN
      );
    } else if (mode === "edit") {
      iframeWin.postMessage(
        { type: "SET_RECORD", record: existingRecordJson, isPublished: true, version: resourceVersion },
        WRITER_ORIGIN
      );
    }
  }

  if (msg.type === "CATALOGUE_RECORD") {
    // Save msg.record (already SAIDified JSON-LD).
    // Also inspect msg.isUpgrade, msg.sourceSchemaId, msg.targetSchemaId.
    saveCatalogueRecordToContextHub(msg.record, { isUpgrade: msg.isUpgrade });
  }
});

// Syncing live language changes from ContextHub to the iframe:
iframeRef.current?.contentWindow?.postMessage({ type: "SET_LANGUAGE", payload: "fr" }, WRITER_ORIGIN);
```

### 6.4 Troubleshooting ContextHub Integration Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| Browser shows blank iframe / *"refused to frame"* console error | Host origin missing from CSP `frame-ancestors` | Add origin to `staticwebapp.config.json` and redeploy |
| Prefill or user ORCID never arrives in iframe | Host origin rejected by `isAllowedOrigin()` OR host didn't reply to `REQUEST_RECORD` / `REQUEST_USER_CONTEXT` | Add origin to `src/utils/postMessageSecurity.js`; verify host sends `SET_RECORD`/`SET_USER_CONTEXT` on request |
| Previous record shows up when clicking "Create New" in ContextHub | Stale `sessionStorage` from prior iframe session | Have ContextHub send `{ type: "CLEAR_RECORD" }` before/on write mode open |
| Clicking **Update to ContextHub** downloads a `.json` file instead of syncing | `safePostMessage` had no verified `targetOrigin` (host never sent an allowlisted message and referrer was stripped) or popup `window.opener` was closed | Ensure ContextHub responds to `REQUEST_USER_CONTEXT` or `REQUEST_RECORD` from an allowlisted origin |
| **Update & Review** or **Update to ContextHub** button stays disabled in edit mode | Record is unchanged (`selectHasFormChanges === false`) | Expected safeguard! User must modify at least one form field (or add Revision Notes on `ViewPage`) |

---

## 7. Adding or Updating UI Translations (EN / FR)

1. Edit **both** `src/utils/OpenAIRE/translations/eng.json` and `src/utils/OpenAIRE/translations/fra.json`, keeping the exact same nested dot-key paths (e.g., `formpage.my_new_label`).
2. Consume in components via `const { t } = useTranslation();` -> `t("formpage.my_new_label")`.
   - Missing French keys automatically fall back to English (`eng.json`), then to the raw key string.
   - Dynamic placeholders use `.replace("{{count}}", String(n))`.
3. For schema field labels, entry options, descriptions, and page headings, translations come from the OCA package's own `language: "fra"` overlays (not `eng.json`/`fra.json`).

---

## 8. Building, Testing & Deploying

```bash
# Run full Jest suite
npm test -- --watchAll=false

# Verify production bundle compiles cleanly with zero errors
npm run build
```

**Deployment workflow:**
1. Create a feature branch from `develop` (or `main`), commit changes, and open a PR into `develop`.
2. When ready to release, open a PR from `develop` -> `main`.
   - Opening the PR automatically runs `.github/workflows/azure-static-web-apps-zealous-mud-0d3297f0f.yml` and deploys a temporary **Azure Static Web Apps staging preview URL**.
3. Merge the PR into `main` to deploy to production.

---

# Part 2: Catalogue Record Writer User Guide

This section explains how to use **CAT Catalogue Writer** as an end user — both directly on the web (standalone) and embedded inside **ContextHub**.

## 1. Creating a New Catalogue Record (Standalone)

1. Open the Catalogue Writer Home Page.
2. *(Optional)* Switch the interface language between **EN** (English) and **FR** (Français) using the language dropdown in the top-right header.
3. Under **Quick Links**, open the **Select a Schema to Proceed** dropdown and pick the metadata schema for your work (for example, `Dublin_Core_Project`, `OpenAIRE Application Profile Parent`, or `ContextHub_dataset_catalogue_record`).
4. Click **Write a Record** to open the form.

### Navigating the Form
- **Left Navigation Sidebar:**
  - Shows all form sections (pages). On smaller screens (or if collapsed), click the **Sections** button at the top of the form to open the drawer.
  - **View Filter Pills** (when a schema defines multiple levels):
    - **Mandatory** — shows only required fields (marked with a red `*`).
    - **Recommended** — shows mandatory + recommended fields.
    - **Complete** — shows every field in the schema (mandatory, recommended, and optional).
  - **Progress Indicators:** A green checkmark indicates all required fields in that section are complete; an amber warning icon with a number shows how many fields in that section still need attention.
- **Section Navigation:** Use the **Back** and **Next** buttons at the bottom of each page, or jump directly to any section from the sidebar. (Schemas without defined pages display 6 fields per page with numbered pagination.)

### Filling Out Different Field Types
- **Text & Long Text:** Type directly into the box. If a field has a character limit defined by the schema, a live counter (e.g., `42 / 250`) appears underneath. Click **Show more / Show less** on long field descriptions to expand guidance.
- **Single-Select Dropdowns:** Pick one value from the controlled vocabulary. Optional dropdowns include a *None* option to clear your selection.
- **Multi-Select Lists:**
  - Short lists (15 or fewer options) display as **checkboxes** — check all that apply.
  - Long lists (more than 15 options, such as geographic locations or large vocabularies) display as a **searchable multi-select dropdown** ("Select All That Apply") — type either the name or code to filter, click to select, and click the `×` on a chip to remove it.
- **Yes/No (Boolean) Fields:** Choose a radio option; click **Clear Response** to unset your answer.
- **Dates & Years:** Pick a date from the calendar or type `YYYY/MM/DD` (year-only fields accept `YYYY`).
- **Repeatable Simple Values (e.g., keywords, tags):** Click **+ Add &lt;Field&gt;** to add another row, or click the red trash icon to remove a row. Note: the Add button stays disabled while an existing row is blank.
- **Repeatable Complex Items (e.g., Contributors / Qualified Attribution, Related Identifiers):**
  1. Click **+ Add &lt;Item&gt;** to open a dedicated sub-form for that item.
  2. Fill in the item's fields and click **Save** (enabled once all required sub-fields are valid and no duplicate contributor ORCID exists).
  3. Saved items appear as summary cards with **Edit** and **Delete** buttons.
  4. Clicking **Cancel** (or navigating away via the sidebar) prompts before discarding unsaved edits to that item.

### Resolving Validation Issues
On the final page, if **Review** (or **Update & Review**) is disabled:
- An info box right above the button lists every missing required or invalid-format field as clickable chips (e.g., `Title (Describe Your Dataset · required)`).
- Click any chip to jump directly to the section containing that field.

---

## 2. Finding & Adding Contributors via ORCID

Whenever a form includes a contributor ORCID field (such as inside **Qualified Attribution**), Catalogue Writer gives you three fast ways to fill both the **ORCID iD** and the **Contributor Name** accurately:

1. **Search ORCID Registry (Recommended for any contributor):**
   - Click **Search ORCID Registry** below the ORCID input.
   - Enter a researcher's name (and optionally an institution/affiliation, e.g., `University of Guelph`) or paste an ORCID iD/URL, then click **Search**.
   - Review matching results (ORCID iD link, First/Last Name, Other Names, and Affiliations).
   - Click **Select** on the right person — both their ORCID iD and display name automatically populate the form!
2. **Fetch Name from ORCID (If you already typed or pasted an ORCID iD):**
   - Enter a valid 16-digit ORCID (e.g., `0000-0002-1825-0097` or `https://orcid.org/0000-0002-1825-0097`) and click **Fetch Name from ORCID** to populate the sibling name field automatically from the ORCID Public API.
3. **Add My Verified ORCID (When launched from ContextHub):**
   - If your ContextHub account has a verified ORCID, a green **ContextHub Verified ORCID Available** banner appears automatically.
   - Click **Add My Verified ORCID** to fill your ORCID and name in one click.

> **Duplicate Protection:** You cannot add the same contributor ORCID twice to the same record. Duplicate entries are flagged in the search modal ("Already Added"), on the input field, and on summary cards, and **Save** is disabled until resolved.

---

## 3. Reviewing, Versioning & Exporting a Record

Once all required fields are valid, click **Review** (or **Update & Review** when editing) to open the **View / Review Catalogue Record** page:

1. **Inspect Your Metadata:** All sections are shown together in a clean read-only summary. Click **Edit** at the bottom if you need to go back and change anything.
2. **Check Version & Lineage Panel:**
   - Displays the **Resource Version** (catalogue records inherit the version of the resource they describe) and, for published revisions, a **Revises** chip showing the previous record's SAID.
   - Editing a published record always creates a **new immutable revision** with a brand-new SAID linked back to the previous record via `dcterms:isVersionOf` — the original record is never overwritten.
3. **Add Optional Revision Notes:** Summarize what changed (e.g., `"Added co-author ORCID and updated description"`) in **Revision Notes (optional)**; this is stored in `dcterms["adms:versionNotes"]`.
4. **Download (.json):** Click **Download (.json)** to save your standards-compliant JSON-LD file named `catalogue-<SAID>.json`.

---

## 4. Viewing, Editing & Upgrading an Existing `.json` Record

1. On the Home Page, **drag and drop** a previously exported `.json` catalogue record onto the upload box (or click it to browse; max file size **10 MB**).
2. Catalogue Writer reads `@schema_id` and automatically detects and locks the matching schema. *(If the file has no `@schema_id`, select the schema manually from the dropdown.)*
3. Choose what to do:
   - **View Record:** Opens the read-only summary page immediately.
   - **Edit Record:** Opens the pre-filled form. Modify at least one field to enable **Update & Review** (to avoid generating duplicate empty revisions).
   - **Clear Upload & Start Over:** Resets the upload so you can choose a different file or start fresh.

### Upgrading an Outdated Record to a Newer Schema Version
If the uploaded record was created with an older version of a schema, an amber **Form Questionnaire Outdated** banner appears on the Home Page showing the old and new versions:
- You can still click **View Record** to inspect it on its original schema, **or**
- Click **Upgrade to v&lt;Latest&gt;**:
  1. Catalogue Writer loads the latest schema and automatically pre-fills every matching field.
  2. A blue **Upgrading Form Questionnaire** banner at the top of the form reports:
     - How many field values were mapped automatically.
     - **Required fields needing manual input** (shown as amber chips) — fill these before reviewing.
     - **Unmapped values from the previous version** (click to expand) — any legacy fields that were renamed or removed in the new schema are shown here so you can copy any information you still need into the new fields without polluting the upgraded JSON.
  3. Click **Update & Review**, add optional revision notes, and download or send to ContextHub.

---

## 5. Using Catalogue Writer Inside ContextHub

When you open Catalogue Writer from **ContextHub** (inside an embedded modal/panel or a linked browser tab):
- Logos, the footer, and the standalone Home button are hidden to keep the workspace focused.
- Your ContextHub language selection (English/French) and verified ORCID are passed in automatically.
- Existing records open pre-filled in **Edit** or **Upgrade** mode.
- After clicking **Review** / **Update & Review**, click **UPDATE TO CONTEXTHUB** (or the custom submit button shown at the bottom of the Review page) to send the finalized record directly back into ContextHub.
  - *Note:* If editing an already-published record, you must change at least one field or enter Revision Notes before **UPDATE TO CONTEXTHUB** becomes enabled.
  - *Fallback protection:* If your browser or network blocks direct communication with the ContextHub tab, Catalogue Writer alerts you and automatically downloads `catalogue-<SAID>.json` so you can upload it manually without losing any work.
