import { escapeKey } from "./pathEncoding.js";

// PULL TOP-LEVEL ATTRIBUTE LABELS FROM MAIN BUNDLE OVERLAYS
function extractBundleLabelsByLanguage(jsonData, lang) {
  const labelOverlays = jsonData?.oca_bundle?.bundle?.overlays?.label;
  if (!labelOverlays || !Array.isArray(labelOverlays) || labelOverlays.length === 0) {
    return {};
  }

  const overlayForLang = labelOverlays.find(
    (overlay) => overlay.language === lang,
  );
  if (!overlayForLang) return labelOverlays[0]?.attribute_labels || {};

  return overlayForLang.attribute_labels || {};
}

// PULL ATTRIBUTE LABELS FROM SPECIFIC DEPENDENCY OVERLAY
function extractLabelsFromDependency(dependency, lang) {
  const labelOverlays = dependency?.overlays?.label;
  if (!labelOverlays || !Array.isArray(labelOverlays) || labelOverlays.length === 0) {
    return {};
  }

  const overlayForLang = labelOverlays.find(
    (overlay) => overlay.language === lang,
  );
  if (!overlayForLang) return labelOverlays[0]?.attribute_labels || {};

  return overlayForLang.attribute_labels || {};
}

function getFormOverlaysForLang(forms, lang) {
  if (!Array.isArray(forms) || forms.length === 0) return [];
  const matching = forms.filter((form) => form.language === lang);
  if (matching.length > 0) return matching;
  // Fallback to English or first available overlay so labels/descriptions don't vanish in French
  const eng = forms.filter((form) => form.language === "eng");
  return eng.length > 0 ? eng : [forms[0]];
}

function extractPlaceholdersFromFormExtension(extensions, lang) {
  const placeholders = {};
  const adcExtensions = extensions?.adc || {};

  for (const key in adcExtensions) {
    const overlays = adcExtensions[key]?.overlays;
    if (!overlays?.form) continue;

    const forms = getFormOverlaysForLang(overlays.form, lang);
    for (const form of forms) {
      if (!form?.interaction) continue;

      for (const interactionKey of form.interaction) {
        if (!interactionKey.arguments) continue;

        const args = interactionKey.arguments || {};
        for (const [attrName, argDef] of Object.entries(args)) {
          const placeholder = argDef.placeholder;
          if (typeof placeholder === "string" && placeholder.trim() !== "") {
            placeholders[attrName] = placeholder;
          }
        }
      }
    }
  }
  return placeholders;
}

function getAttributeOrderingForCaptureBase(extensions, captureBaseDigest) {
  return (
    extensions?.adc?.[captureBaseDigest]?.overlays?.ordering
      ?.attribute_ordering || []
  );
}

// REORDER THE EXTRACTED FIELDS
function sortFieldsByOrdering(fields, ordering) {
  const escapedOrdering = ordering.map(escapeKey);
  const orderMap = new Map(escapedOrdering.map((name, index) => [name, index]));
  return fields.sort((a, b) => {
    const indexA = orderMap.has(a.name)
      ? orderMap.get(a.name)
      : Number.MAX_SAFE_INTEGER;
    const indexB = orderMap.has(b.name)
      ? orderMap.get(b.name)
      : Number.MAX_SAFE_INTEGER;
    return indexA - indexB;
  });
}

// PULL ENTRY VALUES (HUMAN-READABLE) FROM MAIN BUNDLE OVERLAYS
function extractLocalizedEntryValues(jsonData, lang) {
  const overlays = jsonData?.oca_bundle?.bundle?.overlays;
  if (!overlays) return {};

  const entryOverlays = Array.isArray(overlays.entry) ? overlays.entry : [];

  let overlayForLang = entryOverlays.find(
    (overlay) => overlay.language === lang,
  );

  if (!overlayForLang && entryOverlays.length > 0) {
    overlayForLang = entryOverlays[0];
  }

  if (!overlayForLang) return {};

  const attributeEntries = overlayForLang.attribute_entries || {};
  const entryValuesMap = {};

  for (const attrName in attributeEntries) {
    const entriesObj = attributeEntries[attrName];
    entryValuesMap[attrName] = Object.entries(entriesObj).map(
      ([code, label]) => `${code} (${label})`,
    );
  }
  return entryValuesMap;
}

