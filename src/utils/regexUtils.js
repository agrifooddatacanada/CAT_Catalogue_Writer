export function serializeRegexPatterns(patterns) {
  const result = {};
  Object.keys(patterns).forEach((key) => {
    const pattern = patterns[key];
    if (pattern instanceof RegExp) {
      // Store as { source, flags }
      result[key] = {
        source: pattern.source,
        flags: pattern.flags || "",
        type: "regex",
      };
    } else {
      result[key] = pattern;
    }
  });
  return result;
}

export function deserializeRegexPattern(serialized) {
  if (serialized?.type === "regex") {
    return new RegExp(serialized.source, serialized.flags);
  }
  return serialized;
}

export function deserializeRegexPatterns(patterns) {
  const result = {};
  Object.keys(patterns).forEach((key) => {
    result[key] = deserializeRegexPattern(patterns[key]);
  });
  return result;
}
