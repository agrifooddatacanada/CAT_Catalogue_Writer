import { escapeKey } from "./pathEncoding.js";

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

  const overlayOrdering = ext?.overlays?.ordering?.attribute_ordering || [];

  function flattenFields(fieldList = []) {
    const result = [];

    for (const field of fieldList) {
      result.push(field);
      if (Array.isArray(field.children) && field.children.length > 0) {
        result.push(...flattenFields(field.children));
      }
    }

    return result;
  }

  const allFlatFields = flattenFields(fields);

  // Scope field lookup to the matching captureBaseDigest first so nested fields
  // with common names (id, name, title, description) never overwrite parent fields.
  const scopedFieldsByName = {};
  const fallbackFieldsByName = {};
  for (const f of allFlatFields) {
    if (!f?.name) continue;
    if (f.captureBase === captureBaseDigest && !(f.name in scopedFieldsByName)) {
      scopedFieldsByName[f.name] = f;
    }
    if (!(f.name in fallbackFieldsByName)) {
      fallbackFieldsByName[f.name] = f;
    }
  }

  const resolveField = (rawName) => {
    const escaped = escapeKey(rawName);
    return scopedFieldsByName[escaped] || fallbackFieldsByName[escaped] || null;
  };

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
            const field = resolveField(item);
            if (!field) return null;

            return {
              type: "field",
              field,
            };
          }

          if (item && typeof item === "object" && item.named_section) {
            const sectionFields = (item.attribute_order || [])
              .map((name) => resolveField(name))
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
  const rootDigest = jsonData?.oca_bundle?.bundle?.capture_base?.d;
  const dependencies = jsonData?.oca_bundle?.dependencies || [];

  const parentDigestMap = {};

  const buildParentMapFromFields = (fieldList) => {
    if (!Array.isArray(fieldList)) return;
    for (const field of fieldList) {
      if (Array.isArray(field.children) && field.children.length > 0) {
        for (const child of field.children) {
          if (child.captureBase && field.captureBase) {
            if (!parentDigestMap[child.captureBase]) {
              parentDigestMap[child.captureBase] = field.captureBase;
            }
          }
        }
        buildParentMapFromFields(field.children);
      }
    }
  };

  buildParentMapFromFields(fields);

  const depthCache = {};
  const getDepth = (digest, visited = new Set()) => {
    if (digest === rootDigest) return 0;
    if (depthCache[digest] !== undefined) return depthCache[digest];
    if (visited.has(digest)) return 1;
    visited.add(digest);
    const parent = parentDigestMap[digest];
    depthCache[digest] = parent ? getDepth(parent, visited) + 1 : 1;
    return depthCache[digest];
  };

  const allPages = [
    ...extractPagesForCaptureBase(rootDigest, jsonData, fields, lang).map(
      (page) => ({
        ...page,
        isChildPage: false,
        depth: 0,
        captureBaseDigest: rootDigest,
        parentCaptureBaseDigest: null,
      }),
    ),
    ...dependencies.flatMap((dep) => {
      const depDigest = dep.capture_base?.d;
      return extractPagesForCaptureBase(depDigest, jsonData, fields, lang).map(
        (page) => ({
          ...page,
          isChildPage: true,
          depth: getDepth(depDigest),
          captureBaseDigest: depDigest,
          parentCaptureBaseDigest: parentDigestMap[depDigest] || null,
        }),
      );
    }),
  ];

  return allPages;
}
