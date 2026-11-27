# AGENTS.md — CAT Catalogue Writer Context Spec

Compact engineering reference for AI coding agents working in `CAT_Catalogue_Writer` (`agrifooddatacanada/CAT_Catalogue_Writer`). For full human prose see `docs/DEVELOPER_GUIDE.md` and `docs/OPERATIONS_AND_USER_GUIDE.md`.

## 1. Purpose & Stack
Client-side React 19 SPA that dynamically renders multi-page metadata forms from untouched **OCA (Overlays Capture Architecture)** JSON packages (`public/schemas/`), validates/migrates records, integrates live ORCID v3.0 search, and exports canonicalized **JSON-LD (`dcat:CatalogRecord`)** files with cryptographic **SAIDs** (`saidifyUrn`). Runs standalone or embedded inside **ContextHub** (iframe, popup `window.opener`, or `?dataUrl=` deep-link).

- **Stack:** React 19.2, CRA (`react-scripts` 5) + `react-app-rewired` (`config-overrides.js`), Redux Toolkit 2.11, React Router 7, MUI v7 + `@mui/x-date-pickers` v8 (`date-fns` v4), `saidify` 1.1, Jest + RTL. Hosting: Azure Static Web Apps (`staticwebapp.config.json`).
- **Commands:** `npm start` | `npm test -- --watchAll=false` | `npm run build`
- **`.npmrc`:** `save-exact=true`, `ignore-scripts=true`.
- **Build quirk (`config-overrides.js`):** Injects Node polyfills (`process`, `Buffer`, `zlib`, `stream`, `util`, `assert`), `webpack-dev-server` v4.15 `setupMiddlewares` shim, Jest `react-router`/`date-fns` config, and build-time global `__SCHEMA_INDEX__` (scanned from `public/schemas/*.json` & `public/schemas/hidden/*.json`). **Adding/moving/deleting schema JSON files requires restarting `npm start` / re-running `npm run build`.**

## 2. Hard Invariants (Never Violate)
1. **Never edit OCA schema JSON internals** in `public/schemas/` or `public/schemas/hidden/` — breaks package SAID `d`; adapt parser/UI code instead.
2. **4-point schema sync:** Whenever adding, upgrading, hiding, or deleting a schema, keep ALL 4 in sync:
   - `public/schemas/*.json` (visible) / `public/schemas/hidden/*.json` (archived)
   - `KNOWN_SCHEMA_MANIFEST` in `src/utils/schemaRegistry.js` (only **one** `status: "active"` per `family`)
   - `FALLBACK_SCHEMA_INDEX` in `src/utils/schemaRegistry.js` (used by Jest when `__SCHEMA_INDEX__` is undefined)
   - `SCHEMA_CONTEXT_MAP` in `src/utils/schemaMapping.js` (`meta[0].name` -> JSON-LD `@context`)
3. **2-point ContextHub origin sync:** Any new ContextHub host origin MUST be added to **both**:
   - `staticwebapp.config.json` -> `globalHeaders["Content-Security-Policy"]` -> `frame-ancestors`
   - `src/utils/postMessageSecurity.js` -> `EXACT_ALLOWED_ORIGINS` / `isAllowedOrigin()`
4. **Dot escaping (`src/utils/pathEncoding.js`):** Literal `.` in schema attribute names (e.g., `dcterms.title`) is encoded as `DOT_TOKEN = "___$dot$___"` in Redux paths and field names, and unescaped via `unescapeKey()` on export/migration.
5. **Boolean `false` is valid:** Never treat `!value` as empty for required/validation/non-empty checks (`typeof val === "boolean"` is always non-empty).
6. **Dependency isolation:**
   - `extractAttributes.js` MUST pass a **per-branch `new Set(visitedRefs)`** so sibling fields referencing the same dependency both expand.
   - `depFormatPatterns` stores `${captureBaseDigest}::${escapedAttr}` first (plus bare fallback); `validationUtils.js` MUST check scoped key before root/bare keys.
   - `extractPages.js` MUST resolve fields matching `captureBaseDigest` before fallback so nested `id`/`title` fields never shadow root fields.