// PULL ATTRIBUTE ENTRIES FROM SPECIFIC DEPENDENCY OVERLAY
function extractEntriesFromDependency(dependency, lang) {
  const entryOverlays = dependency?.overlays?.entry;
  if (!entryOverlays || !Array.isArray(entryOverlays)) return {};

  let overlayForLang = entryOverlays.find(
    (overlay) => overlay.language === lang,
  );

  if (!overlayForLang && entryOverlays.length > 0) {
    overlayForLang = entryOverlays[0];
  }

  if (!overlayForLang) return {};

  const attributeEntries = overlayForLang.attribute_entries || {};
  const entryValuesMap = {};

  for (const attrName in attributeEntries) {
    const entriesObj = attributeEntries[attrName];
    entryValuesMap[attrName] = Object.entries(entriesObj).map(
      ([code, label]) => `${code} (${label})`,
    );
  }
  return entryValuesMap;
}

// GET CONFORMANCE WITH DEFAULT
function getConformanceValue(conformances, key) {
  return conformances[key] || "O";
}

// NORMALIZE `value` TO A REFERENCE (refs) STRING BEFORE CHECKING
function getRefString(value) {
  if (typeof value === "string") return value;
  if (
    Array.isArray(value) &&
    value.length === 1 &&
    typeof value[0] === "string"
  ) {
    return value[0];
  }
  return null;
}

// RECURSIVELY PROCESS `capture_base`
function extractAttributesFromCaptureBase(
  captureBase,
  dependencies,
  visitedRefs,
  lang,
  labels,
  entryCodes,
  conformances,
  cardinalities,
  placeholders,
  descriptions,
  optionsMap,
  ordering = [],
  extensions = {},
) {
  const attributes = captureBase.attributes || {};
  const currentDigest = captureBase.d;
  const fields = [];

  for (const [key, value] of Object.entries(attributes)) {
    let fieldType = value;
    let children = [];

    const refString = getRefString(value);

    // RESOLVE REFERENCES (use per-branch Set so siblings referencing the same dependency both expand)
    if (refString && refString.includes("refs:")) {
      const refKey = refString.replace("refs:", "");
      if (!visitedRefs.has(refKey)) {
        const branchVisited = new Set(visitedRefs);
        branchVisited.add(refKey);
        const dep = dependencies.find((d) => d.d === refKey);
        if (dep && dep.capture_base) {
          const depLabels = extractLabelsFromDependency(dep, lang);
          const depEntries = extractEntriesFromDependency(dep, lang);
          const depConformances =
            dep.overlays?.conformance?.attribute_conformance || {};
          const depCardinalities =
            dep.overlays?.cardinality?.attribute_cardinality || {};
          const depOrdering = getAttributeOrderingForCaptureBase(
            extensions,
            dep.capture_base?.d,
          );

          children = extractAttributesFromCaptureBase(
            dep.capture_base,
            dependencies,
            branchVisited,
            lang,
            depLabels,
            depEntries,
            depConformances,
            depCardinalities,
            placeholders,
            descriptions,
            optionsMap,
            depOrdering,
            extensions,
          );
        }
      }
      fieldType = "object";
    }

    fields.push({
      name: escapeKey(key),
      label: labels[key] || key,
      placeholder: placeholders[key] || "",
      description: descriptions[key] || "",
      type: fieldType,
      options: optionsMap[key] || null,
      required: getConformanceValue(conformances, key) === "M",
      recommended: getConformanceValue(conformances, key) === "R",
      optional: getConformanceValue(conformances, key) === "O",
      multiple:
        (typeof value === "string" &&
          value.startsWith("[") &&
          value.endsWith("]")) ||
        Array.isArray(value) ||
        (cardinalities[key]
          ? cardinalities[key].includes("n") ||
            cardinalities[key] === "1-" ||
            cardinalities[key] === "0-"
          : false),
      categories: entryCodes[key] || null,
      captureBase: currentDigest,
      children,
    });
  }
  return sortFieldsByOrdering(fields, ordering);
}

