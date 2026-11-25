import {
  checkDuplicateContributorOrcid,
  isQualifiedAttributionOrcidField,
} from "./orcidUtils";
import { removeIndices } from "./removeIndices";

function lookupPatternData(fieldName, captureBase, formatPatterns, depFormatPatterns) {
  if (captureBase && depFormatPatterns) {
    const scopedKey = `${captureBase}::${fieldName}`;
    if (depFormatPatterns[scopedKey]) {
      return depFormatPatterns[scopedKey];
    }
  }
  if (formatPatterns && formatPatterns[fieldName]) {
    return formatPatterns[fieldName];
  }
  if (depFormatPatterns && depFormatPatterns[fieldName]) {
    return depFormatPatterns[fieldName];
  }
  return null;
}

function extractRegexSource(patternData) {
  if (!patternData) return null;
  if (typeof patternData === "string") return patternData;
  if (patternData?.source && patternData.type === "regex") return patternData.source;
  if (patternData instanceof RegExp) return patternData.source;
  return null;
}

export function getValidationError({
  field,
  fieldPath,
  valuePath,
  value,
  readOnly,
  formatPatterns,
  depFormatPatterns,
  allFormValues,
  t,
}) {
  if (!field) return null;
  const { name, label, required, placeholder, captureBase } = field;
  const displayName = label || name;

  const translate = (key, fallback) => {
    if (typeof t !== "function") return fallback;
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };

  // 1. Required validation (Boolean `false` is a valid non-empty answer)
  const isEmpty =
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);

  if (required && isEmpty) {
    return `${displayName} ${translate("validation.is_required", "is required")}`;
  }

  // 2. Skip if readOnly or empty (after required check)
  if (readOnly || isEmpty) return null;

  // 2.5. Duplicate Contributor ORCID check (scoped strictly to ORCID fields)
  const pathToUse = valuePath || fieldPath || "";
  const cleanFieldPath = removeIndices(pathToUse);
  if (allFormValues && isQualifiedAttributionOrcidField(field, cleanFieldPath)) {
    const dupCheck = checkDuplicateContributorOrcid(allFormValues, pathToUse, value);
    if (dupCheck.isDuplicate) {
      const dupLabel = dupCheck.duplicateName
        ? `${dupCheck.duplicateName} (${dupCheck.duplicateOrcid})`
        : dupCheck.duplicateOrcid;
      return `${translate("validation.contributor_already_added", "Contributor already added")}: ${dupLabel}`;
    }
  }

  // 3. Field name from path
  const fieldName = cleanFieldPath.split(".").pop() || name;

  // 4. Lookup pattern (captureBase-scoped first to prevent dependency collisions)
  const patternData = lookupPatternData(
    fieldName,
    captureBase,
    formatPatterns,
    depFormatPatterns
  );
  const regexPattern = extractRegexSource(patternData);
  if (!regexPattern) return null;

  // 5. Test regex
  try {
    const regex = new RegExp(regexPattern, "i");
    const testVal = Array.isArray(value) ? value : [value];
    const hasMismatch = testVal.some((item) => !regex.test(String(item)));
    if (hasMismatch) {
      const baseMsg = `${translate("validation.invalid_format", "Invalid format for")} ${displayName}`;
      const maxLen = getMaxLengthFromPattern(
        fieldName,
        formatPatterns,
        depFormatPatterns,
        captureBase
      );
      if (placeholder) {
        return `${baseMsg} (${translate("validation.expected", "e.g.")} ${placeholder})`;
      }
      if (maxLen && String(value).length > maxLen) {
        return `${baseMsg} (${translate("validation.max_chars", "max")} ${maxLen})`;
      }
      return baseMsg;
    }
  } catch (err) {
    console.error("Regex compilation failed:", regexPattern);
    return null;
  }
  return null;
}

export function getMaxLengthFromPattern(
  fieldName,
  formatPatterns,
  depFormatPatterns,
  captureBase = null
) {
  const patternData = lookupPatternData(
    fieldName,
    captureBase,
    formatPatterns,
    depFormatPatterns
  );
  const regexPattern = extractRegexSource(patternData);
  if (!regexPattern) return null;

  const match = regexPattern.match(/\{(\d+)?,(\d+)?\}\$?$/);
  if (match && match[2]) {
    return parseInt(match[2], 10);
  }

  const exactMatch = regexPattern.match(/\{(\d+)\}\$?$/);
  if (exactMatch && exactMatch[1]) {
    return parseInt(exactMatch[1], 10);
  }

  return null;
}
