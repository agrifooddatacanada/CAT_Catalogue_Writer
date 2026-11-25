/* global __SCHEMA_INDEX__ */
/**
 * Schema Registry for CAT Catalogue Writer
 *
 * Manages multi-version Schema Plugins, Schema Families, and historical SAID mappings.
 * Supports Semantic Versioning (SemVer) starting from 0.1.0 (development/drafts)
 * through 1.0.0+ (production releases).
 *
 * Schema JSON payloads are fetched lazily on demand from /schemas/ rather than
 * eagerly bundled into the initial JS chunk.
 */

// Regular expression supporting SemVer starting from 0.1.0+ (and 0.0.x if needed)
export const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Validates whether a version string conforms to SemVer (allowing versions >= 0.1.0).
 * @param {string} version - e.g. "0.1.0", "1.0.0", "1.2.3-beta"
 * @returns {boolean}
 */
export const isValidSemVer = (version) => {
  if (!version || typeof version !== "string") return false;
  const cleaned = version.trim().replace(/^v/i, "");
  return SEMVER_REGEX.test(cleaned);
};

/**
 * Normalizes loose version strings (e.g., "v1", "0.1", "1.0") to full 3-part SemVer.
 * @param {string} version
 * @param {string} defaultVersion - Fallback version if invalid (default "1.0.0")
 * @returns {string} - e.g. "0.1.0", "1.0.0"
 */
