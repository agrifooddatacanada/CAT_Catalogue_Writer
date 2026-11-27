# CAT Catalogue Writer

A React + Redux web application for creating, editing, viewing, upgrading, and exporting standards-compliant JSON-LD (`dcat:CatalogRecord`) catalogue records driven by **Overlays Capture Architecture (OCA)** schema packages. Runs standalone or embedded inside **ContextHub**.

## Documentation

| Document | Audience | What It Covers |
|---|---|---|
| **[Developer Onboarding & Architecture Guide](./docs/DEVELOPER_GUIDE.md)** | New & returning developers | End-to-end codebase walkthrough, OCA bundle anatomy, lazy schema loading, Redux store (9 slices), form engine, ORCID search, SAID export/lineage, schema upgrades, ContextHub integration contract, tests, deployment, and known quirks. |
| **[Operations Runbook & User Guide](./docs/OPERATIONS_AND_USER_GUIDE.md)** | Maintainers & end users | **Part 1:** Step-by-step runbooks for adding schemas, releasing new schema versions, hiding/removing schemas, managing ContextHub origins & `postMessage` integration, EN/FR translations, and deployment.<br>**Part 2:** End-user guide for creating, editing, upgrading, and exporting records standalone or inside ContextHub. |
| **[AI Assistant Context Spec](./AGENTS.md)** | AI coding tools & assistants | Compact, low-context technical specification covering stack, hard invariants, codebase map, Redux contract, ContextHub protocol, schema lifecycle cheat sheet, and repo quirks. |

## Key Capabilities

- **Dynamic OCA Form Rendering**: Generates multi-page and sectioned metadata forms directly from untouched schema bundles in `public/schemas/` (and historical versions in `public/schemas/hidden/`).
- **Lazy Schema Loading**: Build-time indexing (`config-overrides.js`) keeps the initial JS bundle small while fetching each schema JSON on demand from `/schemas/`.
- **SAID Canonicalization & Revision Lineage**: Deterministically canonicalizes records and computes Self-Addressing Identifiers (SAIDs) via `saidify`, preserving `dcterms:isVersionOf`, `dcterms:version`, and `adms:versionNotes`.
- **Schema Plugin Upgrade Flow**: Detects outdated `@schema_id` records and migrates matching fields into the latest schema version while listing unmapped and missing required fields.
- **ORCID Registry Search & Verified ContextHub ORCID**: Supports direct ORCID Public API v3.0 search, name lookup, duplicate contributor detection, and ContextHub verified ORCID prefill.
- **ContextHub Integration**: Works standalone or embedded inside an allowlisted iframe/popup (`postMessage` + `dataUrl` deep-linking).
- **Bilingual (EN / FR)**: Full English and French UI translations plus dynamic OCA language overlay extraction without losing entered form values.

## Quick Start & Scripts

```bash
npm ci                         # Install pinned dependencies (see .npmrc)
npm start                      # Start local dev server (http://localhost:3000)
npm test -- --watchAll=false   # Run Jest unit & integration tests
npm run build                  # Create optimized production build in build/
```

> **Note:** Schema discovery runs at webpack startup/build time in `config-overrides.js`. After adding, moving, renaming, or removing files in `public/schemas/`, restart `npm start` (or re-run `npm run build`).

## Repository Overview

- `public/schemas/` — Active/visible OCA schema bundles (never modified by app logic); archived/historical versions live in `public/schemas/hidden/`.
- `src/pages/` — `HomePage`, `FormPage`, `ViewPage`, `FormHelpPage`, `ViewHelpPage`, `NotFoundPage`.
- `src/components/Stateful/` — `DynamicForm`, `FormSidebar`, `UploadButton`, `LanguageSelector`, and `DynamicFormComponents/*` (including `OrcidSearchDialog`).
- `src/store/` — Redux Toolkit slices (`fieldSchema`, `formValues`, `instanceCounts`, `mode`, `uploadFile`, `formUi`, `activePage`, `childFormNavigation`, `userContext`) and memoized selectors.
- `src/utils/` — Schema registry/loading, attribute/page extraction, flattening/unflattening, validation, migration, ORCID helpers, EN/FR translations, and `postMessage` origin security.
- `docs/` & `AGENTS.md` — Developer onboarding guide, operations/user guide, and compact AI assistant spec.
- `Output_Examples/` — Sample exported JSON-LD catalogue records and use-case READMEs.
- `staticwebapp.config.json` & `.github/workflows/` — Azure Static Web Apps routing, CSP `frame-ancestors`, and CI/CD deployment on `main`.