7. **`FormPage` StrictMode & prefill safety:** The auto-load `useEffect` in `src/pages/FormPage.jsx` MUST NOT list `fields` in its dependency array (uses `latestFieldsRef`, `pendingRecordRef`, `lastAppliedRecordJsonRef`). `loadSchemaIntoStore` MUST honor `shouldCommit: () => !cancelled`.
8. **Outbound `CATALOGUE_RECORD` security:** `ViewPage.jsx` MUST call `safePostMessage(..., { allowWildcardFallback: false })` when sending records; only `REQUEST_USER_CONTEXT`/`REQUEST_RECORD` handshakes permit `allowWildcardFallback: true`.
9. **Bilingual parity:** Changing `lang` (`"eng"|"fra"`) MUST preserve `formValues` (`loadSchemaIntoStore(..., { preserveUiState: true })`). Add any new UI key to **both** `src/utils/OpenAIRE/translations/eng.json` and `fra.json`.

## 3. Codebase Map
| Area | Key Files & Exact Responsibilities |
|---|---|
| Entry / Routes | `src/index.js` (`StrictMode` + Redux), `src/App.js` (MUI theme `#E5B000`, `ErrorBoundary`, `TranslationProvider`, `NotificationProvider`, global `postMessage` buffer, routes: `/`, `/form`, `/form/:schemaSlug`, `/view`, `/form-help`, `/view-help`, `*`) |
| Pages | `HomePage.jsx` (schema picker, 10 MB `.json` dropzone, `@schema_id` auto-detect, outdated upgrade trigger, `?dataUrl=&schema=` auto-load); `FormPage.jsx` (sidebar dock/drawer, ContextHub prefill/upgrade/clear, upgrade banner, `beforeunload` guard); `ViewPage.jsx` (read-only `DynamicForm`, lineage/notes panel, `generateCatalogueRecord()` -> `canonicalize` + `saidifyUrn`, download, `postMessage` or REST `POST`) |
| Form Engine | `DynamicForm.jsx` (schema pages vs 6/page flat pagination, child-form session stack, validation summary chips, unchanged-edit submit block); `FormSidebar.jsx` (M/R/C pills, active-path child tree, section check/issue badges, discard confirm); `FieldChecker.jsx` (dispatches field shape & registers `childPages` meta) |
| Inputs | `FormInputSingle.jsx` (single `Select`, multi-category `<=15` Checkboxes / `>15` searchable `Autocomplete` [`MULTI_CATEGORY_SEARCH_THRESHOLD=15`], `Boolean` Radio, `DateTime` `DatePicker` [`placeholder==="YYYY"` -> year-only], `TextareaAutosize` + `maxLength` + ORCID banner/lookup/search); `FormInputMultiple.jsx` (repeatable primitives + index compaction); `FormInputMultipleChildren.jsx` (composite card grid + delete shift/recount + duplicate ORCID chip); `NestedChildFormContent.jsx` (sub-form editor with mount snapshot & cancel rollback); `OrcidSearchDialog.jsx` (native `<dialog>` portal -> `pub.orcid.org/v3.0/expanded-search`) |
| Redux Store (`src/store/`) | 9 slices: `fieldSchema` (`fields`, O(1) `fieldsByPath`, `pages`, `childPages`, serialized regexes, `loadedSchemaMeta`), `formValues` (`formState` flat map, `initialFormState` snapshot), `instanceCounts` (lengths for every nested array path), `mode` (`write\|edit\|view`), `uploadFile` (upload flag, `originalSaid`, `recordVersion`, `isVersionOf`, `versionNotes`, `schemaId`, `isPublished`, upgrade context), `formUi` (`viewMode`, `currentPage`, `fieldsPerPage:6`), `activePage` (`index`), `childFormNavigation` (linked-list `previous` stack), `userContext` (`orcid`, `name`, `orcidVerified`, `isContextHub`) |
| Selectors | `formSelectors.js` (O(1) value/field/count lookups, `makeSelectFormValueByPrefix`, `selectHasFormChanges` ignoring envelope/system keys); `popupValidationSelectors.js` (`makeSelectIsPopupValid`, `selectIsRootFormValid`, `selectValidationSummary`) |
| Schema & Data Utils | `schemaRegistry.js` (manifest, fallback index, `resolveSchemaEntry`, lazy `fetch` cache, SemVer, outdated/latest lookup); `schemaMapping.js` (`@context` map); `loadSchemaIntoStore.js`; `extractAttributes.js`; `extractPages.js`; `enrichFieldsWithPaths.js`; `fieldTreeUtils.js`; `normalizeJson.js` (nested dotted keys + legacy `contribitor` fallback + array wrap); `formStateFlatten.js` (flatten/unflatten); `instanceCounts.js`; `schemaMigration.js` (`migrateRecordToSchema`); `canonicalize.js`; `validationUtils.js`; `viewModeUtils.js`; `orcidUtils.js` |
| Security & Iframe | `postMessageSecurity.js` (origin allowlist, `safePostMessage`, `isSafeDataUrl`, safe storage); `iframeUtils.js` (`checkIsIframe`) |

