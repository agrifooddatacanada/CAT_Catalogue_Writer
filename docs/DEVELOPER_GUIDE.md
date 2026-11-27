# CAT Catalogue Writer — Developer Onboarding & Architecture Guide

Welcome to **CAT Catalogue Writer** (`agrifooddatacanada/CAT_Catalogue_Writer`). This guide is written for a developer joining the repository with zero prior context. By the end of it, you will understand what the application does, how every layer of the codebase works, how OCA schemas drive the UI dynamically, and how the application integrates with **ContextHub**.

> **Companion documents**
> - **Operational Runbook & End-User Guide:** [`docs/OPERATIONS_AND_USER_GUIDE.md`](./OPERATIONS_AND_USER_GUIDE.md) — step-by-step instructions for adding/updating/removing schemas, managing ContextHub connections, and using the app.
> - **AI Assistant Context File:** [`AGENTS.md`](../AGENTS.md) — compact, token-efficient architecture and invariant reference for any AI coding tool.

---

## Table of Contents

1. [What This Application Does & Ecosystem Context](#1-what-this-application-does--ecosystem-context)
2. [Tech Stack, Prerequisites & Local Setup](#2-tech-stack-prerequisites--local-setup)
3. [Build & Tooling Configuration (`config-overrides.js`)](#3-build--tooling-configuration-config-overridesjs)
4. [Repository Structure](#4-repository-structure)
5. [OCA Schema Bundles (How Schemas Drive Everything)](#5-oca-schema-bundles-how-schemas-drive-everything)
6. [Core Application Architecture & Data Pipelines](#6-core-application-architecture--data-pipelines)
   - [6.1 Routing & Top-Level Providers](#61-routing--top-level-providers)
   - [6.2 Schema Discovery, Registry & Lazy Loading](#62-schema-discovery-registry--lazy-loading)
   - [6.3 Schema Extraction: Attributes, Pages & Regex Formats](#63-schema-extraction-attributes-pages--regex-formats)
   - [6.4 Redux Store Architecture (9 Slices + Selectors)](#64-redux-store-architecture-9-slices--selectors)
   - [6.5 Key Encoding, Normalization & Flattening](#65-key-encoding-normalization--flattening)
   - [6.6 Dynamic Form Rendering & Nested Child Pages](#66-dynamic-form-rendering--nested-child-pages)
   - [6.7 Validation & Dirty-State Tracking](#67-validation--dirty-state-tracking)
   - [6.8 ORCID Integration & Duplicate Detection](#68-orcid-integration--duplicate-detection)
   - [6.9 Export, Canonicalization, SAIDs & Revision Lineage](#69-export-canonicalization-saids--revision-lineage)
   - [6.10 Schema Plugin Upgrade / Migration Flow](#610-schema-plugin-upgrade--migration-flow)
   - [6.11 Bilingual Support (English / French)](#611-bilingual-support-english--french)
7. [Deep Dive: Connection to ContextHub](#7-deep-dive-connection-to-contexthub)
   - [7.1 Security & Origin Allowlisting](#71-security--origin-allowlisting)
   - [7.2 Embedding Detection & Chrome Changes](#72-embedding-detection--chrome-changes)
   - [7.3 Deep-Link URL Parameters](#73-deep-link-url-parameters)
   - [7.4 Bidirectional `postMessage` Protocol](#74-bidirectional-postmessage-protocol)
   - [7.5 Async Handshake & `StrictMode` Buffering](#75-async-handshake--strictmode-buffering)
   - [7.6 Standalone REST `POST` (`dataUrl`) Flow](#76-standalone-rest-post-dataurl-flow)
   - [7.7 Browser Storage Keys](#77-browser-storage-keys)
8. [Testing, CI/CD & Deployment](#8-testing-cicd--deployment)
9. [Known Repository Quirks & Gotchas](#9-known-repository-quirks--gotchas)

---

## 1. What This Application Does & Ecosystem Context

**CAT Catalogue Writer** is a client-side React + Redux single-page application (SPA) built by **Agri-Food Data Canada (ADC)** / **Semantic Engine** (University of Guelph). It lets researchers and data stewards **create, view, edit, upgrade, and export standards-compliant JSON-LD catalogue records** (e.g., for projects, datasets, schemas, samples, questionnaires, DMPs, Dublin Core, and OpenAIRE).

### Four Foundational Concepts

1. **OCA (Overlays Capture Architecture) Schema Package**
   Instead of hardcoding form fields in React, every form is generated at runtime from a standardized JSON file called an **OCA Package** stored in `public/schemas/` (active) or `public/schemas/hidden/` (historical/archived). **Golden Rule:** application code must *never* mutate or hand-edit schema packages to work around UI bugs; the parser adapts to the OCA spec.
2. **SAID (Self-Addressing Identifier)**
   Every OCA package has a cryptographic content hash in its top-level `"d"` property (e.g., `"EMEb1rkdFU80zKjzCKVrRe8V69m8HTm1brZV7v8BbAJ5"`). Likewise, every exported catalogue record gets its own deterministic SAID computed via `saidify` (`saidifyUrn`) and written into `"d"`. Because `"d"` hashes the canonicalized content, editing a published record produces a **new immutable record** whose `dcterms.isVersionOf` points to the previous record's SAID.
3. **JSON-LD Catalogue Record (`dcat:CatalogRecord`)**
   Exported records wrap user metadata in a JSON-LD envelope containing `@context`, `@type` (`"dcat:CatalogRecord"`), `@schema_id` (the OCA package SAID), `@schema_version`, `d` (the record SAID), and `dcterms` lineage/version fields (`version`, `modified`, `isVersionOf`, `adms:versionNotes`).
4. **ContextHub**
   **ContextHub** is the parent web platform (e.g., `https://csdcc.datacontexthub.org`, `https://contexthub-dev.climatesmartagrifood.ca`, `https://*.semanticengine.org`) that manages datasets, projects, samples, questionnaires, and schemas. Catalogue Writer operates in **two modes**:
   - **Standalone web app:** Users pick a schema or upload a `.json` record, edit it, and download the exported JSON-LD file.
   - **Embedded / integrated inside ContextHub:** ContextHub opens Catalogue Writer in an `<iframe>`, a popup tab (`window.opener`), or a deep link with `?dataUrl=...`, pre-populates user ORCID and existing record data, syncs EN/FR language switches, triggers schema upgrades, and receives the finished SAIDified record back via `window.postMessage` (or HTTP `POST`).

---

## 2. Tech Stack, Prerequisites & Local Setup

### Stack Summary

| Layer | Technology |
|---|---|
| UI Framework | React 19 (`react` 19.2.3) |
| Build Toolchain | Create React App (`react-scripts` 5.0.1) + `react-app-rewired` 2.2.1 (`config-overrides.js`) |
| State Management | Redux Toolkit 2.11.2 + `react-redux` 9.2.0 |
| Routing | React Router v7 (`react-router-dom` 7.18.4) |
| Component Library | Material UI v7 (`@mui/material`, `@mui/icons-material`, `@mui/system`) + `@mui/x-date-pickers` v8 + `date-fns` v4 |
| Cryptographic SAIDs | `saidify` 1.1.1 (`saidifyUrn`) |
| Testing | Jest + React Testing Library (`@testing-library/react` 16.3.0) |
| Hosting | Azure Static Web Apps (`staticwebapp.config.json`) |

### Local Setup

```bash
# 1. Install dependencies (uses exact versions; see .npmrc note below)
npm ci   # or npm install

# 2. Start dev server on http://localhost:3000
npm start

# 3. Run unit & integration tests once
npm test -- --watchAll=false

# 4. Create production bundle in build/
npm run build
```

> **Important `.npmrc` settings:** The repo enforces `save-exact=true` (all installed package versions are pinned without `^`/`~`) and `ignore-scripts=true` (lifecycle scripts like `postinstall` are disabled by default for supply-chain security). Keep this in mind when adding dependencies.

---

## 3. Build & Tooling Configuration (`config-overrides.js`)

Because Create React App hides webpack configuration, `package.json` invokes `react-app-rewired`, which loads `config-overrides.js` at build/dev/test time. It performs **four critical jobs**:

1. **Node Core Polyfills for Webpack 5:** Maps `process`, `zlib`, `stream`, `util`, `buffer`, and `assert` to browser polyfills, injects global `process` and `Buffer` via `webpack.ProvidePlugin`, and sets `fullySpecified: false` on `.m?js` modules (required by `saidify` and ESM dependencies).
2. **Build-Time Schema Index (`__SCHEMA_INDEX__`):**
   `buildSchemaIndex()` synchronously reads `public/schemas/*.json` (`visible`) and `public/schemas/hidden/*.json` (`hidden`) and injects a lightweight JSON index via `webpack.DefinePlugin`:
   ```js
   {
     visible: [{ name: meta[0].name, said: data.d, filePath: "./schemas/<file>.json" }, ...],
     hidden:  [{ name: meta[0].name, said: data.d, filePath: "./schemas/hidden/<file>.json" }, ...]
   }
   ```
   This keeps large OCA schema JSON files out of the initial JS bundle — schemas are fetched lazily over HTTP from `/schemas/...` only when needed.
   > **Gotcha:** Because `__SCHEMA_INDEX__` is generated when webpack starts, **adding, moving, renaming, or deleting a file in `public/schemas/` requires restarting `npm start` or re-running `npm run build`**.
3. **Webpack Dev Server v4.15+ Shim (`devServer`):** Converts CRA 5's deprecated `onBeforeSetupMiddleware`/`onAfterSetupMiddleware` hooks into `setupMiddlewares` so `webpack-dev-server` 4.15.2 boots cleanly.
4. **Jest Module Mapping (`jest`):** Maps React Router v7 ESM entrypoints (`react-router`, `react-router/dom`, `react-router-dom`) and updates `transformIgnorePatterns` to allow Jest to transform `date-fns`.

---

## 4. Repository Structure

```text
CAT_Catalogue_Writer/
├── .github/workflows/
│   └── azure-static-web-apps-zealous-mud-0d3297f0f.yml   # CI/CD deploy to Azure Static Web Apps on main
├── docs/
│   ├── DEVELOPER_GUIDE.md                                # This document
│   └── OPERATIONS_AND_USER_GUIDE.md                      # Maintenance runbook & end-user guide
├── Output_Examples/                                      # Sample exported JSON-LD records + use-case READMEs
├── public/
│   ├── assets/images/                                    # Semantic Engine, ADC, and CFREF logos
│   ├── index.html                                        # HTML shell, Google Roboto font, favicon
│   ├── manifest.json                                     # PWA manifest (#E5B000 theme)
│   └── schemas/                                          # Active/visible OCA packages (shown in dropdown)
│       └── hidden/                                       # Historical/deprecated/experimental OCA packages
├── src/
│   ├── App.js                                            # Theme/i18n/Notification providers, Router, global ContextHub message listener
│   ├── index.js                                          # React 19 root (<React.StrictMode> + Redux <Provider>)
│   ├── theme.js                                          # Brand palette (#E5B000) & MUI createTheme()
│   ├── index.css                                         # Skip-to-content link & textarea focus ring
│   ├── pages/
│   │   ├── HomePage.jsx                                  # Schema selector, drag-and-drop upload, outdated banner, ?dataUrl auto-load
│   │   ├── FormPage.jsx                                  # Main form workspace, sidebar drawer/dock, ContextHub prefill & upgrade orchestration
│   │   ├── ViewPage.jsx                                  # Read-only review, revision notes/lineage panel, SAID export, ContextHub submit
│   │   ├── FormHelpPage.jsx                              # Contextual help for Write/Edit page
│   │   ├── ViewHelpPage.jsx                              # Contextual help for View/Review page
│   │   └── NotFoundPage.jsx                              # 404 fallback page
│   ├── components/
│   │   ├── Stateful/
│   │   │   ├── DynamicForm.jsx                           # Renders pages/sections or flat pagination, child-form stack, validation summary, submit
│   │   │   ├── FormSidebar.jsx                           # View-mode pills, section nav tree, per-section completion/error badges, discard guard
│   │   │   ├── LanguageSelector.jsx                      # EN/FR dropdown bound to TranslationContext
│   │   │   ├── UploadButton.jsx                          # Accessible drag-and-drop .json upload (10 MB limit)
│   │   │   └── DynamicFormComponents/
│   │   │       ├── FieldChecker.jsx                      # Dispatches field node to Single / Multiple / MultipleChildren & registers child-page meta
│   │   │       ├── FieldDescription.jsx                  # 2-line clamped description with ResizeObserver "Show more / Show less"
│   │   │       ├── FormInputSingle.jsx                   # Leaf inputs: Select, Checkbox/Autocomplete (>15), Boolean Radio, DatePicker, Textarea + ORCID
│   │   │       ├── FormInputMultiple.jsx                 # Repeatable primitive list with Add/Delete & index shifting
│   │   │       ├── FormInputMultipleChildren.jsx         # Composite object card grid, Add/Edit/Delete, nested key sorting, duplicate ORCID chip
│   │   │       ├── NestedChildFormContent.jsx            # Sub-form editor for composite objects with mount snapshot & rollback on cancel
│   │   │       ├── OrcidSearchDialog.jsx / .css          # Native <dialog> portal for live ORCID Public API v3.0 search
│   │   └── Stateless/
│   │       ├── Accordion.jsx                             # HomePage "What is a Record?" accordion
│   │       ├── ErrorBoundary.jsx                         # Top-level React error boundary
│   │       ├── Footer.jsx                                # Organization logos (hidden in iframe mode)
│   │       ├── HomeHeader.jsx / HomeSubHeader.jsx        # HomePage golden banner & language picker
│   │       ├── NotificationContext.jsx                   # Global MUI Snackbar (notify) & Confirmation Dialog (confirm)
│   │       └── PageHeaders.jsx                           # Form/View header (hides logos & Home button in iframe mode)
│   ├── store/
│   │   ├── store.js                                      # Redux Toolkit store combining 9 slices
│   │   ├── slices/                                       # activePage, childFormNavigation, fieldSchema, formUi, formValue, instanceCounts, mode, uploadFile, userContext
│   │   └── selectors/
│   │       ├── formSelectors.js                          # O(1) value/field lookups, prefix selectors, dirty-state detection (selectHasFormChanges)
│   │       └── popupValidationSelectors.js               # Recursive tree validation for popups, root form, and sidebar section stats
│   └── utils/
│       ├── schemaRegistry.js                             # KNOWN_SCHEMA_MANIFEST, FALLBACK_SCHEMA_INDEX, lazy fetch cache, SemVer & lookup helpers
│       ├── schemaMapping.js                              # SCHEMA_CONTEXT_MAP (schema name -> JSON-LD @context)
│       ├── schemaMigration.js                            # migrateRecordToSchema() for schema plugin upgrades
│       ├── loadSchemaIntoStore.js                        # Orchestrates async fetch -> extract -> enrich -> dispatch into Redux
│       ├── extractJsonSchema.js                          # Thin wrapper over schemaRegistry async loaders
│       ├── extractAttributes.js                          # Parses OCA capture_base, dependencies, labels, entries, conformance, cardinality, formats
│       ├── extractPages.js                               # Parses ADC form extension pages/sections & computes child page nesting depth
│       ├── enrichFieldsWithPaths.js                      # Attaches full dotted `path` to every node in field tree
│       ├── fieldTreeUtils.js                             # buildFieldsByPathMap, getFieldByPath, findFieldByRelativePath, findLinkedChildPageIndex
│       ├── pathEncoding.js                               # DOT_TOKEN ("___$dot$___"), escapeKey(), unescapeKey()
│       ├── removeIndices.js                              # Strips [0], [1] indices to map valuePath -> schema fieldPath
│       ├── normalizeJson.js                              # Converts nested dotted-key JSON objects into flat schema-matching keys + array wrapping
│       ├── formStateFlatten.js                           # flattenFormData(), unflattenFormData(), parseFlatPath(), deepClone()
│       ├── instanceCounts.js                             # buildInstanceCountsFromValues() across all array nesting levels
│       ├── canonicalize.js                               # Deterministic lexicographical JSON serializer for SAID hashing
│       ├── regexUtils.js                                 # Serializes/deserializes RegExp objects for Redux state
│       ├── validationUtils.js                            # getValidationError() & getMaxLengthFromPattern()
│       ├── viewModeUtils.js                              # Mandatory / Recommended / Complete filtering helpers
│       ├── orcidUtils.js                                 # ORCID detection, cleaning, duplicate checks, Public API v3.0 lookup & Solr search
│       ├── iframeUtils.js                                # checkIsIframe() detection
│       ├── postMessageSecurity.js                        # Origin allowlist, safePostMessage(), isSafeDataUrl(), safe session/localStorage wrappers
│       └── OpenAIRE/                                     # TranslationContext.js, TranslationContent.js, translations/{eng,fra}.json
├── AGENTS.md                                             # Compact AI context document
├── config-overrides.js                                   # react-app-rewired webpack/devServer/jest overrides
├── package.json                                          # Dependencies & scripts
├── staticwebapp.config.json                              # Azure SWA routing fallback + CSP frame-ancestors
└── .npmrc                                                # save-exact=true, ignore-scripts=true
```

---

## 5. OCA Schema Bundles (How Schemas Drive Everything)

Every `.json` file in `public/schemas/` and `public/schemas/hidden/` is an **OCA Package** (`type: "oca_package/1.0"`). Understanding its structure makes the entire `src/utils/extract*.js` layer immediately intuitive:

```jsonc
{
  "d": "EPfNmX2yI8Ctn_HxVzqTwZyzVkP_whK2kOtJPeYWD3pT", // Package SAID -> becomes @schema_id
  "type": "oca_package/1.0",
  "oca_bundle": {
    "bundle": {
      "capture_base": {
        "d": "EBDk8_9Fz1rQrFKYp_dlkqigXUkQnGrK67oVKdpaRHQx", // Root capture_base digest
        "attributes": {
          "dcterms.title": "Text",                         // Primitive scalar
          "dcterms.spatial": ["Text"],                     // Array of primitives (multiple=true)
          "prov.qualifiedAttribution": "refs:EJPEri..."    // Reference to a dependency bundle's `d`
        }
      },
      "overlays": {
        "meta":        [{ "language": "eng", "name": "ContextHub_schema_catalogue_record" }],
        "label":       [{ "language": "eng", "attribute_labels": { "dcterms.title": "Title" } }],
        "entry":       [{ "language": "eng", "attribute_entries": { "dcterms.language": { "eng": "eng", "fra": "fra" } } }],
        "conformance": { "attribute_conformance": { "dcterms.title": "M" } }, // "M" | "R" | "O"
        "cardinality": { "attribute_cardinality": { "prov.qualifiedAttribution": "0-n" } },
        "format":      { "attribute_formats": { "dcterms.title": "^.{0,250}$" } }
      }
    },
    "dependencies": [
      {
        "d": "EJPEriSt9Rgo5qJC8ydrPltcyw_wYPiDAnrXg_G4qc43", // Matched by `refs:<d>`
        "capture_base": { "d": "EDTmZY...", "attributes": { "id": "Text", "foaf.name": "Text", "hadRole": ["Text"] } },
        "overlays": { /* dependency-scoped label, entry, conformance, cardinality, format */ }
      }
    ]
  },
  "extensions": {
    "adc": {
      "<captureBaseDigest>": {
        "overlays": {
          "form": [{
            "language": "eng",
            "page_order": ["section-uuid-1"],
            "pages": [{
              "named_section": "section-uuid-1",
              "attribute_order": [
                "dcterms.title",
                { "named_section": "nested-group-uuid", "attribute_order": ["dcterms.description"] }
              ]
            }],
            "page_labels":   { "section-uuid-1": "Describe Your Schema" },
            "sidebar_label": { "section-uuid-1": "Describe Your Schema" },
            "description":   { "dcterms.title": "A name given to the resource" },
            "interaction":   [{ "arguments": { "dcterms.issued": { "placeholder": "YYYY-MM-DD", "options": ["Yes", "No"] } } }]
          }],
          "ordering": { "attribute_ordering": ["dcterms.title", "dcterms.description"] }
        }
      }
    }
  }
}
```

### Key Mapping Rules from OCA to UI

| OCA Source | Extracted Field Property | UI Effect |
|---|---|---|
| `overlays.meta[0].name` | `schemaName` & registry key | Dropdown name, sidebar title, URL slug (`/form/<slug>`) |
| `d` (top-level) | `said` | Matched against uploaded `@schema_id`; written on export |
| `overlays.label[].attribute_labels` | `field.label` | Display label (localized by active language, fallback to first overlay) |
| `extensions.adc[].overlays.form[].description` | `field.description` | 2-line expandable help text (`FieldDescription`) |
| `extensions.adc[].overlays.form[].interaction[].arguments` | `field.placeholder`, `field.options` | Input placeholder (also `placeholder === "YYYY"` triggers year-only DatePicker!) & Boolean Radio labels |
| `overlays.conformance.attribute_conformance` | `required` (`"M"`), `recommended` (`"R"`), `optional` (`"O"`, default) | Red `*`, validation, and Mandatory/Recommended/Complete view pills |
| `overlays.cardinality.attribute_cardinality` or array type (`[Text]` / `Array`) | `field.multiple` | Multiplicity (`"n"`, `"1-"`, `"0-"` -> `multiple: true`) |
| `overlays.entry[].attribute_entries` | `field.categories` (`["code (label)", ...]`) | Dropdown (single), Checkboxes (`<= 15`), or Searchable Autocomplete (`> 15`) |
| `overlays.format.attribute_formats` | `formatPatterns` / `depFormatPatterns` | Live regex validation + auto-extracted `maxLength` character counter |
| `extensions.adc[cbDigest].overlays.form[].pages` | `pages[]` | Multi-page sidebar navigation and card-grouped sections; if absent, falls back to 6-fields-per-page flat pagination |

---

## 6. Core Application Architecture & Data Pipelines

### 6.1 Routing & Top-Level Providers

`src/index.js` mounts `<React.StrictMode>` + Redux `<Provider store={store}>` + `<App />`.
`src/App.js` wraps the app in:
1. `<ThemeProvider theme={muiTheme}>` + `<CssBaseline />` (warm golden `#E5B000` palette from `src/theme.js`)
2. `<ErrorBoundary>`
3. `<TranslationProvider>` (EN/FR context)
4. `<NotificationProvider>` (global toast `notify()` and async confirmation modal `confirm()`)
5. `<BrowserRouter>` with code-split routes (`HomePage` and `FormPage` eagerly loaded; `ViewPage`, `ViewHelpPage`, `FormHelpPage`, `NotFoundPage` lazy-loaded):

| Route | Component | Purpose |
|---|---|---|
| `/` | `HomePage` | Select schema to write, upload `.json` to view/edit/upgrade, or auto-load `?dataUrl=&schema=` |
| `/form` and `/form/:schemaSlug` | `FormPage` | Dynamic multi-page form editor (Write, Edit, or Upgrade mode) |
| `/view` | `ViewPage` | Read-only summary, revision notes/lineage panel, JSON-LD download, ContextHub submission |
| `/form-help` | `FormHelpPage` | Contextual help for Write/Edit page |
| `/view-help` | `ViewHelpPage` | Contextual help for View/Review page |
| `*` | `NotFoundPage` | 404 page with Return to Home |

### 6.2 Schema Discovery, Registry & Lazy Loading

```text
public/schemas/*.json + public/schemas/hidden/*.json
        │
        ▼ (build/start time in config-overrides.js)
__SCHEMA_INDEX__  (or FALLBACK_SCHEMA_INDEX in Jest)
        │
        ▼ (runtime in src/utils/schemaRegistry.js)
visibleSchemas -> SCHEMA_REGISTRY, ROUTE_MAP, FILE_MAP, SCHEMA_ID_MAP
allParsedSchemas (visible + hidden) -> ID_TO_SCHEMA_MAP
KNOWN_SCHEMA_MANIFEST -> family, SemVer version, status ("active"|"deprecated"), isVersionOf
        │
        ▼ (on demand via loadSchemaIntoStore.js)
fetch("${PUBLIC_URL}/schemas/...") -> cached in schemaJsonCache (Map) + deduplicated via pendingSchemaFetches
```

**Important resolution order in `resolveSchemaEntry(query)`:**
1. Exact `name` in `visibleSchemas`
2. Exact `said` in `allParsedSchemas` (visible takes precedence over hidden if SAIDs collide)
3. URL `slugify(name)` in `visibleSchemas` (powers direct `/form/:schemaSlug` links)
4. Fallback by `name` or `slugify(name)` in `hiddenSchemas`

`loadSchemaIntoStore(dispatch, { schema, exactSaid, lang, preserveUiState, shouldCommit })` orchestrates the entire load and accepts a `shouldCommit` callback to prevent stale/cancelled React `StrictMode` double-mount fetches from dispatching twice.

### 6.3 Schema Extraction: Attributes, Pages & Regex Formats

- **`src/utils/extractAttributes.js`**:
  - Recursively walks `capture_base.attributes`. When an attribute references `"refs:<depDigest>"` (or `["refs:<depDigest>"]`), it looks up the dependency in `oca_bundle.dependencies` and recurses with a **per-branch `visitedRefs` `Set`**. Why per-branch instead of shared? A shared set prevents circular references, *but* would break schemas where two sibling attributes (e.g., `author` and `reviewer`) reference the same `PERSON` dependency!
  - Escapes every attribute key containing `.` via `escapeKey()` (`"."` -> `"___$dot$___"`).
  - Compiles `formatPatterns` (root) and `depFormatPatterns` (dependencies). Dependency formats are stored under **both** `"${depDigest}::${escapedAttr}"` and bare `"${escapedAttr}"` so two dependencies with fields named `id` can enforce different regexes without colliding.
- **`src/utils/enrichFieldsWithPaths.js`**:
  - Attaches a full `path` string to each node (e.g., `prov___$dot$___qualifiedAttribution.foaf___$dot$___name`).
- **`src/utils/extractPages.js`**:
  - Reads `extensions.adc[digest].overlays.form` for root (`isChildPage: false, depth: 0`) and each dependency (`isChildPage: true, depth: 1..N`).
  - Resolves each `attribute_order` entry by matching `field.captureBase === captureBaseDigest` **first** before falling back, preventing nested fields named `title`/`id`/`description` from hijacking root pages.
- **`src/utils/regexUtils.js`**:
  - Converts compiled `RegExp` objects to `{ source, flags, type: "regex" }` before storing in Redux so Redux's serializability checks stay happy.

### 6.4 Redux Store Architecture (9 Slices + Selectors)

Defined in `src/store/store.js`:

| Slice | File | Responsibility |
|---|---|---|
| `fieldSchema` | `fieldSchemaSlice.js` | `schemaName`, `fields` (tree), `fieldsByPath` (O(1) map built automatically in `setFields`), `formatPatterns`, `depFormatPatterns`, `pages`, `childPages` (runtime parent->child page metadata), `loadedSchemaMeta` (`{ schemaKey, exactSaid, lang }`) |
| `formValues` | `formValueSlice.js` | `formState` (flat key-value map of all user inputs), `initialFormState` (deep clone captured on initial load for dirty-state comparison) |
| `instanceCounts` | `instanceCountsSlice.js` | `instanceCounts` map tracking array lengths at every nested collection path (e.g., `{"creator": 2, "creator[0].tags": 3}`) |
| `mode` | `modeSlice.js` | `"write" \| "edit" \| "view"` |
| `uploadFile` | `uploadFileSlice.js` | `isUploaded`, `originalSaid` (only retained when `isPublished === true`), `recordVersion`, `isVersionOf`, `versionNotes`, `schemaId`, `isPublished`, plus upgrade state (`isUpgradeMode`, `sourceSchemaId`, `sourceSchemaVersion`, `targetSchemaId`, `targetSchemaVersion`, `targetFamily`, `unmappedFields`, `missingRequiredFields`, `mappedFieldCount`) |
| `formUi` | `formUiSlice.js` | `viewMode` (`"mandatory" \| "recommended" \| "complete"`), `currentPage` (1-based flat page), `fieldsPerPage` (`6`) |
| `activePage` | `activePageSlice.js` | `index` (0-based index into `fieldSchema.pages`) |
| `childFormNavigation` | `childFormNavigationSlice.js` | Active nested child-form editing session (`nextValuePath`, `parentPageIndex`, `childPageIndex`, `isEdit`, `fallbackLabel`, `fallbackFieldPath`, `useGeneratedPage`, and `previous` linked-list stack for multi-level nesting) |
| `userContext` | `userContextSlice.js` | ContextHub user identity (`orcid`, `name`, `orcidVerified`, `isContextHub`), bootstrapped from URL query params or `sessionStorage` and updated via `SET_USER_CONTEXT` |

**Key Selectors:**
- `src/store/selectors/formSelectors.js`:
  - `selectFieldByPath(path)` — O(1) lookup via `fieldsByPath` with recursive fallback.
  - `selectFieldValue(path)` / `selectInstanceCount(path)` — direct O(1) lookups avoiding Reselect factory churn.
  - `makeSelectFormValueByPrefix(prefix)` — memoized prefix slice for repeatable/composite inputs.
  - `selectHasFormChanges` — compares sorted, non-empty snapshots of `formState` vs `initialFormState`, ignoring system/envelope keys (`d`, `@context`, `@schema_id`, `dcterms.modified`, `dcterms.isVersionOf`, etc.).
- `src/store/selectors/popupValidationSelectors.js`:
  - `makeSelectIsPopupValid(nextValuePath)` — validates a single composite child-form session (if all children are optional, requires at least one non-empty value so users can't save empty cards).
  - `selectIsRootFormValid` — true iff form has at least one non-empty value AND every root field tree validates cleanly.
  - `selectValidationSummary` — computes `{ isEmptyForm, isValid, issues[], pageStats }` used by `FormSidebar` (green checkmarks / warning counts) and `DynamicForm` (clickable jump-to-section chips).

### 6.5 Key Encoding, Normalization & Flattening

Many RDF/DCAT/PROV schemas have **attribute names containing literal dots**, such as `dcterms.title` or `prov.qualifiedAttribution`. Because the Redux store also uses `.` as a hierarchy separator (e.g., `parent[0].child`), literal dots inside attribute names would corrupt parsing if left unescaped.

- **`src/utils/pathEncoding.js`**: Replaces literal dots with `DOT_TOKEN = "___$dot$___"`:
  - Schema key `"dcterms.title"` -> Redux key `"dcterms___$dot$___title"`
  - Nested contributor ORCID -> `"prov___$dot$___qualifiedAttribution[0].id"`
  - Nested contributor name -> `"prov___$dot$___qualifiedAttribution[0].foaf___$dot$___name"`
- **`src/utils/normalizeJson.js` (`normalizeNestedFields`)**: When loading an external JSON record (from file upload, `dataUrl`, or ContextHub `postMessage`), some sources serialize dotted attributes as nested objects (`{ dcterms: { title: "X" } }`) while others serialize them flat (`{ "dcterms.title": "X" }`). `normalizeNestedFields` collapses nested objects back to the dotted attribute key expected by the schema (also handling the legacy typo `"contribitor"` -> `"contributor"`), and wraps scalar values into 1-element arrays whenever `field.multiple` is true.
- **`src/utils/formStateFlatten.js`**:
  - `flattenFormData(obj)` -> nested JS object to flat escaped Redux map.
  - `unflattenFormData(flatObject)` -> flat escaped Redux map back to nested JSON object with unescaped keys (used on `ViewPage` before export).
- **`src/utils/instanceCounts.js` (`buildInstanceCountsFromValues`)**: Scans *every* `[index]` segment in every flat key (not just the last one) so nested array counts (e.g., `creator` AND `creator[0].tags`) are always accurately reconstructed.

### 6.6 Dynamic Form Rendering & Nested Child Pages

```text
FormPage
 ├── PageHeaders
 ├── FormSidebar (docked on >1024px, MUI Drawer on <=1024px or when collapsed)
 └── DynamicForm
      ├── (If active child session) NestedChildFormContent stack (hidden ancestors + visible leaf)
      └── (Else) Pages/Sections OR Flat Pagination (6 fields/page)
           └── FieldChecker (routes by field shape)
                ├── children.length > 0         -> FormInputMultipleChildren (Card grid -> opens NestedChildFormContent)
                ├── multiple && categories      -> FormInputSingle (<=15: Checkboxes; >15: Searchable Autocomplete)
                ├── multiple (primitives)       -> FormInputMultiple (Repeatable FormInputSingle + Add/Delete)
                └── single leaf                 -> FormInputSingle (Select | Boolean Radio | DatePicker | Textarea + ORCID)
```

#### How Child Forms (Composite Objects) Work
1. When `FieldChecker` or `FormInputMultipleChildren` renders a composite field (e.g., `prov.qualifiedAttribution`), `findLinkedChildPageIndex(field, pages)` checks if the OCA bundle defines a dedicated child page whose field names match `field.children`.
2. If found, it registers `{ childPageIndex, parentFieldPath, parentPageIndex, label }` in `fieldSchema.childPages` so `FormSidebar` displays the indented child page when the parent page is active.
3. Clicking **Add** or **Edit** on a card dispatches `setChildFormNavigation({ push: true, nextValuePath: "path[idx]", ... })` and switches `activePage` to the child page (or uses a generated page when `linkedChildPageIndex < 0`).
4. **`NestedChildFormContent.jsx`** snapshots both `formValues` and `instanceCounts` on mount:
   - Clicking **Save** sets `isSavedRef.current = true`, increments parent `instanceCount` (if adding a new item), and pops back to the parent page.
   - Clicking **Cancel** (or navigating away via the sidebar after confirming discard) lets the unmount cleanup effect **roll back** every added/modified key and instance count under `nextValuePath`.
5. Deleting a card in `FormInputMultipleChildren` shifts all higher-index keys down (`[i]` -> `[i-1]`) and rebuilds `instanceCounts` from scratch via `buildInstanceCountsFromValues(nextFormState)` so nested sub-arrays never drift out of sync.

#### Multi-Select Category Threshold (`> 15` Options)
In `FormInputSingle.jsx`, `MULTI_CATEGORY_SEARCH_THRESHOLD = 15`:
- Multi-select category fields with **15 or fewer** entries render as a vertical checkbox list (`FormGroup`).
- Multi-select category fields with **more than 15** entries (e.g., Wikidata geographic locations `Q1904 (Ontario)`) automatically switch to a searchable MUI `Autocomplete` (`createFilterOptions({ limit: 100 })`) that searches by both label and code, displays human-readable label chips, and stores the clean codes in Redux at `path[0]`, `path[1]`, etc.

### 6.7 Validation & Dirty-State Tracking

- **`src/utils/validationUtils.js`**:
  - `getValidationError(...)` runs in order:
    1. **Required check** (`Boolean false` is explicitly treated as a valid non-empty value!).
    2. **Duplicate contributor ORCID check** (strictly scoped to ORCID fields via `isQualifiedAttributionOrcidField`).
    3. **Format regex check** (case-insensitive `new RegExp(pattern, "i")`), resolving patterns in priority order: `${captureBase}::${fieldName}` -> root `formatPatterns[fieldName]` -> fallback `depFormatPatterns[fieldName]`.
  - `getMaxLengthFromPattern(...)` inspects trailing `{min,max}$` or `{exact}$` quantifiers in the regex to display live `current / max` character counters under textareas.
- **Unchanged-Edit Guard:** In edit mode (when *not* upgrading), `DynamicForm` disables **Update & Review** until `selectHasFormChanges` becomes `true`. On `ViewPage`, for published records, **Update to ContextHub** is similarly disabled if neither form fields nor Revision Notes have changed.

### 6.8 ORCID Integration & Duplicate Detection

Implemented in `src/utils/orcidUtils.js`, `FormInputSingle.jsx`, and `OrcidSearchDialog.jsx`:

- **Auto-Detection (`isQualifiedAttributionOrcidField`):** Activates automatically on any field whose path contains `qualifiedattribution` or `attribution` and whose name/label/description references `id` or `orcid`, OR whose label contains `"orcid identifier"` / `"orcid id"`.
- **Sibling Name Auto-Fill (`findSiblingNameFieldKey`):** Automatically locates the companion name field (e.g., `foaf___$dot$___name`, `name`, or label matching contributor/full name) in the same composite instance and populates it alongside the ORCID.
- **Three User Capabilities:**
  1. **ContextHub Verified ORCID Banner:** Appears when `userContext.orcidVerified && userContext.orcid` is set and not already used in another contributor entry. One click inserts the verified ORCID and fetches/fills the user's name.
  2. **ORCID Registry Search Modal (`OrcidSearchDialog`):** Uses a native HTML `<dialog closedby="any">` rendered into `document.body` via `createPortal` (preventing nested `<form>` submission conflicts with `DynamicForm`). Queries `https://pub.orcid.org/v3.0/expanded-search/` (CORS-enabled public API) using Solr `edismax` ranking with input sanitization (`sanitizeOrcidSearchText`), optional affiliation filter, automatic broad-match fallback (`mm=1`) if strict all-terms search returns 0, 10-per-page pagination, and container-query responsive table/cards.
  3. **Fetch Name from ORCID:** Calls `https://pub.orcid.org/v3.0/{orcid}/personal-details` (`credit-name` or `given-names + family-name`).
- **Duplicate Prevention (`checkDuplicateContributorOrcid`):** Flags duplicate ORCIDs across sibling contributor entries in the same array collection — inline on the input, in the ORCID search dialog ("Already Added" chip), on `FormInputMultipleChildren` cards, and blocking Save in `NestedChildFormContent`.

### 6.9 Export, Canonicalization, SAIDs & Revision Lineage

All export logic lives in `generateCatalogueRecord(jsonData)` inside `src/pages/ViewPage.jsx`:

1. Deep-clones the unflattened form state and strips any prior envelope keys (`catalogue_id`, `d`, `@context`, `@schema_id`, `@schema_version`, `@type`).
2. Deterministically sorts all object keys via `canonicalize(dataForSaid)` (`src/utils/canonicalize.js`).
3. Builds/updates `formData.dcterms`:
   - `version`: SemVer normalized (`normalizeVersion`), except dataset schemas preserve `resourceVersion` verbatim (and also mirror it to top-level `datasetVersion` and `version`).
   - `modified`: Current UTC ISO-8601 timestamp.
   - `isVersionOf`: Set to `originalSaid` (or fallback `isVersionOfPrior`) **only when `isPublished` is true**, establishing an immutable revision chain.
   - `"adms:versionNotes"`: Included if the user entered revision notes on `ViewPage`.
4. Looks up `@context` from `SCHEMA_CONTEXT_MAP` (`src/utils/schemaMapping.js`) and injects `{ dcat: "http://www.w3.org/ns/dcat#" }` if absent (`injectDcatNamespace`).
5. Wraps with `@context`, `@type: "dcat:CatalogRecord"`, `@schema_id` (target SAID if upgrading, else active schema SAID), `@schema_version`, and `d: ""`.
6. Computes the cryptographic SAID via `const [, objWithSaid] = saidifyUrn(formDataWithId, "d")`.
7. Downloads as `catalogue-${objWithSaid.d || "export"}.json` (`application/ld+json`) or delivers to ContextHub.

### 6.10 Schema Plugin Upgrade / Migration Flow

When a schema evolves to a new version (producing a new OCA package SAID):
- The old package moves to `public/schemas/hidden/` and is marked `status: "deprecated"` in `KNOWN_SCHEMA_MANIFEST` (`src/utils/schemaRegistry.js`).
- The new package goes into `public/schemas/` and is marked `status: "active"` with the same `family` and `isVersionOf: "<oldSaid>"`.
- When a user uploads an old record on `HomePage` (or ContextHub opens Catalogue Writer with `mode=upgrade` / `UPGRADE_RECORD`):
  1. `getSchemaPluginOutdatedStatus(schemaId)` detects that an active newer version exists in the same family.
  2. `migrateRecordToSchema(oldRecord, targetFields)` (`src/utils/schemaMigration.js`):
     - Normalizes nested dotted keys against the **target** schema.
     - Recursively filters the record to keep **only** keys matching target schema fields (preventing obsolete/renamed keys from leaking into the upgraded JSON).
     - Captures discarded non-empty values into `unmappedFields: [{ key, value }]` (excluding envelope and system `dcterms` keys).
     - Flattens mapped values, rebuilds `instanceCounts`, and identifies `missingRequiredFields: [{ path, label }]`.
  3. `FormPage` shows a blue upgrade banner displaying mapped count, missing required field chips, and a collapsible reference table of unmapped legacy values for manual copy/paste.
  4. `ViewPage` shows a green upgraded confirmation banner and exports the record with the **new** `@schema_id` and `@schema_version`, while preserving `dcterms.isVersionOf` pointing to the previous published record's SAID.

### 6.11 Bilingual Support (English / French)

- Managed by `src/utils/OpenAIRE/TranslationContext.js` (canonical codes `"eng"` and `"fra"`, normalized from `"en"`, `"fr"`, `"english"`, `"french"`, etc.).
- Initial language priority: `?lang=` / `?language=` URL param -> `localStorage["cat_catalogue_writer_lang"]` -> `"eng"`.
- Synchronizes `<html lang="en|fr">` for WCAG 3.1.1 compliance.
- Listens for `postMessage` language updates from allowlisted ContextHub origins (`SET_LANGUAGE` or any message carrying `.lang` / `.language`).
- Static UI chrome strings live in `src/utils/OpenAIRE/translations/eng.json` and `fra.json`.
- **Dynamic Schema Re-Localization:** Both `FormPage` and `ViewPage` watch `lang !== loadedSchemaMeta.lang` and re-run `loadSchemaIntoStore(..., { preserveUiState: true })` to re-extract localized OCA labels, entries, descriptions, and page titles **without clearing `formValues` or resetting UI state**.

---

## 7. Deep Dive: Connection to ContextHub

Catalogue Writer is designed to work seamlessly inside or alongside **ContextHub**. Because ContextHub lives in a separate repository/origin, understanding the exact security boundaries and message contract is essential.

### 7.1 Security & Origin Allowlisting

Allowlisted host origins are enforced in **two places that must always stay in sync**:

1. **HTTP CSP Header (`staticwebapp.config.json`):**
   ```text
   frame-ancestors 'self' http://localhost:* https://*.semanticengine.org https://csdcc.datacontexthub.org https://contexthub-dev.climatesmartagrifood.ca
   ```
   Controls which websites browsers permit to embed Catalogue Writer in an `<iframe>`.
2. **JavaScript `postMessage` Guard (`src/utils/postMessageSecurity.js`):**
   `isAllowedOrigin(origin)` permits:
   - `window.location.origin` (same origin)
   - `https://csdcc.datacontexthub.org`
   - `https://contexthub-dev.climatesmartagrifood.ca`
   - `http(s)://localhost:*` and `http(s)://127.0.0.1:*`
   - `https://semanticengine.org` and `https://*.semanticengine.org`

Every incoming `message` event across `App.js`, `FormPage.jsx`, and `TranslationContext.js` ignores non-allowlisted origins and calls `rememberVerifiedOrigin(event.origin)` when valid. Outbound replies use `getTrustedTargetOrigin()` (verified origin -> allowlisted `document.referrer` -> optional wildcard *only* for non-sensitive handshake requests).

### 7.2 Embedding Detection & Chrome Changes

`checkIsIframe(searchParams)` (`src/utils/iframeUtils.js`) returns `true` when `?iframe=true` is in the URL **or** `window.self !== window.top` (including cross-origin frame access errors).

When embedded (`isIframeMode === true`):
- `HomeHeader` and `PageHeaders` hide Semantic Engine and Agri-Food Data Canada logos.
- `PageHeaders` hides the **Home** button and switches to a compact 52px header row (keeping the title, tooltip, Help button, and EN/FR language switcher).
- `Footer` renders `null`.
- `FormPage` disables the browser `beforeunload` leave-page prompt (ContextHub manages modal/iframe dismissal).
- `ViewPage` renders the **UPDATE TO CONTEXTHUB** button (or custom `?buttonLabel=...`) that sends the record back via `postMessage`.

### 7.3 Deep-Link URL Parameters

ContextHub launches Catalogue Writer at `/form/:schemaSlug?...` (or `/form?...`, or `/?dataUrl=...&schema=...`):

| Parameter | Values / Format | Effect |
|---|---|---|
| `schema` | Schema name, SAID, or URL slug (e.g., `ContextHub_dataset_catalogue_record`) | Overrides/provides target schema (also accepted as `:schemaSlug` path segment) |
| `iframe` | `"true"` | Forces embedded chrome mode |
| `mode` | `"write" \| "edit" \| "upgrade"` | Controls form header, edit/dirty behavior, and upgrade migration pipeline |
| `lang` / `language` | `"en" \| "eng" \| "fr" \| "fra"` | Sets initial UI + schema language |
| `dataUrl` | `https://...`, `http://localhost...`, `/...`, or `data:application/json[;base64],...` | Validated by `isSafeDataUrl()`. Prefills the form. Non-`data:` URLs are stored in `sessionStorage["dataUrl"]` for REST `POST` submit |
| `isPublished` / `published` | `"true" \| "false"` | If `"true"`, preserves `originalSaid` so exporting writes `dcterms.isVersionOf` and blocks unchanged resubmits |
| `version` | SemVer or string (e.g., `"2.1.0"`) | Overrides `recordVersion` (otherwise read from `datasetVersion` -> `versionLabel` -> `dcterms.version` -> `version` -> `"1.0.0"`) |
| `sourceSchemaId` | Historical OCA package SAID | Source schema SAID for upgrade flows |
| `targetSchemaId` | Target OCA package SAID | Exact target schema SAID to load (`exactSaid`) and emit on export |
| `buttonLabel` | Custom text | Custom label for `ViewPage` `postMessage` submit button (also forces showing the button outside iframes, e.g., popup tabs) |
| `userOrcid` | `0000-0000-0000-000X` | Pre-populates `userContext.orcid` (persisted to `sessionStorage`) |
| `userName` | Full name string | Pre-populates `userContext.name` (persisted to `sessionStorage`) |
| `orcidVerified` | `"true" \| "false"` | Enables the green "ContextHub Verified ORCID Available" one-click banner |

### 7.4 Bidirectional `postMessage` Protocol

```text
ContextHub Host Window (window.parent or window.opener)          CAT Catalogue Writer
  │                                                                       │
  │ ◄──────────────────── { type: "REQUEST_USER_CONTEXT" } ────────────── │ (on App & FormPage mount)
  │ ◄──────────────────── { type: "REQUEST_RECORD" } ──────────────────── │ (wildcard fallback OK)
  │                                                                       │
  │ ── { type: "SET_USER_CONTEXT", user: { orcid, name, orcidVerified } }►│ -> userContextSlice
  │ ── { type: "SET_LANGUAGE", payload: "fr" } (or { lang: "fra" }) ─────►│ -> TranslationContext + schema reload
  │ ── { type: "CLEAR_RECORD" } ─────────────────────────────────────────►│ -> clears sessionStorage & resets FormPage
  │ ── { type: "SET_RECORD", record, isPublished?, version? } ───────────►│ -> prefill form (edit mode)
  │ ── { type: "UPGRADE_RECORD", record, sourceSchemaId?, targetSchemaId?,│
  │       isPublished?, version? } ──────────────────────────────────────►│ -> migrateRecordToSchema() (upgrade mode)
  │                                                                       │
  │                                         [User edits -> clicks Review] │
  │                                    [ViewPage -> Update to ContextHub] │
  │ ◄── { type: "CATALOGUE_RECORD", record: <SAIDified JSON-LD>,          │
  │       isUpgrade, sourceSchemaId, targetSchemaId } ─────────────────── │ (strict allowlisted targetOrigin!)
```

**Accepted inbound prefill message aliases** (handled identically in `App.js` and `FormPage.jsx`):
`SET_RECORD`, `LOAD_RECORD`, `SET_DATA`, `SET_CATALOGUE_RECORD`, `IMPORT_RECORD`, `PREFILL_RECORD`, `PREFILL`, or `msg.action === "LOAD_RECORD"`. Record body is read from `msg.record || msg.data || msg.payload`.

**Delivery & Fallback Behavior (`ViewPage.jsx` -> `postMessageToParent`):**
- Uses `safePostMessage(target, payload, { allowWildcardFallback: false })` — refuses to broadcast a catalogue record to `"*"`.
- Prefers `window.parent` (iframe), otherwise `window.opener` (popup tab).
- If sent to `window.opener`, displays a success notification and calls `window.close()`.
- If `delivered === false` (e.g., opener was closed or origin was never verified), warns the user and automatically triggers `downloadJson(jsonData)` so the user never loses their work.

### 7.5 Async Handshake & `StrictMode` Buffering

When ContextHub embeds Catalogue Writer, `SET_RECORD` or `UPGRADE_RECORD` frequently arrives **before** the lazy schema JSON finishes fetching or **before** `FormPage` mounts (or React 19 `StrictMode` remounts effects). To guarantee zero dropped prefills and zero duplicate fetches:
1. **`App.js`** listens globally from app boot and buffers incoming `SET_RECORD` / `UPGRADE_RECORD` payloads into `sessionStorage` (`contexthub_pending_record` / `contexthub_pending_upgrade`), cleared immediately on `CLEAR_RECORD`.
2. **`FormPage.jsx`** consumes those `sessionStorage` keys and also listens directly to `message` events.
3. If a record arrives before `fields` are populated in Redux, `applyRecordToForm()` stashes it in `pendingRecordRef.current` and flushes it as soon as `fields` arrive.
4. `FormPage`'s auto-load `useEffect` intentionally **omits `fields` from its dependency array** (using `latestFieldsRef`) and deduplicates identical payloads via `lastAppliedRecordJsonRef` so changing fields never re-fetches `dataUrl` or wipes user edits.
5. `loadSchemaIntoStore` uses `shouldCommit: () => !cancelled` so React `StrictMode` commits schema fields to Redux **once** (covered by `src/pages/FormPage.prefill.test.jsx`).

### 7.6 Standalone REST `POST` (`dataUrl`) Flow

If a user opens Catalogue Writer directly in a browser tab (not inside an iframe, and without `?buttonLabel=...`) with a remote `?dataUrl=https://...` (or `http://localhost:...`):
- `HomePage` or `FormPage` saves the URL in `sessionStorage["dataUrl"]` and fetches the initial JSON.
- On `ViewPage`, `canPostToDataUrl` becomes `true`, displaying an **Update ContextHub** button.
- Clicking it `POST`s the SAIDified JSON-LD record directly back to `dataUrl` (`Content-Type: application/json`).

### 7.7 Browser Storage Keys

| Storage | Key | Purpose |
|---|---|---|
| `sessionStorage` | `contexthub_pending_record` | Buffers `SET_RECORD` received before `FormPage` applies it |
| `sessionStorage` | `contexthub_pending_upgrade` | Buffers `UPGRADE_RECORD` payload + metadata |
| `sessionStorage` | `contexthub_is_published` | Persists `"true"/"false"` published status across `/form` -> `/view` navigation |
| `sessionStorage` | `contexthub_user_orcid` | Cached ContextHub user ORCID |
| `sessionStorage` | `contexthub_user_name` | Cached ContextHub user display name |
| `sessionStorage` | `contexthub_orcid_verified` | `"true"/"false"` verified flag |
| `sessionStorage` | `dataUrl` | Non-inline `dataUrl` for REST `POST` back to ContextHub |
| `localStorage` | `cat_catalogue_writer_lang` | Persisted UI language (`"eng"` or `"fra"`) |

---

## 8. Testing, CI/CD & Deployment

### Automated Tests (7 Suites, 23 Tests)

Run with `npm test -- --watchAll=false`:

| Test File | What It Verifies |
|---|---|
| `src/App.test.js` | HomePage smoke render (schema selector, Quick Links, upload dropzone) |
| `src/utils/coreUtils.test.js` | Flatten/unflatten round-trip, nested `instanceCounts`, sibling dependency expansion, captureBase-scoped regex & page lookup, Boolean `false` validation, origin/URL allowlist, slug resolution |
| `src/utils/orcidUtils.test.js` | Solr sanitization, `edismax` query builder, response normalization, broad-match fallback, HTTP errors |
| `src/utils/schemaMigration.test.js` | Matching field migration, obsolete key stripping into `unmappedFields`, missing required field detection |
| `src/pages/FormPage.prefill.test.jsx` | Embedded `dataUrl` & `SET_RECORD` prefill under `React.StrictMode`, single schema commit, unchanged-edit button disable/re-enable |
| `src/components/Stateful/DynamicFormComponents/FormInputSingle.multiCategory.test.jsx` | `parseCategoryOption` with nested parentheses, `<= 15` checkbox vs `> 15` Autocomplete threshold, chip compaction, read-only labels, single description render |
| `src/components/Stateful/DynamicFormComponents/OrcidSearchDialog.test.jsx` | Live search results rendering, duplicate flagging, portal form isolation, selection callback |

> **Note:** In Jest, `__SCHEMA_INDEX__` is not injected by webpack, so `schemaRegistry.js` automatically falls back to `FALLBACK_SCHEMA_INDEX`. Also note `FormPage.prefill.test.jsx` reads `public/schemas/hidden/dataset_catalogue_record_OCA_package.json` directly from disk.

### CI/CD & Azure Static Web Apps

- **Workflow:** `.github/workflows/azure-static-web-apps-zealous-mud-0d3297f0f.yml`
- **Triggers:** Push and Pull Requests targeting `main`.
- **Behavior:** Builds the React app from `/` (`output_location: "build"`) and deploys via `Azure/static-web-apps-deploy@v1` using GitHub OIDC (`id-token: write`) + secret `AZURE_STATIC_WEB_APPS_API_TOKEN_ADCCATALOGWRITERTESTING`. PRs get preview environments that tear down on close.
- **Branch convention:** Development work is typically merged into `develop`, then PR'd into `main` to trigger production deployment.

---

## 9. Known Repository Quirks & Gotchas

Keep these historical quirks in mind so they never catch you off guard:

1. **`Basic DMP` visible vs. hidden manifest mismatch:** `public/schemas/Basic_OCA_package.json` (`EA5-t0o...`) is marked `status: "deprecated"` (v1.0.0) in `KNOWN_SCHEMA_MANIFEST`, while `public/schemas/hidden/Basic_DMP_OCA_package_v6.json` (`EOuPm5G...`) is marked `status: "active"` (v6.0.0). If promoting v6 to visible, move the files to match `KNOWN_SCHEMA_MANIFEST` and `FALLBACK_SCHEMA_INDEX`.
2. **`OpenAIRE` duplicate SAID:** Both `public/schemas/OpenAIRE_OCA_package.json` and `public/schemas/hidden/OpenAIRE_OCA_package_Original.json` share the SAID `ELFQbADu3w__7hDbaF6iY_1nOa68LgJWmqf3B_dTV0e5`. The visible bundle wins because `allParsedSchemas` concatenates `[...visibleSchemas, ...hiddenSchemas]`.
3. **`DataCite` placeholder SAID:** `public/schemas/hidden/DataCite_OCA_package.json` has `"d": "####digest_of_oca_datacite_package####"` (unfinished/experimental schema kept hidden).
4. **Legacy `"contribitor"` typo fallback:** `src/utils/normalizeJson.js` includes a deliberate compatibility fallback mapping `"contribitor"` -> `"contributor"` for older records created against an earlier schema typo. Do not remove unless confirmed no legacy records rely on it.
5. **Inactive workflow file in `src/utils/update-schema-addition.yml`:** This GitHub Actions YAML sits in `src/utils/`, not `.github/workflows/`, so GitHub does not execute it.
6. **Empty `state/` directory:** An empty folder at the repo root (unused by runtime code).
7. **Dataset schema special-casing in `ViewPage.jsx`:** Any schema whose name includes `"dataset"` (case-insensitive) skips `normalizeVersion()` on `resourceVersion`, omits the `v` prefix on the Resource Version chip, and mirrors `semVer` into top-level `datasetVersion` and `version` on export.
8. **Restart dev server after schema file changes:** Adding, renaming, moving, or deleting JSON files in `public/schemas/` will not update `__SCHEMA_INDEX__` until `npm start` is restarted.
