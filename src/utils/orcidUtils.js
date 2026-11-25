import { unescapeKey } from "./pathEncoding";

/**
 * Extracts a normalized 19-character ORCID string (0000-0000-0000-000X)
 * from free-text input or a URL (e.g., https://orcid.org/0000-0002-1825-0097).
 */
export function extractCleanOrcid(orcidString) {
  if (!orcidString) return null;
  const match = String(orcidString).match(/\b\d{4}-\d{4}-\d{4}-\d{3}[\dX]\b/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Validates whether a string matches the standard ORCID regex pattern.
 */
export function isValidOrcid(orcidString) {
  const clean = extractCleanOrcid(orcidString);
  return clean !== null;
}

/**
 * Detects if a field in the form is the ORCID identifier field for Qualified Attribution
 * or a general contributor ORCID field.
 */
export function isQualifiedAttributionOrcidField(field, fieldPath = "") {
  if (!field) return false;
  const unescapedPath = unescapeKey(fieldPath).toLowerCase();
  const fieldName = (field.name || "").toLowerCase();
  const fieldLabel = (field.label || "").toLowerCase();
  const fieldDesc = (field.description || "").toLowerCase();

  const inQualifiedAttribution =
    unescapedPath.includes("qualifiedattribution") ||
    unescapedPath.includes("attribution");

  const isIdField =
    fieldName === "id" ||
    fieldName.includes("orcid") ||
    fieldLabel.includes("orcid") ||
    fieldDesc.includes("orcid");

  return (
    (inQualifiedAttribution && isIdField) ||
    fieldLabel.includes("orcid identifier") ||
    fieldLabel.includes("orcid id")
  );
}

/**
 * Finds the sibling name field key in the parent field definition (e.g. foaf.name).
 */
export function findSiblingNameFieldKey(parentField) {
  if (!parentField || !Array.isArray(parentField.children)) {
    return "foaf___$dot$___name";
  }

  const found = parentField.children.find((child) => {
    const childName = (child.name || "").toLowerCase();
    const childLabel = (child.label || "").toLowerCase();
    const unescaped = unescapeKey(child.name || "").toLowerCase();

    return (
      childName === "foaf___$dot$___name" ||
      unescaped === "foaf.name" ||
      childName === "name" ||
      childLabel.includes("name of the contributor") ||
      childLabel.includes("contributor name") ||
      childLabel.includes("full name") ||
      childLabel === "name"
    );
  });

  return found ? found.name : "foaf___$dot$___name";
}

/**
 * Fetches the contributor's name directly from the ORCID Public API (pub.orcid.org).
 * The ORCID Public API supports CORS and returns publicly visible biographical info.
 */
export async function fetchOrcidPersonName(orcidInput) {
  const cleanOrcid = extractCleanOrcid(orcidInput);
  if (!cleanOrcid) {
    return { name: null, cleanOrcid: null, error: "Invalid ORCID format" };
  }

  try {
    const url = `https://pub.orcid.org/v3.0/${cleanOrcid}/personal-details`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        name: null,
        cleanOrcid,
        error: `ORCID record returned status ${response.status}`,
      };
    }

    const data = await response.json();
    const creditName = data?.name?.["credit-name"]?.value;
    const givenNames = data?.name?.["given-names"]?.value || "";
    const familyName = data?.name?.["family-name"]?.value || "";

    const fullName =
      creditName || `${givenNames} ${familyName}`.trim();

    return {
      name: fullName || null,
      cleanOrcid,
      error: fullName ? null : "No public name visible on this ORCID record",
    };
  } catch (err) {
    return {
      name: null,
      cleanOrcid,
      error: err instanceof Error ? err.message : "Failed to fetch from ORCID API",
    };
  }
}

/**
 * Given a key or path (e.g. "prov___$dot$___qualifiedAttribution[1].id"),
 * extracts the collection path ("prov___$dot$___qualifiedAttribution"),
 * the instance index (1), and the property name ("id").
 */
export function parseInstancePath(path) {
  if (!path) return { collectionPath: "", instanceIndex: null, propName: "" };
  const match = String(path).match(/^(.*?)\[(\d+)\](?:\.(.*))?$/);
  if (match) {
    return {
      collectionPath: match[1],
      instanceIndex: parseInt(match[2], 10),
      propName: match[3] || "",
    };
  }
  const lastDot = path.lastIndexOf(".");
  if (lastDot !== -1) {
    return {
      collectionPath: path.substring(0, lastDot),
      instanceIndex: null,
      propName: path.substring(lastDot + 1),
    };
  }
  return { collectionPath: path, instanceIndex: null, propName: "" };
}

