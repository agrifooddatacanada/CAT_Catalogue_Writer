export const hasMandatoryFields = (fields) => {
  if (!Array.isArray(fields)) return false;
  return fields.some(
    (f) => f?.required || (f?.children && hasMandatoryFields(f.children)),
  );
};

export const hasRecommendedFields = (fields) => {
  if (!Array.isArray(fields)) return false;
  return fields.some(
    (f) =>
      (f?.recommended && !f?.required) ||
      (f?.children && hasRecommendedFields(f.children)),
  );
};

export const hasOptionalFields = (fields) => {
  if (!Array.isArray(fields)) return false;
  return fields.some(
    (f) => f?.optional || (f?.children && hasOptionalFields(f.children)),
  );
};

export const filterMandatoryFields = (fields) => {
  if (!Array.isArray(fields)) return [];
  return fields.filter(
    (field) => field?.required || hasMandatoryFields(field?.children),
  );
};

export const filterRecommendedFields = (fields) => {
  if (!Array.isArray(fields)) return [];
  return fields.filter(
    (field) =>
      field?.required ||
      field?.recommended ||
      hasMandatoryFields(field?.children) ||
      hasRecommendedFields(field?.children),
  );
};

export const getInitialViewMode = (fields) => {
  if (hasMandatoryFields(fields)) return "mandatory";
  if (hasRecommendedFields(fields)) return "recommended";
  return "complete";
};

export const filterFieldsByViewMode = (fields, viewMode) => {
  if (!Array.isArray(fields)) return [];
  switch (viewMode) {
    case "mandatory":
      return filterMandatoryFields(fields);
    case "recommended":
      return filterRecommendedFields(fields);
    case "complete":
    default:
      return fields;
  }
};

export const getDisplayedFields = filterFieldsByViewMode;

export const isFieldVisibleInViewMode = (field, viewMode) => {
  if (!field) return true;
  if (viewMode === "complete") return true;
  if (viewMode === "recommended") {
    return (
      field.required ||
      field.recommended ||
      hasMandatoryFields(field.children) ||
      hasRecommendedFields(field.children)
    );
  }
  if (viewMode === "mandatory") {
    return field.required || hasMandatoryFields(field.children);
  }
  return true;
};


