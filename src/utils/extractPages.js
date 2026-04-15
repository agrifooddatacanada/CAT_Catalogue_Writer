function extractPagesForCaptureBase(
  captureBaseDigest,
  jsonData,
  fields,
  lang = "eng",
) {
  const ext = jsonData?.extensions?.adc?.[captureBaseDigest];
  const formOverlays = ext?.overlays?.form || [];
  const form = formOverlays.find((f) => f.language === lang) || formOverlays[0];
  if (!form) return [];

  const pageOrder = Array.isArray(form.page_order) ? form.page_order : [];
  const pageLabels = form.page_labels || {};
  const sidebarLabels = form.sidebar_label || {};
  const descriptions = form.description || {};
  const pages = Array.isArray(form.pages) ? form.pages : [];

  const overlayOrdering = ext?.overlays?.ordering?.attribute_ordering || []; // fallback ordering

  function flattenFields(fields = []) {
    const result = [];

    for (const field of fields) {
      result.push(field);
      if (Array.isArray(field.children) && field.children.length > 0) {
        result.push(...flattenFields(field.children));
      }
    }

    return result;
  }

  const allFlatFields = flattenFields(fields);
  const fieldsByName = Object.fromEntries(
    allFlatFields.map((f) => [f.name, f]),
  );

  // const fieldsByName = Object.fromEntries(fields.map((f) => [f.name, f]));

  return pageOrder
    .map((pageId) => {
      const page = pages.find((p) => p.named_section === pageId);
      if (!page) return null;

      const attributeOrder =
        Array.isArray(page.attribute_order) && page.attribute_order.length > 0
          ? page.attribute_order
          : overlayOrdering;

      const items = attributeOrder
        .map((item) => {
          if (typeof item === "string") {
            const field = fieldsByName[item];
            if (!field) return null;

            return {
              type: "field",
              field,
            };
          }

          if (item && typeof item === "object" && item.named_section) {
            const sectionFields = (item.attribute_order || [])
              .map((name) => fieldsByName[name])
              .filter(Boolean);

            if (sectionFields.length === 0) return null;

            return {
              type: "section",
              id: item.named_section,
              label: pageLabels[item.named_section] || item.named_section,
              sidebarLabel:
                sidebarLabels[item.named_section] ||
                pageLabels[item.named_section] ||
                item.named_section,
              description: descriptions[item.named_section] || "",
              fields: sectionFields,
            };
          }

          return null;
        })
        .filter(Boolean);

      // const sections = attributeOrder
      //   .filter(
      //     (item) => item && typeof item === "object" && item.named_section,
      //   )
      //   .map((section) => ({
      //     id: section.named_section,
      //     label: pageLabels[section.named_section] || section.named_section,
      //     sidebarLabel:
      //       sidebarLabels[section.named_section] ||
      //       pageLabels[section.named_section] ||
      //       section.named_section,
      //     description: descriptions[section.named_section] || "",
      //     fields: (section.attribute_order || [])
      //       .map((name) => fieldsByName[name])
      //       .filter(Boolean),
      //   }))
      //   .filter((section) => section.fields.length > 0);

      // const directFields = attributeOrder
      //   .filter((item) => typeof item === "string")
      //   .map((name) => fieldsByName[name])
      //   .filter(Boolean);

      return {
        id: pageId,
        label: pageLabels[pageId] || pageId,
        sidebarLabel: sidebarLabels[pageId] || pageLabels[pageId] || pageId,
        description: descriptions[pageId] || "",
        captureBase: captureBaseDigest,
        items,
      };
    })
    .filter(Boolean);
}

export function extractPages(jsonData, fields, lang = "eng") {
  const rootCaptureBaseDigest = jsonData?.oca_bundle?.bundle?.capture_base?.d;
  const dependencies = jsonData?.oca_bundle?.dependencies || [];

  const allPages = [
    ...extractPagesForCaptureBase(
      rootCaptureBaseDigest,
      jsonData,
      fields,
      lang,
    ),
    ...dependencies.flatMap((dep) =>
      extractPagesForCaptureBase(dep.capture_base?.d, jsonData, fields, lang),
    ),
  ];

  return allPages;
}