/**
 * Checks if the given ORCID is already used by another contributor in allFormValues.
 *
 * @param {Object} allFormValues - Flat key-value object of all form fields (Redux formState)
 * @param {string} currentPath - Current field path (e.g. "prov___$dot$___qualifiedAttribution[1].id" or instance path)
 * @param {string} orcidToCheck - The ORCID value to check
 * @returns {{ isDuplicate: boolean, duplicateOrcid: string|null, duplicateName: string|null, duplicateIndex: number|null }}
 */
export function checkDuplicateContributorOrcid(allFormValues, currentPath, orcidToCheck) {
  const cleanTarget = extractCleanOrcid(orcidToCheck);
  if (!cleanTarget || !allFormValues) {
    return { isDuplicate: false, duplicateOrcid: null, duplicateName: null, duplicateIndex: null };
  }

  const { collectionPath, instanceIndex } = parseInstancePath(currentPath);

  for (const [key, val] of Object.entries(allFormValues)) {
    if (!val) continue;

    const parsedKey = parseInstancePath(key);

    // If currentPath is inside an array collection, check within that collection
    if (collectionPath) {
      if (unescapeKey(parsedKey.collectionPath) !== unescapeKey(collectionPath)) continue;
      // Skip the current instance itself (e.g. comparing instance 0 with instance 0)
      if (instanceIndex !== null && parsedKey.instanceIndex === instanceIndex) continue;
    } else {
      if (key === currentPath) continue;
    }

    // Only compare against identifier / ORCID fields
    const propLower = (parsedKey.propName || key).toLowerCase();
    const isIdField =
      propLower === "id" ||
      propLower.endsWith(".id") ||
      propLower.includes("orcid");

    if (!isIdField) continue;

    const cleanOther = extractCleanOrcid(val);
    if (cleanOther && cleanOther === cleanTarget) {
      // Find the sibling name of the duplicate instance if available
      let duplicateName = null;
      if (parsedKey.collectionPath && parsedKey.instanceIndex !== null) {
        const prefix = `${parsedKey.collectionPath}[${parsedKey.instanceIndex}]`;
        for (const [k, v] of Object.entries(allFormValues)) {
          if (
            k.startsWith(prefix) &&
            (k.toLowerCase().includes("name") || k.toLowerCase().includes("foaf"))
          ) {
            if (v && typeof v === "string" && v.trim()) {
              duplicateName = v.trim();
              break;
            }
          }
        }
      }

      return {
        isDuplicate: true,
        duplicateOrcid: cleanTarget,
        duplicateName,
        duplicateIndex: parsedKey.instanceIndex,
      };
    }
  }

  return { isDuplicate: false, duplicateOrcid: null, duplicateName: null, duplicateIndex: null };
}

/**
 * Escapes/strips Solr special syntax characters from free-text input so user queries
 * never break ORCID's Solr query parser.
 */