## 4. Data & Rendering Pipeline
1. **Load schema:** `loadSchemaIntoStore` -> lazy `fetch(/schemas/...)` -> `extractAttributes` (resolves `refs:`, escapes `.`, extracts localized labels/entries/formats/conformance/cardinality) -> `enrichFieldsWithPaths` -> `extractPages` (root `depth:0`, deps `depth:1..N`) -> dispatch `fieldSchema` (`setFields` builds `fieldsByPath`).
2. **Load record:** `normalizeNestedFields` (or `migrateRecordToSchema` on upgrade, which strips unmapped keys into `unmappedFields` and collects `missingRequiredFields`) -> `flattenFormData` -> `setInitialFormState` + `setAllInstanceCounts(buildInstanceCountsFromValues)`.
3. **Render field (`FieldChecker`):**
   - `children.length > 0` -> `FormInputMultipleChildren` -> opens `NestedChildFormContent` (schema child page matched via `findLinkedChildPageIndex`, or generated page)
   - `multiple && categories` -> `FormInputSingle` (`<=15` Checkboxes, `>15` MUI `Autocomplete` storing codes)
   - `multiple` -> `FormInputMultiple` (indexed `path[0]`, `path[1]`, ...)
   - leaf -> `FormInputSingle` (`Select` | `Boolean` Radio | `DatePicker` | `TextareaAutosize` + ORCID tools if `isQualifiedAttributionOrcidField`)
4. **Export (`ViewPage.generateCatalogueRecord`):** `unflattenFormData` -> strip envelope keys -> `canonicalize` -> inject `dcterms.{version, modified, isVersionOf (if isPublished), "adms:versionNotes"}` -> resolve `@context` + `injectDcatNamespace` -> attach `@type: "dcat:CatalogRecord"`, `@schema_id`, `@schema_version`, `d: ""` -> `saidifyUrn(..., "d")`.
   - *Dataset special-case (`schema` contains `"dataset"`):* skips `normalizeVersion`, omits `v` prefix on version chip, mirrors `semVer` to top-level `datasetVersion` & `version`.

## 5. ContextHub Integration Contract
- **Allowlisted Origins:** `self`, `http(s)://localhost:*`, `http(s)://127.0.0.1:*`, `https://[*.]semanticengine.org`, `https://csdcc.datacontexthub.org`, `https://contexthub-dev.climatesmartagrifood.ca`.
- **Iframe detection (`checkIsIframe`):** `?iframe=true` OR `window.self !== window.top`. Hides logos, Home button, `Footer`, and `beforeunload` prompt; enables `ViewPage` `postMessage` submit button.
- **URL Params:** `schema` (or `:schemaSlug`), `iframe=true`, `mode=write|edit|upgrade`, `lang|language=en|eng|fr|fra`, `dataUrl` (checked by `isSafeDataUrl`; `https:`, `http://localhost`, `/`, or `data:application/json`), `isPublished|published=true|false`, `version`, `sourceSchemaId`, `targetSchemaId`, `buttonLabel`, `userOrcid`, `userName`, `orcidVerified=true`.
- **Outbound `postMessage` (to `window.parent` or `window.opener`):**
  - On mount: `{ type: "REQUEST_USER_CONTEXT" }`, `{ type: "REQUEST_RECORD" }` (`allowWildcardFallback: true`).
  - On submit (`ViewPage`): `{ type: "CATALOGUE_RECORD", record, isUpgrade, sourceSchemaId, targetSchemaId }` (`allowWildcardFallback: false`; falls back to `.json` download if undelivered; closes `window.opener` popup on success).
- **Inbound `postMessage` (allowlisted origins only):**
  - `SET_USER_CONTEXT`: `{ type, user|payload: { orcid, name|displayName, orcidVerified } }`
  - `SET_LANGUAGE` (or any message with `.lang`/`.language`): updates `TranslationContext` & re-localizes schema
  - `CLEAR_RECORD`: wipes `contexthub_pending_*` storage & resets `FormPage` to clean `"write"` mode
  - `SET_RECORD` (aliases: `LOAD_RECORD`, `SET_DATA`, `SET_CATALOGUE_RECORD`, `IMPORT_RECORD`, `PREFILL_RECORD`, `PREFILL`, `action:"LOAD_RECORD"`): `{ record|data|payload, isPublished?, version?, upgrade?, sourceSchemaId?, targetSchemaId? }`
  - `UPGRADE_RECORD` (or `upgrade: true`): same payload -> triggers `migrateRecordToSchema`
