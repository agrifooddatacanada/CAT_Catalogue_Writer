function extractLabelsFromDependency(dependency, lang) {
    const labelOverlays = dependency?.overlays?.label;
    if (!labelOverlays || !Array.isArray(labelOverlays)) return {};

    // Find the overlay with matching language
    const overlayForLang = labelOverlays.find((overlay) => overlay.language === lang);
    if (!overlayForLang) return {};

    return overlayForLang.attribute_labels || {};
}

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

function extractBundleLabelsByLanguage(jsonData, lang) {
    const overlays = jsonData?.oca_bundle?.bundle?.overlays;
    if (!overlays || !Array.isArray(overlays.label)) return {};

    const labelOverlays = overlays.label;
    const overlayForLang = labelOverlays.find((overlay) => overlay.language === lang);
    if (!overlayForLang) return {};

    return overlayForLang.attribute_labels || {};
}

function getAttributeOrdering(jsonData) {
    const extensions = jsonData?.extensions || [];
    for (const ext of extensions) {
        const ordering = ext?.overlays?.ordering;
        if (ordering && ordering.attribute_ordering) {
            return ordering.attribute_ordering;
        }
    }
    return [];
}

function sortFieldsByOrdering(fields, ordering) {
    const orderMap = new Map(ordering.map((name, index) => [name, index]));
    return fields.sort((a, b) => {
        const indexA = orderMap.has(a.name) ? orderMap.get(a.name) : Number.MAX_SAFE_INTEGER;
        const indexB = orderMap.has(b.name) ? orderMap.get(b.name) : Number.MAX_SAFE_INTEGER;
        return indexA - indexB;
    });
}

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

// function extractLabelsByLanguage(jsonData, lang) {
//     const overlays = jsonData?.oca_bundle?.bundle?.overlays;
//     if (!overlays || !Array.isArray(overlays.label)) return {};

//     const labelOverlays = overlays.label;

//     // Find the overlay with matching language
//     const overlayForLang = labelOverlays.find((overlay) => overlay.language === lang);
//     if (!overlayForLang) return {};

//     const attributeLabels = overlayForLang.attribute_labels || {};
//     const labelValuesMap = {};

//     // Iterate over each attribute in attribute_labels
//     for (const attrName in attributeLabels) {
//         // Extract the values which are the human-readable labels
//         labelValuesMap[attrName] = attributeLabels[attrName];
//     }
//     return labelValuesMap;
// }

// Helper to extract attributes given a captureBase object
function extractAttributesFromCaptureBase(captureBase, dependencies, visitedRefs, lang, labels, entryCodes, conformances, cardinalities) {
    const attributes = captureBase.attributes || {};
    const fields = [];

    for (const [key, value] of Object.entries(attributes)) {
        let fieldType = value;
        let children = [];

        if (typeof value === "string" && value.startsWith("refs:")) {
            const refKey = value.replace("refs:", "");
            if (!visitedRefs.has(refKey)) {
                visitedRefs.add(refKey);
                const dep = dependencies.find((dep) => dep.d === refKey);
                if (dep && dep.capture_base) {
                    // Extract overlays from this dependency
                    const depLabels = extractLabelsFromDependency(dep, lang);
                    const depEntries = extractEntriesFromDependency(dep, lang);
                    const depConformances = dep.overlays?.conformance?.attribute_conformance || {};
                    const depCardinalities = dep.overlays?.cardinality?.attribute_cardinality || {};

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


// Helper to extract format patterns from dependencies
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

export function extractAttributes(jsonData, baseKey = "capture_base", visitedRefs = new Set(), lang = "eng") {
    const bundle = jsonData?.oca_bundle?.bundle;
    const dependencies = jsonData?.oca_bundle?.dependencies || [];
    if (!bundle) return [];

    // Call helper to get format regex patterns from dependencies
    const formatPatterns = extractFormatPatterns(dependencies);

    const captureBase = bundle[baseKey];
    if (!captureBase) return [];

    const cardinalities = bundle.overlays?.cardinality?.attribute_cardinality || {};
    const conformances = bundle.overlays?.conformance?.attribute_conformance || {};
    const entryCodes = extractLocalizedEntryValues(jsonData, lang);
    const mainLabels = extractBundleLabelsByLanguage(jsonData, lang);

    let fields = [];

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

    // Get attribute ordering from extensions
    const ordering = getAttributeOrdering(jsonData);
    // Sort fields by ordering array
    fields = sortFieldsByOrdering(fields, ordering);

    return { fields, formatPatterns };
}