export const normalizeVersion = (version, defaultVersion = "1.0.0") => {
  if (!version) return defaultVersion;
  const clean = String(version).trim().replace(/^v/i, "");
  if (SEMVER_REGEX.test(clean)) return clean;
  if (/^(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(clean)) {
    return `${clean}.0`;
  }
  if (/^(0|[1-9]\d*)$/.test(clean)) {
    return `${clean}.0.0`;
  }
  return defaultVersion;
};

/**
 * Compares two SemVer strings numerically.
 * @param {string} vA
 * @param {string} vB
 * @returns {number} - negative if vA < vB, positive if vA > vB, 0 if equal
 */
export const compareSemVer = (vA, vB) => {
  const normA = normalizeVersion(vA);
  const normB = normalizeVersion(vB);
  const partsA = normA.split(/[-+]/)[0].split(".").map(Number);
  const partsB = normB.split(/[-+]/)[0].split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/**
 * Increments a SemVer string by type: 'patch', 'minor', or 'major'.
 * @param {string} version - Current version
 * @param {'patch'|'minor'|'major'} releaseType
 * @returns {string} Incremented version
 */
export const incrementVersion = (version, releaseType = "patch") => {
  const norm = normalizeVersion(version, "1.0.0");
  const [major, minor, patch] = norm.split(/[-+]/)[0].split(".").map(Number);
  switch (releaseType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
};

/**
 * Known metadata overrides for historical schemas and explicit lineage.
 */
export const KNOWN_SCHEMA_MANIFEST = {
  "EHyGYfN7TNAUsfG9cpvC1uqC-RfahoO6TdaYtYw1cH4R": {
    family: "Project description",
    version: "1.0.0",
    status: "deprecated",
  },
  "EEWsnDGmkD53-TbApvjmMW-gRurySkBaX_fPN_BrPGna": {
    family: "Project description",
    version: "2.0.0",
    isVersionOf: "EHyGYfN7TNAUsfG9cpvC1uqC-RfahoO6TdaYtYw1cH4R",
    status: "active",
  },
  "EBVqlR0bOCzF0TU8hGyf0Zgza9Zk5PDmFTJ4r5rOvdLw": {
    family: "Project description",
    version: "0.1.0",
    status: "deprecated",
  },
  "EKXaGk0pzYY8hMX0uAzyU3gOTPw1saFN-IPzgHWw7I1I": {
    family: "ContextHub_schema_catalogue_record",
    version: "1.0.0",
    status: "active",
  },
  "EA5-t0oGau19k-wmR4-WsxD44ed6-WpUQUC26ztoTta3": {
    family: "Basic DMP",
    version: "1.0.0",
    status: "deprecated",
  },
  "EOuPm5G8zb5M2RrIa87yHEwhWqWJdHb8GmfC4eRpi-E2": {
    family: "Basic DMP",
    version: "6.0.0",
    isVersionOf: "EA5-t0oGau19k-wmR4-WsxD44ed6-WpUQUC26ztoTta3",
    status: "active",
  },
  "EE4QpFQwDzOP1xjn9iffzZm5Wx1RlybSeU7RKIFsGkTs": {
    family: "ContextHub_project_catalogue_record",
    version: "1.0.0",
    status: "active",
  },
  "EEN8xyuq_v4jFlbxwhDvm5UqFMGvqDq6VVPbvOp91LoK": {
    family: "ContextHub_dataset_catalogue_record",
    version: "1.0.0",
    status: "active",
  },
  "ELj685L9fDdQUFJV-5EffI1sUMrYu2j1jKOhy8u3SXi8": {
    family: "ContextHub_questionnaire_catalogue_record",
    version: "1.0.0",
    status: "active",
  },
  "ED7BjGJlzWOIBFuInwEtOH0-a7ZDHTUejbK17NJKgPc7": {
    family: "dataset_catalogue_record",
    version: "1.0.0",
    status: "active",
  },
  "EAMDDRFBhdGg8OcfgzMFLFq5DT6LbroGkc-zM6iKnsuc": {
    family: "schema_catalogue_record",
    version: "1.0.0",
    status: "active",
  },
  "EJ4icsxrpbxRHy0Eo_zHMB9_kTkrZ4hmT7r4CKLtL41_": {
    family: "Dublin_Core_Project",
    version: "1.0.0",
    status: "active",
  },
  "EDqM_wwgWgRrEd609T9X8wTasxpp1e_QJYmdBxFVRoii": {
    family: "Dublin_Core_Repository",
    version: "1.0.0",
    status: "active",
  },
  "ELFQbADu3w__7hDbaF6iY_1nOa68LgJWmqf3B_dTV0e5": {
    family: "OpenAIRE Application Profile Parent",
    version: "1.0.0",
    status: "active",
  },
  "EFyyq7pbgewSwaeAZlBKl4Zk2nciNTfB2CpnEjphcnQ8": {
    family: "cataloguerecord_DCAT.top",
    version: "1.0.0",
    status: "active",
  },
};

/**
 * Checks whether a schema plugin SAID has become outdated because a newer version exists.
 * @param {string} said - Schema plugin SAID (from @schema_id)
 */
export const getSchemaPluginOutdatedStatus = (said) => {
  if (!said) return { isOutdated: false };
  const item = KNOWN_SCHEMA_MANIFEST[said];
  if (!item) return { isOutdated: false };

  const familyEntries = Object.entries(KNOWN_SCHEMA_MANIFEST).filter(
    ([, meta]) => meta.family === item.family
  );

  const activeEntry =
    familyEntries.find(([, meta]) => meta.status === "active") ||
    familyEntries[0];

  if (!activeEntry) {
    return {
      isOutdated: false,
      currentVersion: item.version,
      family: item.family,
    };
  }

  const [activeSaid, activeMeta] = activeEntry;
  const isOutdated = item.status === "deprecated" || activeSaid !== said;

  return {
    isOutdated,
    currentVersion: item.version,
    latestVersion: activeMeta.version,
    family: item.family,
    latestSaid: activeSaid,
  };
};

// Fallback index used in non-webpack test environments (Jest) when __SCHEMA_INDEX__ is not injected
const FALLBACK_SCHEMA_INDEX = {
  visible: [
    { name: "Basic DMP", said: "EA5-t0oGau19k-wmR4-WsxD44ed6-WpUQUC26ztoTta3", filePath: "./schemas/Basic_OCA_package.json" },
    { name: "cataloguerecord_DCAT.top", said: "EFyyq7pbgewSwaeAZlBKl4Zk2nciNTfB2CpnEjphcnQ8", filePath: "./schemas/cataloguerecord_DCAT.top_OCA_package.json" },
    { name: "ContextHub_project_catalogue_record", said: "EE4QpFQwDzOP1xjn9iffzZm5Wx1RlybSeU7RKIFsGkTs", filePath: "./schemas/ContextHub_project_catalogue_record_OCA_package.json" },
    { name: "ContextHub_questionnaire_catalogue_record", said: "ELj685L9fDdQUFJV-5EffI1sUMrYu2j1jKOhy8u3SXi8", filePath: "./schemas/ContextHub_questionnaire_catalogue_record_OCA_package.json" },
    { name: "ContextHub_schema_catalogue_record", said: "EKXaGk0pzYY8hMX0uAzyU3gOTPw1saFN-IPzgHWw7I1I", filePath: "./schemas/ContextHub_schema_catalogue_record_OCA_package.json" },
    { name: "Dublin_Core_Project", said: "EJ4icsxrpbxRHy0Eo_zHMB9_kTkrZ4hmT7r4CKLtL41_", filePath: "./schemas/Dublin_Core_Project_OCA_package.json" },
    { name: "Dublin_Core_Repository", said: "EDqM_wwgWgRrEd609T9X8wTasxpp1e_QJYmdBxFVRoii", filePath: "./schemas/Dublin_Core_Repository_OCA_package.json" },
    { name: "OpenAIRE Application Profile Parent", said: "ELFQbADu3w__7hDbaF6iY_1nOa68LgJWmqf3B_dTV0e5", filePath: "./schemas/OpenAIRE_OCA_package.json" },
    { name: "Project description", said: "EEWsnDGmkD53-TbApvjmMW-gRurySkBaX_fPN_BrPGna", filePath: "./schemas/Project_schema_v2.json" },
    { name: "schema_catalogue_record", said: "EAMDDRFBhdGg8OcfgzMFLFq5DT6LbroGkc-zM6iKnsuc", filePath: "./schemas/schema_catalogue_record_OCA_package.json" },
  ],
  hidden: [
    { name: "Basic DMP", said: "EOuPm5G8zb5M2RrIa87yHEwhWqWJdHb8GmfC4eRpi-E2", filePath: "./schemas/hidden/Basic_DMP_OCA_package_v6.json" },
    { name: "DataCite", said: "####digest_of_oca_datacite_package####", filePath: "./schemas/hidden/DataCite_OCA_package.json" },
    { name: "dataset_catalogue_record", said: "ED7BjGJlzWOIBFuInwEtOH0-a7ZDHTUejbK17NJKgPc7", filePath: "./schemas/hidden/dataset_catalogue_record_OCA_package.json" },
    { name: "OpenAIRE Application Profile Parent", said: "ELFQbADu3w__7hDbaF6iY_1nOa68LgJWmqf3B_dTV0e5", filePath: "./schemas/hidden/OpenAIRE_OCA_package_Original.json" },
    { name: "Project (RAiD\\-inspired)", said: "EOCArfeoEEQCo2HU7zuSAlqEevTxMLgg0-qgcTsp3BIP", filePath: "./schemas/hidden/Project_OCA_package.json" },
    { name: "Project description", said: "EHyGYfN7TNAUsfG9cpvC1uqC-RfahoO6TdaYtYw1cH4R", filePath: "./schemas/hidden/Project_OCA_package.v1.json" },
    { name: "Project description", said: "EBVqlR0bOCzF0TU8hGyf0Zgza9Zk5PDmFTJ4r5rOvdLw", filePath: "./schemas/hidden/Project_RAiD_schema.json" },
    { name: "Data Request Schema", said: "EJ1milH26HLFzEAufIEKJLJ61W-HPFJiY1kz_QtW5wS-", filePath: "./schemas/hidden/q-002-test.json" },
  ],
};

const rawIndex =
  typeof __SCHEMA_INDEX__ !== "undefined" && __SCHEMA_INDEX__
    ? __SCHEMA_INDEX__
    : FALLBACK_SCHEMA_INDEX;

const visibleSchemas = (rawIndex.visible || [])
  .filter((item) => item && item.name && item.said)
  .map((item) => ({ ...item }))
  .sort((a, b) => a.name.localeCompare(b.name));

const hiddenSchemas = (rawIndex.hidden || [])
  .filter((item) => item && item.said)
  .map((item) => ({
    ...item,
    name: item.name || KNOWN_SCHEMA_MANIFEST[item.said]?.family || null,
  }));

const allParsedSchemas = [...visibleSchemas, ...hiddenSchemas];

// In-memory cache of lazily fetched schema JSON bundles keyed by filePath
const schemaJsonCache = new Map();
const pendingSchemaFetches = new Map();

export const slugify = (name) =>
  String(name || "")
    .toLowerCase()
    .trim()
    .replace(/\[|\]/g, "")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Build Route and File maps
const routeMapData = Object.fromEntries(
  visibleSchemas.map((item) => [item.name, `/form/${slugify(item.name)}`])
);

const fileMapData = Object.fromEntries(
  visibleSchemas.map((item) => [item.name, item.filePath])
);

const schemaIdMapData = Object.fromEntries(
  visibleSchemas.filter((item) => item.said).map((item) => [item.name, item.said])
);

const idToSchemaMapData = {};

allParsedSchemas.forEach((item) => {
  if (item.said && item.name) {
    idToSchemaMapData[item.said] = item.name;
  }
});

Object.entries(KNOWN_SCHEMA_MANIFEST).forEach(([said, meta]) => {
  if (!idToSchemaMapData[said] && meta.family) {
    idToSchemaMapData[said] = meta.family;
  }
});

export const SCHEMA_REGISTRY = visibleSchemas;
export const ROUTE_MAP = routeMapData;
export const FILE_MAP = fileMapData;
export const SCHEMA_ID_MAP = schemaIdMapData;
export const ID_TO_SCHEMA_MAP = idToSchemaMapData;

/**
 * Resolves a schema metadata entry by exact name, SAID, or URL slug.
 */
export const resolveSchemaEntry = (schemaNameOrSaidOrSlug) => {
  if (!schemaNameOrSaidOrSlug) return null;
  const query = String(schemaNameOrSaidOrSlug).trim();
  if (!query) return null;

  // 1. Exact name match in visible registry
  const matchByName = visibleSchemas.find((item) => item.name === query);
  if (matchByName) return matchByName;

  // 2. Direct SAID match across all schemas
  const bySaid = allParsedSchemas.find((item) => item.said === query);
  if (bySaid) return bySaid;

  // 3. URL slug match in visible registry (fixes direct /form/:schemaSlug navigation)
  const querySlug = slugify(query);
  const bySlug = visibleSchemas.find((item) => slugify(item.name) === querySlug);
  if (bySlug) return bySlug;

  // 4. Fallback by name or slug in hidden schemas
  const hiddenByName = hiddenSchemas.find(
    (item) => item.name === query || (item.name && slugify(item.name) === querySlug)
  );
  if (hiddenByName) return hiddenByName;

  return null;
};

/**
 * Resolves the canonical schema name from a name, SAID, or URL slug.
 */
export const resolveSchemaName = (schemaNameOrSaidOrSlug) => {
  const entry = resolveSchemaEntry(schemaNameOrSaidOrSlug);
  return entry?.name || schemaNameOrSaidOrSlug || "";
};

/**
 * Lazily fetches and caches a schema JSON file from /schemas/...
 */
async function fetchSchemaJson(filePath) {
  if (!filePath) return null;
  if (schemaJsonCache.has(filePath)) {
    return schemaJsonCache.get(filePath);
  }
  if (pendingSchemaFetches.has(filePath)) {
    return pendingSchemaFetches.get(filePath);
  }

  const normalizedPath = filePath.replace(/^\.\//, "");
  const publicBase = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  const url = `${publicBase}/${normalizedPath}`;

  const fetchPromise = fetch(url)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch schema ${url} (HTTP ${res.status})`);
      }
      const data = await res.json();
      schemaJsonCache.set(filePath, data);
      return data;
    })
    .finally(() => {
      pendingSchemaFetches.delete(filePath);
    });

  pendingSchemaFetches.set(filePath, fetchPromise);
  return fetchPromise;
}

/**
 * Asynchronously loads schema JSON by name, SAID, or URL slug (with caching).
 */
export const loadSchemaJsonByName = async (schemaNameOrSaidOrSlug) => {
  const entry = resolveSchemaEntry(schemaNameOrSaidOrSlug);
  if (!entry) return null;
  return fetchSchemaJson(entry.filePath);
};

/**
 * Asynchronously loads schema JSON directly by SAID (with caching).
 */
export const loadSchemaBySaid = async (said) => {
  if (!said) return null;
  const match = allParsedSchemas.find((item) => item.said === said);
  if (!match) return null;
  return fetchSchemaJson(match.filePath);
};

/**
 * Returns cached schema JSON synchronously if already fetched.
 */
export const getSchemaJsonByName = (schemaNameOrSaid) => {
  const entry = resolveSchemaEntry(schemaNameOrSaid);
  if (!entry) return null;
  return schemaJsonCache.get(entry.filePath) || null;
};

/**
 * Returns cached schema JSON synchronously by SAID if already fetched.
 */
export const getSchemaBySaid = (said) => {
  if (!said) return null;
  const match = allParsedSchemas.find((item) => item.said === said);
  if (!match) return null;
  return schemaJsonCache.get(match.filePath) || null;
};

/**
 * Returns full schema metadata by SAID.
 */
export const getSchemaInfoBySaid = (said) => {
  if (!said) return null;
  const parsed = allParsedSchemas.find((item) => item.said === said) || null;
  const manifestMeta = KNOWN_SCHEMA_MANIFEST[said] || null;
  if (!parsed && !manifestMeta) return null;
  return {
    said,
    name: parsed?.name || manifestMeta?.family || null,
    family: manifestMeta?.family || parsed?.name || null,
    version: manifestMeta?.version || "1.0.0",
    status: manifestMeta?.status || "active",
    filePath: parsed?.filePath || null,
    json: parsed ? schemaJsonCache.get(parsed.filePath) || null : null,
  };
};

/**
 * Resolves the latest active schema plugin for a given schema family name or historical SAID.
 */
export const getLatestSchemaForFamily = (familyOrSaid) => {
  if (!familyOrSaid) return null;

  const manifestBySaid = KNOWN_SCHEMA_MANIFEST[familyOrSaid];
  const familyName = manifestBySaid?.family || familyOrSaid;

  const activeEntry = Object.entries(KNOWN_SCHEMA_MANIFEST).find(
    ([, meta]) => meta.family === familyName && meta.status === "active"
  );

  if (activeEntry) {
    const [activeSaid, activeMeta] = activeEntry;
    const parsed = allParsedSchemas.find((item) => item.said === activeSaid) || null;
    const schemaName = parsed?.name || activeMeta.family;
    return {
      said: activeSaid,
      name: schemaName,
      family: activeMeta.family,
      version: activeMeta.version,
      route: routeMapData[schemaName] || `/form/${slugify(schemaName)}`,
      filePath: parsed?.filePath || null,
      json: parsed ? schemaJsonCache.get(parsed.filePath) || null : null,
    };
  }

  const visibleMatch = visibleSchemas.find((item) => item.name === familyName);
  if (visibleMatch) {
    return {
      said: visibleMatch.said,
      name: visibleMatch.name,
      family: visibleMatch.name,
      version: KNOWN_SCHEMA_MANIFEST[visibleMatch.said]?.version || "1.0.0",
      route: routeMapData[visibleMatch.name] || `/form/${slugify(visibleMatch.name)}`,
      filePath: visibleMatch.filePath,
      json: schemaJsonCache.get(visibleMatch.filePath) || null,
    };
  }

  return null;
};