export function sanitizeOrcidSearchText(text) {
  if (!text) return "";
  return String(text)
    .replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Joins sanitized whitespace-separated terms with Solr boolean AND.
 */
function buildAndTerms(sanitizedText) {
  const tokens = sanitizedText.split(" ").filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens.join(" AND ");
}

/**
 * Constructs an ORCID Public API v3.0 expanded-search `q` parameter.
 * Mirrors orcid.org's edismax name ranking while also supporting direct ORCID iDs
 * and optional affiliation filtering.
 */
export function buildOrcidSearchQuery({ query = "", affiliation = "", broad = false } = {}) {
  const directOrcid = extractCleanOrcid(query);
  if (directOrcid && !affiliation.trim()) {
    return `orcid:${directOrcid}`;
  }

  const cleanQuery = sanitizeOrcidSearchText(query);
  const cleanAffiliation = sanitizeOrcidSearchText(affiliation);

  if (!cleanQuery && !cleanAffiliation) {
    return "";
  }

  if (cleanQuery && cleanAffiliation) {
    const nameExpr = buildAndTerms(cleanQuery);
    const affExpr = buildAndTerms(cleanAffiliation);
    const op = broad ? "OR" : "AND";
    const nameGroup =
      op === "AND"
        ? `(given-and-family-names:(${nameExpr}) OR other-names:(${nameExpr}) OR credit-name:(${nameExpr}) OR text:(${nameExpr}))`
        : `(given-and-family-names:(${cleanQuery}) OR other-names:(${cleanQuery}) OR credit-name:(${cleanQuery}) OR text:(${cleanQuery}))`;
    return `${nameGroup} AND affiliation-org-name:(${op === "AND" ? affExpr : cleanAffiliation})`;
  }

  if (cleanAffiliation) {
    const affExpr = broad ? cleanAffiliation : buildAndTerms(cleanAffiliation);
    return `affiliation-org-name:(${affExpr})`;
  }

  const mm = broad ? "1" : "100%";
  return `{!edismax qf="given-and-family-names^50.0 family-name^10.0 given-names^10.0 credit-name^10.0 other-names^5.0 affiliation-org-name^5.0 text^1.0" pf="given-and-family-names^50.0" mm=${mm}}${cleanQuery}`;
}

/**
 * Normalizes a single item from ORCID's expanded-search response into a clean UI model.
 */
export function normalizeOrcidSearchItem(item) {
  const orcidId = item?.["orcid-id"] || "";
  const givenNames = (item?.["given-names"] || "").trim();
  const familyNames = (item?.["family-names"] || "").trim();
  const creditName = (item?.["credit-name"] || "").trim();

  const standardFullName = `${givenNames} ${familyNames}`.trim();
  const displayName = creditName || standardFullName;

  const rawOtherNames = Array.isArray(item?.["other-name"]) ? item["other-name"] : [];
  const otherNamesSet = new Set();
  if (creditName && creditName.toLowerCase() !== standardFullName.toLowerCase()) {
    otherNamesSet.add(creditName);
  }
  rawOtherNames.forEach((n) => {
    const trimmed = String(n || "").trim();
    if (trimmed) otherNamesSet.add(trimmed);
  });

  const rawInstitutions = Array.isArray(item?.["institution-name"])
    ? item["institution-name"]
    : [];
  const affiliations = Array.from(
    new Set(rawInstitutions.map((inst) => String(inst || "").trim()).filter(Boolean))
  );

  return {
    orcidId,
    givenNames,
    familyNames,
    creditName,
    displayName,
    otherNames: Array.from(otherNamesSet),
    affiliations,
  };
}

/**
 * Searches the ORCID Public Registry via the CORS-enabled v3.0 expanded-search endpoint.
 * Returns matching researchers with ORCID iD, given/family names, other names, and affiliations.
 */
export async function searchOrcidRegistry({
  query = "",
  affiliation = "",
  start = 0,
  rows = 10,
  signal,
  broad = false,
} = {}) {
  const q = buildOrcidSearchQuery({ query, affiliation, broad });
  if (!q) {
    return { results: [], numFound: 0, isBroadMatch: false, error: null };
  }

  const runFetch = async (solrQuery) => {
    const params = new URLSearchParams({
      q: solrQuery,
      start: String(Math.max(0, start)),
      rows: String(Math.min(Math.max(1, rows), 50)),
    });
    const url = `https://pub.orcid.org/v3.0/expanded-search/?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`ORCID search returned status ${response.status}`);
    }

    const data = await response.json();
    const rawResults = Array.isArray(data?.["expanded-result"])
      ? data["expanded-result"]
      : [];
    return {
      results: rawResults.map(normalizeOrcidSearchItem).filter((r) => r.orcidId),
      numFound: Number(data?.["num-found"] || 0),
    };
  };

  try {
    const primary = await runFetch(q);

    // If a strict all-terms search on page 1 finds 0 results and multiple words were entered,
    // automatically broaden to match any term (closer to orcid.org's default behavior).
    const cleanQuery = sanitizeOrcidSearchText(query);
    const hasMultipleTerms =
      cleanQuery.split(" ").filter(Boolean).length > 1 ||
      (cleanQuery && sanitizeOrcidSearchText(affiliation));

    if (!broad && start === 0 && primary.numFound === 0 && hasMultipleTerms) {
      const broadQ = buildOrcidSearchQuery({ query, affiliation, broad: true });
      if (broadQ && broadQ !== q) {
        const fallback = await runFetch(broadQ);
        return {
          results: fallback.results,
          numFound: fallback.numFound,
          isBroadMatch: fallback.numFound > 0,
          error: null,
        };
      }
    }

    return {
      results: primary.results,
      numFound: primary.numFound,
      isBroadMatch: Boolean(broad),
      error: null,
    };
  } catch (err) {
    if (err?.name === "AbortError") {
      return { results: [], numFound: 0, isBroadMatch: false, aborted: true, error: null };
    }
    return {
      results: [],
      numFound: 0,
      isBroadMatch: false,
      error: err instanceof Error ? err.message : "Failed to search ORCID registry",
    };
  }
}


