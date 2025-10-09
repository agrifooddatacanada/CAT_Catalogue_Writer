// PULL ATTRIBUTE LABELS FROM SPECIFIC DEPENDENCY OVERLAY
function extractLabelsFromDependency(dependency, lang) {
    const labelOverlays = dependency?.overlays?.label;
    if (!labelOverlays || !Array.isArray(labelOverlays)) return {};

    // Find the overlay with matching language
    const overlayForLang = labelOverlays.find((overlay) => overlay.language === lang);
    if (!overlayForLang) return {};

    return overlayForLang.attribute_labels || {};
}

// PULL ATTRIBUTE ENTRIES FROM SPECIFIC DEPENDENCY OVERLAY
function extractEntriesFromDependency(dependency, lang) {
    const entryOverlays = dependency?.overlays?.entry;
    if (!entryOverlays || !Array.isArray(entryOverlays)) return {};

    // Find the overlay with matching language
    const overlayForLang = entryOverlays.find((overlay) => overlay.language === lang);
    if (!overlayForLang) return {};

    const attributeEntries = overlayForLang.attribute_entries || {};
    const entryValuesMap = {};

    for (const attrName in attributeEntries) {
        const entriesObj = attributeEntries[attrName];
        entryValuesMap[attrName] = Object.entries(entriesObj).map(
            ([code, label]) => `${code} (${label})`
        );
    }
    return entryValuesMap;
}

// PULL TOP-LEVEL ATTRIBUTE LABELS FROM MAIN BUNDLE OVERLAYS
function extractBundleLabelsByLanguage(jsonData, lang) {
    const overlays = jsonData?.oca_bundle?.bundle?.overlays;
    if (!overlays || !Array.isArray(overlays.label)) return {};

    const labelOverlays = overlays.label;
    const overlayForLang = labelOverlays.find((overlay) => overlay.language === lang);
    if (!overlayForLang) return {};

    return overlayForLang.attribute_labels || {};
}

// IDENTIFY PREFERRED ATTRIBUTE ORDERING FROM EXTENSIONS
function getAttributeOrdering(jsonData) {
    const adcExtensions = jsonData?.extensions?.adc || [];
    for (const ext of Object.values(adcExtensions)) {
        const ordering = ext?.overlays?.ordering;
        if (ordering && ordering.attribute_ordering) {
            return ordering.attribute_ordering;
        }
    }
    return [];
}

//
function extractPlaceholdersFromFormExtension(extensions, lang) {
  const placeholders = {};

  // extensions.adc is an object keyed by IDs
  const adcExtensions = extensions?.adc || {};

  for (const key in adcExtensions) {
    const overlays = adcExtensions[key]?.overlays;
    if (!overlays?.form) continue;

    const forms = overlays.form;
    for (const form of forms) {
      if (!form.interaction) continue;

      for (const interactionKey of form.interaction) {
        if (!interactionKey.arguments) continue;

        const args = interactionKey.arguments || {};
        for (const [attrName, argDef] of Object.entries(args)) {
          const placeholderObj = argDef.placeholder;
          if (placeholderObj && placeholderObj[lang]) {
            placeholders[attrName] = placeholderObj[lang];
          }
        }
      }
    }
  }

  return placeholders;
}

// REORDER THE EXTRACTED FIELDS
function sortFieldsByOrdering(fields, ordering) {
    const orderMap = new Map(ordering.map((name, index) => [name, index]));
    return fields.sort((a, b) => {
        const indexA = orderMap.has(a.name) ? orderMap.get(a.name) : Number.MAX_SAFE_INTEGER;
        const indexB = orderMap.has(b.name) ? orderMap.get(b.name) : Number.MAX_SAFE_INTEGER;
        return indexA - indexB;
    });
}

// PULL ENTRY VALUES (HUMAN-READABLE) FROM MAIN BUNDLE OVERLAYS
function extractLocalizedEntryValues(jsonData, lang = "eng") {
    // Access overlays in bundle
    const overlays = jsonData?.oca_bundle?.bundle?.overlays;
    if (!overlays) return {};

    // 'entry' overlays is an array, need to find one matching the language
    const entryOverlays = Array.isArray(overlays.entry) ? overlays.entry : [];

    // Find the overlay with matching language
    const overlayForLang = entryOverlays.find((overlay) => overlay.language === lang);
    if (!overlayForLang) return {};

    const attributeEntries = overlayForLang.attribute_entries || {};
    const entryValuesMap = {};

    // Iterate over each attribute in attribute_entries
    for (const attrName in attributeEntries) {
        const entriesObj = attributeEntries[attrName];
        // Extract the values which are the human-readable labels
        entryValuesMap[attrName] = Object.entries(entriesObj).map(
            ([code, label]) => `${code} (${label})`
        );
    }
    return entryValuesMap;
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
    cardinalities
) {
    const attributes = captureBase.attributes || {};
    const fields = [];

    for (const [key, value] of Object.entries(attributes)) {
        let fieldType = value;
        let children = [];

        // RESOLVE REFERENCES
        if (typeof value === "string" && value.startsWith("refs:")) {
            const refKey = value.replace("refs:", "");
            if (!visitedRefs.has(refKey)) {
                visitedRefs.add(refKey);
                const dep = dependencies.find((dep) => dep.d === refKey);
                if (dep && dep.capture_base) {
                    // EXTRACT OVERLAYS FROM DEPENDENCY
                    const depLabels = extractLabelsFromDependency(dep, lang);
                    const depEntries = extractEntriesFromDependency(dep, lang);
                    const depConformances = dep.overlays?.conformance?.attribute_conformance || {};
                    const depCardinalities = dep.overlays?.cardinality?.attribute_cardinality || {};
                    
                    // ATTACH CHILDREN
                    children = extractAttributesFromCaptureBase(
                        dep.capture_base,
                        dependencies,
                        visitedRefs,
                        lang,
                        depLabels,
                        depEntries,
                        depConformances,
                        depCardinalities
                    );
                }
            }
            fieldType = "object";
        }

        // ATTACH LABELS, CATEGORIES, REQUIRED/MULTIPLE FLAGS
        const required = conformances[key] === "M";
        const multiple = cardinalities[key]?.includes("n");
        const categories = entryCodes[key] || null;
        const label = labels[key] || key;  // This will now use dependency-specific labels

        fields.push({
            name: key,
            label,
            type: fieldType,
            required,
            multiple,
            categories,
            children,
        });
    }
    return fields;
}


