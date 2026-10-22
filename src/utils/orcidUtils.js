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

