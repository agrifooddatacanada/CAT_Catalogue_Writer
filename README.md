# CAT Catalogue Writer

A React + Redux web application for creating, editing, viewing, upgrading, and exporting standards-compliant JSON-LD catalogue records driven by Overlays Capture Architecture (OCA) schema packages.

## Key Capabilities

- **Dynamic OCA Form Rendering**: Generates multi-page and sectioned metadata forms directly from untouched schema bundles in `public/schemas/` (and historical versions in `public/schemas/hidden/`).
- **Lazy Schema Loading**: Build-time indexing (`config-overrides.js`) keeps the initial JS bundle small while fetching each schema JSON on demand from `/schemas/`.
- **SAID Canonicalization & Revision Lineage**: Deterministically canonicalizes records and computes Self-Addressing Identifiers (SAIDs) via `saidify`, preserving `dcterms:isVersionOf`, `dcterms:version`, and `adms:versionNotes`.
- **Schema Plugin Upgrade Flow**: Detects outdated `@schema_id` records and migrates matching fields into the latest schema version while listing unmapped and missing required fields.
- **ORCID Registry Search & Verified ContextHub ORCID**: Supports direct ORCID Public API v3.0 search, name lookup, duplicate contributor detection, and ContextHub verified ORCID prefill.
- **ContextHub Integration**: Works standalone or embedded inside an allowlisted iframe/popup (`postMessage` + `dataUrl` deep-linking).
- **Bilingual (EN / FR)**: Full English and French UI translations plus dynamic OCA language overlay extraction.

## Scripts

```bash
npm start          # Start local dev server (http://localhost:3000)
npm test           # Run Jest unit tests
npm run build      # Create optimized production build in build/
```

## Architecture Overview

- `public/schemas/` — OCA schema bundles (never modified by app logic).
- `src/pages/` — `HomePage`, `FormPage`, `ViewPage`, `FormHelpPage`, `ViewHelpPage`, `NotFoundPage`.
- `src/components/Stateful/` — `DynamicForm`, `FormSidebar`, `UploadButton`, `LanguageSelector`, and `DynamicFormComponents/*`.
- `src/store/` — Redux Toolkit slices (`fieldSchema`, `formValues`, `instanceCounts`, `mode`, `uploadFile`, `formUi`, `activePage`, `childFormNavigation`, `userContext`) and memoized selectors.
- `src/utils/` — Schema registry/loading, attribute/page extraction, flattening/unflattening, validation, migration, ORCID helpers, and `postMessage` origin security.