// COLLECT REGEX VALIDATION PATTERN FOR ATTRIBUTES FROM DEPENDENCIES
function extractFormatPatterns(dependencies) {
    const formatPatterns = {};

    dependencies.forEach((dep) => {
        const formatOverlay = dep.overlays?.format;
        if (formatOverlay && formatOverlay.attribute_formats) {
            // Iterate over each attribute format regex string
            for (const [attr, regexStr] of Object.entries(formatOverlay.attribute_formats)) {
                try {
                    // Covert regex string to RegExp object
                    formatPatterns[attr] = new RegExp(regexStr);
                } catch (e) {
                    console.warn(`Invalid ${attr}: ${regexStr}`, e)
                }

            }
        }
    });

    return formatPatterns;
}

// MAIN EXPORT (ORACHESTRATES EVERYTHING)
export function extractAttributes(jsonData, baseKey = "capture_base", visitedRefs = new Set(), lang = "eng") {
    const bundle = jsonData?.oca_bundle?.bundle;
    const dependencies = jsonData?.oca_bundle?.dependencies || [];
    if (!bundle) return [];

    // GET FORMAT PATTERNS FROM DEPENDENCIES
    const formatPatterns = extractFormatPatterns(dependencies);

    // READ `capture_base` FROM THE BUNDLE
    const captureBase = bundle[baseKey];
    if (!captureBase) return [];

    // GET CARDINALITIES, CONFORMANCES, LABELS, ENTRY CODES
    const cardinalities = bundle.overlays?.cardinality?.attribute_cardinality || {};
    const conformances = bundle.overlays?.conformance?.attribute_conformance || {};
    const entryCodes = extractLocalizedEntryValues(jsonData, lang);
    const mainLabels = extractBundleLabelsByLanguage(jsonData, lang);
    const placeholders = extractPlaceholdersFromFormExtension(jsonData?.extensions || {}, lang);

    let fields = [];

    // RECURSIVELY BUILD ATTRIBUTE FIELD DEFINITIONS
    const attributes = captureBase.attributes || {};
    for (const [key, value] of Object.entries(attributes)) {
        let fieldType = value;
        let children = [];

        if (typeof value === "string" && value.startsWith("refs:")) {
            const refKey = value.replace("refs:", "");
            if (!visitedRefs.has(refKey)) {
                visitedRefs.add(refKey);

                // Try to find dependency with a matching d key
                const dep = dependencies.find((dep) => dep.d === refKey);

                if (dep && dep.capture_base) {
                    // Extract labels and entries from this specific dependency
                    const depLabels = extractLabelsFromDependency(dep, lang);
                    const depEntries = extractEntriesFromDependency(dep, lang);
                    const depConformances = dep.overlays?.conformance?.attribute_conformance || {};
                    const depCardinalities = dep.overlays?.cardinality?.attribute_cardinality || {};

                    // Extract children from dependency's capture_base
                    children = extractAttributesFromCaptureBase(
                        dep.capture_base,
                        dependencies,
                        visitedRefs,
                        lang,
                        depLabels,
                        depEntries,
                        depConformances,
                        depCardinalities
                    );
                } else {
                    // fallabck: extract normally from bundle if key present
                    children = extractAttributes(jsonData, refKey, visitedRefs, lang)
                }
            }
            fieldType = "object";
        }

        const required = conformances[key] === "M";
        const multiple = cardinalities[key]?.includes("n");
        const categories = entryCodes[key] || null;
        const label = mainLabels[key] || key;
        const placeholder = placeholders[key] || "";

        fields.push({
            name: key,
            label,
            placeholder,
            type: fieldType,
            required,
            multiple,
            categories,
            children,
        });
    }

    // GET ATTRIBUTE ORDERING FROM EXTENSIONS
    const ordering = getAttributeOrdering(jsonData);
    // APPLY ORDERING
    fields = sortFieldsByOrdering(fields, ordering);

    return { fields, formatPatterns };
}