function extractOptionsFromFormExtension(extensions, lang) {
  const optionsMap = {};
  const adcExtensions = extensions?.adc || {};

  for (const key in adcExtensions) {
    const overlays = adcExtensions[key]?.overlays;
    if (!overlays?.form) continue;

    const forms = getFormOverlaysForLang(overlays.form, lang);
    for (const form of forms) {
      if (!form?.interaction) continue;

      for (const interactionKey of form.interaction) {
        if (!interactionKey.arguments) continue;

        const args = interactionKey.arguments || {};
        for (const [attrName, argDef] of Object.entries(args)) {
          const options = argDef.options;
          if (Array.isArray(options)) {
            optionsMap[attrName] = options;
          }
        }
      }
    }
  }
  return optionsMap;
}

function extractDescriptionsFromFormExtension(extensions, lang) {
  const descriptions = {};
  const adcExtensions = extensions?.adc || {};

  for (const key in adcExtensions) {
    const overlays = adcExtensions[key]?.overlays;
    if (!overlays?.form) continue;

    const forms = getFormOverlaysForLang(overlays.form, lang);
    for (const form of forms) {
      if (!form?.description) continue;

      const attributeDescriptions = form.description;
      for (const [attrName, argDef] of Object.entries(attributeDescriptions)) {
        descriptions[attrName] = argDef;
      }
    }
  }
  return descriptions;
}

// COLLECT REGEX VALIDATION PATTERN FOR ATTRIBUTES
function extractFormatPatterns(jsonData) {
  const formatPatterns = {};
  const formatOverlay = jsonData?.oca_bundle?.bundle?.overlays?.format || [];

  if (formatOverlay && formatOverlay.attribute_formats) {
    for (const [attr, regexStr] of Object.entries(
      formatOverlay.attribute_formats,
    )) {
      try {
        formatPatterns[escapeKey(attr)] = new RegExp(regexStr);
      } catch (e) {
        console.warn(`Invalid ${attr}: ${regexStr}`, e);
      }
    }
  }
  return formatPatterns;
}

// COLLECT REGEX VALIDATION PATTERN FOR ATTRIBUTES FROM DEPENDENCIES
// Stores both captureBase-scoped keys (`${digest}::${escapedAttr}`) to prevent
// collisions between dependencies sharing field names and bare keys as fallback.
function extractFormatPatternsFromDep(dependencies) {
  const depFormatPatterns = {};

  dependencies.forEach((dep) => {
    const formatOverlay = dep.overlays?.format;
    const depDigest = dep.capture_base?.d;
    if (formatOverlay && formatOverlay.attribute_formats) {
      for (const [attr, regexStr] of Object.entries(
        formatOverlay.attribute_formats,
      )) {
        try {
          const escaped = escapeKey(attr);
          const compiled = new RegExp(regexStr);
          if (depDigest) {
            depFormatPatterns[`${depDigest}::${escaped}`] = compiled;
          }
          if (!(escaped in depFormatPatterns)) {
            depFormatPatterns[escaped] = compiled;
          }
        } catch (e) {
          console.warn(`Invalid ${attr}: ${regexStr}`, e);
        }
      }
    }
  });
  return depFormatPatterns;
}

