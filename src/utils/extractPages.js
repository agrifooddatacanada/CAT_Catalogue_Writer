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

  // Build parentDigestMap from enriched fields instead of raw attribute types
  // Each field has a captureBase, and its children have their own captureBase
  // child.captureBase → parent.captureBase
  const parentDigestMap = {};

  const buildParentMapFromFields = (fieldList) => {
    if (!Array.isArray(fieldList)) return;
    for (const field of fieldList) {
      if (Array.isArray(field.children) && field.children.length > 0) {
        for (const child of field.children) {
          if (child.captureBase && field.captureBase) {
            // child's captureBase parent is this field's captureBase
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

  // Log to verify
  console.log("parentDigestMap:", parentDigestMap);

  // Compute depth recursively
  const depthCache = {};
  const getDepth = (digest) => {
    if (digest === rootDigest) return 0;
    if (depthCache[digest] !== undefined) return depthCache[digest];
    const parent = parentDigestMap[digest];
    depthCache[digest] = parent ? getDepth(parent) + 1 : 1;
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

// export function extractPages(jsonData, fields, lang = "eng") {
//   const rootCaptureBaseDigest = jsonData?.oca_bundle?.bundle?.capture_base?.d;
//   const dependencies = jsonData?.oca_bundle?.dependencies || [];

//   // Build a depth map: captureBaseDigest -> depth
//   const depDigests = dependencies.map((dep) => dep.capture_base?.d);

//   //  Use the order of dependencies and check parent references
//   const depByDigest = Object.fromEntries(
//     dependencies.map((dep) => [dep.capture_base?.d, dep]),
//   );

//   // Build parent map: child digest -> parent digest
//   const parentDigestMap = {};

//   // Root fields that have children -> their child capture bases are direct children of root
//   const rootExt = jsonData?.extensions?.adc?.[rootCaptureBaseDigest];
//   const rootCaptureBase = jsonData?.oca_bundle?.bundle?.capture_base;
//   const rootAttributes = rootCaptureBase?.attributes || {};

//   // Attributes whose type references another capture base (e.g. "Array[refs:...]" or "refs:...")
//   Object.entries(rootAttributes).forEach(([, attrType]) => {
//     const refDigest = extractRefDigest(attrType);
//     if (refDigest && depByDigest[refDigest]) {
//       parentDigestMap[refDigest] = rootCaptureBaseDigest;
//     }
//   });

//   // Then recurse into dependencies to find grandchildren
//   dependencies.forEach((dep) => {
//     const depAttrs = dep.capture_base?.attributes || {};
//     const depDigest = dep.capture_base?.d;
//     Object.entries(depAttrs).forEach(([, attrType]) => {
//       const refDigest = extractRefDigest(attrType);
//       if (refDigest && depByDigest[refDigest]) {
//         parentDigestMap[refDigest] = depDigest;
//       }
//     });
//   });

//   // Compute depth for each digest
//   const depthMap = {};
//   const getDepth = (digest) => {
//     if (digest === rootCaptureBaseDigest) return 0;
//     if (depthMap[digest] !== undefined) return depthMap[digest];
//     const parent = parentDigestMap[digest];
//     if (!parent) return 1; // fallback
//     depthMap[digest] = getDepth(parent) + 1;
//     return depthMap[digest];
//   };

//   const allPages = [
//     ...extractPagesForCaptureBase(
//       rootCaptureBaseDigest,
//       jsonData,
//       fields,
//       lang,
//     ).map((page) => ({
//       ...page,
//       isChildPage: false,
//       depth: 0,
//       captureBaseDigest: rootCaptureBaseDigest,
//     })), // ← base pages
//     ...dependencies.flatMap((dep) => {
//       const depDigest = dep.capture_base?.d;
//       const depth = getDepth(depDigest);
//       return extractPagesForCaptureBase(depDigest, jsonData, fields, lang).map(
//         (page) => ({
//           ...page,
//           isChildPage: true,
//           depth,
//           captureBaseDigest: depDigest,
//           parentCaptureBaseDigest: parentDigestMap[depDigest] || null,
//         }),
//       ); // ← child/grandchild
//     }),
//   ];

//   return allPages;
// }

// // Helper: extract referenced capture base digest from an attribute type string
// function extractRefDigest(attrType) {
//   if (!attrType || typeof attrType !== "string") return null;
//   // Matches "Array[refs:EXxx...]" or "refs:EXxx..."
//   const match = attrType.match(/refs:([A-Za-z0-9_-]+)/);
//   return match ? match[1] : null;
// }
