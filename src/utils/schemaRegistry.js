/**
 * Schema Registry for CAT Catalogue Writer
 * 
 * Manages multi-version Schema Plugins, Schema Families, and historical SAID mappings.
 * Supports Semantic Versioning (SemVer) starting from 0.1.0 (development/drafts) 
 * through 1.0.0+ (production releases).
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
  // Handle 2-part format e.g. "0.1" -> "0.1.0", "1.0" -> "1.0.0"
  if (/^(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(clean)) {
    return `${clean}.0`;
  }
  // Handle 1-part format e.g. "1" -> "1.0.0", "2" -> "2.0.0"
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
 * Supports versions starting from 0.1.0 or 1.0.0.
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
  // SAID -> Metadata (Pure out-of-band SAID mapping without changing schema plugin file contents)
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
 * @returns {{ isOutdated: boolean, currentVersion?: string, latestVersion?: string, family?: string, latestSaid?: string }}
 */
export const getSchemaPluginOutdatedStatus = (said) => {
  if (!said) return { isOutdated: false };
  const item = KNOWN_SCHEMA_MANIFEST[said];
  if (!item) return { isOutdated: false };

  // Find all known versions in the same family
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

// Scan visible public/schemas (non-recursive: excludes hidden schemas)
const visibleContext = require.context("../../public/schemas", false, /\.json$/);

const visibleSchemas = visibleContext
  .keys()
  .map((key) => {
    const json = visibleContext(key);
    const data = json.default || json;

    return {
      name: data?.oca_bundle?.bundle?.overlays?.meta?.[0]?.name || null,
      said: data?.d || null,
      filePath: `./schemas/${key.replace("./", "")}`,
      json: data,
    };
  })
  .filter((item) => item.name && item.said)
  .sort((a, b) => a.name.localeCompare(b.name));

// Scan hidden public/schemas/hidden for historical SAID and version resolution
const hiddenContext = require.context(
  "../../public/schemas/hidden",
  false,
  /\.json$/
);

const hiddenSchemas = hiddenContext
  .keys()
  .map((key) => {
    const json = hiddenContext(key);
    const data = json.default || json;

    return {
      name:
        data?.oca_bundle?.bundle?.overlays?.meta?.[0]?.name ||
        KNOWN_SCHEMA_MANIFEST[data?.d]?.family ||
        null,
      said: data?.d || null,
      filePath: `./schemas/hidden/${key.replace("./", "")}`,
      json: data,
    };
  })
  .filter((item) => item.said);

const allParsedSchemas = [...visibleSchemas, ...hiddenSchemas];

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

// Map Schema Names to SAIDs
const schemaIdMapData = Object.fromEntries(
  visibleSchemas.filter((item) => item.said).map((item) => [item.name, item.said])
);

// Map EVERY historical and current SAID back to its schema name
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
 * Returns schema JSON by name or SAID.
 * @param {string} schemaNameOrSaid
 * @returns {object|null}
 */
export const getSchemaJsonByName = (schemaNameOrSaid) => {
  if (!schemaNameOrSaid) return null;

  // 1. Exact name match in visible registry
  const matchByName = visibleSchemas.find((item) => item.name === schemaNameOrSaid);
  if (matchByName) return matchByName.json;

  // 2. Direct SAID match
  const bySaid = allParsedSchemas.find((item) => item.said === schemaNameOrSaid);
  if (bySaid) return bySaid.json;

  // 3. Fallback by name in hidden schemas
  const hiddenByName = hiddenSchemas.find((item) => item.name === schemaNameOrSaid);
  if (hiddenByName) return hiddenByName.json;

  return null;
};

/**
 * Looks up a schema bundle directly by SAID.
 * @param {string} said
 * @returns {object|null}
 */
export const getSchemaBySaid = (said) => {
  if (!said) return null;
  const match = allParsedSchemas.find((item) => item.said === said);
  return match?.json || null;
};