// MAIN EXPORT (ORCHESTRATES EVERYTHING)
export function extractAttributes(
  jsonData,
  baseKey = "capture_base",
  lang = "eng",
  visitedRefs = new Set(),
) {
  const bundle = jsonData?.oca_bundle?.bundle;
  const dependencies = jsonData?.oca_bundle?.dependencies || [];
  if (!bundle) {
    return { fields: [], formatPatterns: {}, depFormatPatterns: {} };
  }

  const formatPatterns = extractFormatPatterns(jsonData);
  const depFormatPatterns = extractFormatPatternsFromDep(dependencies);

  const captureBase = bundle[baseKey];
  if (!captureBase) {
    return { fields: [], formatPatterns, depFormatPatterns };
  }
  const currentDigest = captureBase.d || captureBase["d"];

  const cardinalities =
    bundle.overlays?.cardinality?.attribute_cardinality || {};
  const conformances =
    bundle.overlays?.conformance?.attribute_conformance || {};
  const entryCodes = extractLocalizedEntryValues(jsonData, lang);
  const mainLabels = extractBundleLabelsByLanguage(jsonData, lang);
  const placeholders = extractPlaceholdersFromFormExtension(
    jsonData?.extensions || {},
    lang,
  );
  const descriptions = extractDescriptionsFromFormExtension(
    jsonData?.extensions || {},
    lang,
  );
  const optionsMap = extractOptionsFromFormExtension(
    jsonData?.extensions || {},
    lang,
  );
  const ordering = getAttributeOrderingForCaptureBase(
    jsonData?.extensions,
    captureBase?.d,
  );

  let fields = [];

  const attributes = captureBase.attributes || {};
  for (const [key, value] of Object.entries(attributes)) {
    let fieldType = value;
    let children = [];

    const refString = getRefString(value);

    if (refString && refString.includes("refs:")) {
      const refKey = refString.replace("refs:", "");
      if (!visitedRefs.has(refKey)) {
        const branchVisited = new Set(visitedRefs);
        branchVisited.add(refKey);

        const dep = dependencies.find((d) => d.d === refKey);

        if (dep && dep.capture_base) {
          const depLabels = extractLabelsFromDependency(dep, lang);
          const depEntries = extractEntriesFromDependency(dep, lang);
          const depConformances =
            dep.overlays?.conformance?.attribute_conformance || {};
          const depCardinalities =
            dep.overlays?.cardinality?.attribute_cardinality || {};
          const depOrdering = getAttributeOrderingForCaptureBase(
            jsonData?.extensions,
            dep.capture_base?.d,
          );

          children = extractAttributesFromCaptureBase(
            dep.capture_base,
            dependencies,
            branchVisited,
            lang,
            depLabels,
            depEntries,
            depConformances,
            depCardinalities,
            placeholders,
            descriptions,
            optionsMap,
            depOrdering,
            jsonData?.extensions,
          );
        } else {
          // Fallback: extract from bundle with correct parameter order and unwrap `.fields`
          const subResult = extractAttributes(
            jsonData,
            refKey,
            lang,
            branchVisited,
          );
          children = Array.isArray(subResult?.fields) ? subResult.fields : [];
        }
      }
      fieldType = "object";
    }

    const conformanceValue = getConformanceValue(conformances, key);
    const required = conformanceValue === "M";
    const recommended = conformanceValue === "R";
    const optional = conformanceValue === "O";
    const cardinality = cardinalities[key];
    const isArrayType =
      (typeof value === "string" &&
        value.startsWith("[") &&
        value.endsWith("]")) ||
      Array.isArray(value);
    const multiple =
      isArrayType ||
      (cardinality
        ? cardinality.includes("n") ||
          cardinality === "1-" ||
          cardinality === "0-"
        : false);
    const categories = entryCodes[key] || null;
    const label = mainLabels[key] || key;
    const placeholder = placeholders[key] || "";
    const description = descriptions[key] || "";

    fields.push({
      name: escapeKey(key),
      label,
      placeholder,
      description,
      type: fieldType,
      options: optionsMap[key] || null,
      required,
      recommended,
      optional,
      multiple,
      categories,
      captureBase: currentDigest,
      children,
    });
  }

  fields = sortFieldsByOrdering(fields, ordering);

  return { fields, formatPatterns, depFormatPatterns };
}