- **Standalone REST `POST`:** When `!isIframeMode && !buttonLabelParam` and `sessionStorage["dataUrl"]` is a non-`data:` safe URL, `ViewPage` shows **Update ContextHub** which HTTP `POST`s the SAIDified JSON-LD to `dataUrl`.
- **Storage keys:** `sessionStorage`: `contexthub_pending_record`, `contexthub_pending_upgrade`, `contexthub_is_published`, `contexthub_user_orcid`, `contexthub_user_name`, `contexthub_orcid_verified`, `dataUrl`. `localStorage`: `cat_catalogue_writer_lang`.

## 6. Schema Lifecycle Cheat Sheet
- **Add new schema:** Drop untouched JSON in `public/schemas/` -> add `active` entry to `KNOWN_SCHEMA_MANIFEST` + `FALLBACK_SCHEMA_INDEX.visible` (`schemaRegistry.js`) -> add `@context` to `SCHEMA_CONTEXT_MAP` (`schemaMapping.js`) -> restart dev server -> test.
- **Add new version:** Move old JSON to `public/schemas/hidden/` -> place new JSON in `public/schemas/` -> mark old SAID `status: "deprecated"` & add new SAID with same `family`, bumped SemVer, `isVersionOf: "<oldSaid>"`, `status: "active"` in `KNOWN_SCHEMA_MANIFEST` -> update `FALLBACK_SCHEMA_INDEX` (`visible` & `hidden`) -> restart & test upgrade flow.
- **Hide/Retire (keep old records working):** Move to `public/schemas/hidden/` + move entry in `FALLBACK_SCHEMA_INDEX` to `.hidden`; keep in `KNOWN_SCHEMA_MANIFEST` & `SCHEMA_CONTEXT_MAP`.
- **Delete permanently:** Remove `.json`, `KNOWN_SCHEMA_MANIFEST`, `FALLBACK_SCHEMA_INDEX`, and (if last version) `SCHEMA_CONTEXT_MAP`. Check `FormPage.prefill.test.jsx` (reads `hidden/dataset_catalogue_record_OCA_package.json`).

**Active ContextHub Schemas (`public/schemas/`):**
`ContextHub_dataset_catalogue_record` (`EMEb1rkdFU80zKjzCKVrRe8V69m8HTm1brZV7v8BbAJ5`), `ContextHub_project_catalogue_record` (`EE4QpFQwDzOP1xjn9iffzZm5Wx1RlybSeU7RKIFsGkTs`), `ContextHub_questionnaire_catalogue_record` (`ELj685L9fDdQUFJV-5EffI1sUMrYu2j1jKOhy8u3SXi8`), `ContextHub_sample_catalogue_record` (`EBnRcfUjeyJ_U8RHxfYuhlo7PokXxzpqsT5djkSHE_vh`), `ContextHub_schema_catalogue_record` (`EPfNmX2yI8Ctn_HxVzqTwZyzVkP_whK2kOtJPeYWD3pT`, v1.0.0; deprecated v0.1.0 `EKXaGk0pzYY8hMX0uAzyU3gOTPw1saFN-IPzgHWw7I1I` in `hidden/`).

## 7. Known Quirks
- `Basic DMP`: `public/schemas/Basic_OCA_package.json` (`EA5-t0o...`) is marked `deprecated` v1.0.0 in `KNOWN_SCHEMA_MANIFEST`, while `hidden/Basic_DMP_OCA_package_v6.json` (`EOuPm5G...`) is marked `active` v6.0.0.
- `OpenAIRE`: `public/schemas/OpenAIRE_OCA_package.json` and `hidden/OpenAIRE_OCA_package_Original.json` share SAID `ELFQbADu3w...` (visible wins).
- `DataCite` (`hidden/DataCite_OCA_package.json`) uses placeholder SAID `####digest_of_oca_datacite_package####`.
- `src/utils/update-schema-addition.yml` is outside `.github/workflows/` (inactive). Root `state/` directory is empty/unused.
- `normalizeJson.js` intentionally retains a legacy `"contribitor"` -> `"contributor"` fallback.
