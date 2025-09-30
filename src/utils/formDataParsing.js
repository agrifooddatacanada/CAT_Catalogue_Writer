// formDataParsing.js

// EXTRACT LOCALIZED CATEGORIES DIRECTLY FROM ENTRY OVERLAYS IN MAIN BUNDLE

export function extractEntryValuesByLanguage(jsonData, language) {
  const overlays = jsonData?.oca_bundle?.bundle?.overlays;
  if (!overlays) return {};

  const categoryMap = {};

  for (const key in overlays) {
    const overlay = overlays[key];
    if (
      overlay.type === "spec/overlays/entry/1.0" &&
      overlay.language === language
    ) {
      const attributeEntries = overlay.attribute_entries || {};
      for (const attrName in attributeEntries) {
        categoryMap[attrName] = Object.values(attributeEntries[attrName]);
      }
    }
  }
  return categoryMap;
}