export function getValidationError({
  field,
  fieldPath,
  value,
  readOnly,
  formatPatterns,
  depFormatPatterns,
}) {
  const { name, label, required } = field;

  // 1. Required validation
  if (required && (!value || String(value).trim() === "")) {
    return `${label || name} is required`;
  }

  // 2. Skip if readOnly or empty (after required check)
  if (readOnly || !value) return null;

  // 3. Field name from path
  const fieldName = fieldPath.split(".").pop() || name;

  // 4. Merge patterns
  const allPatterns = { ...formatPatterns, ...depFormatPatterns };
  const patternData = allPatterns[fieldName];
  if (!patternData) return null;

  // 5. Normalize pattern
  let regexPattern;
  if (typeof patternData === "string") {
    regexPattern = patternData;
  } else if (patternData?.source && patternData.type === "regex") {
    regexPattern = patternData.source;
  }
  if (!regexPattern) return null;

  // 6. Test regex
  try {
    const regex = new RegExp(regexPattern, "i");
    if (!regex.test(value)) {
      return `Invalid format for ${label || fieldName}`;
    }
  } catch (err) {
    console.error("Regex compilation failed:", regexPattern);
    return null;
  }
  return null;
}
