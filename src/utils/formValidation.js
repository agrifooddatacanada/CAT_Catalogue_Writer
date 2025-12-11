// Recursive validation function accepting fields and form state,
// returning a dictionary with error messages per field path.
export const validateFieldsForState = (fieldsToValidate, stateToValidate, patternsToUse) => {
  const newErrors = {};

  const validateRecursively = (fields, parentKey = "", parentRequired = true) => {
    fields.forEach(({ name, required, multiple, children, label }) => {
      const key = parentKey ? `${parentKey}.${name}` : name;

      // Try flat key access first
      let val = stateToValidate[key];

      // If not found and not an object field with children, try nested path
      if (val === undefined && (!children || children.length === 0)) {
        val = key.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), stateToValidate);
      }
      //const val = key.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), stateToValidate);

      if (children && children.length > 0) {
        // Recursively validate children first
        validateRecursively(children, key, required);
      }
      else {
        // Only validate if parent is required
        if (parentRequired) {
          // Check if this field is part of a multiple parent with nested array data
          const parentFieldName = key.split('.')[0];
          const nestedArray = stateToValidate[parentFieldName];
          const hasValidNestedData = Array.isArray(nestedArray) && nestedArray.length > 0 
            && nestedArray.some(item => Object.values(item).some(v => v && v !== ""));

          // Skip validation for flat key if nested array has valid data
          if (!hasValidNestedData) {
            if (required && (val === "" || val === undefined || (Array.isArray(val) && val.length === 0))) {
              newErrors[key] = ""; // This field is required message can be shown here
            }
            const baseName = key.split(".").slice(-1)[0];
            const pattern = patternsToUse[baseName];
            console.log("val:", val);
            if (pattern && val && !pattern.test(val)) {
              newErrors[key] = `Invalid format for ${label || name}`;
            }
            // If nested array exists with valid data, skip validation (bypass/pass implicitly)
          }

          // if (required && (val === "" || val === undefined || (Array.isArray(val) && val.length === 0))) {
          //   console.log(key );
          //   newErrors[key] = ""; // This field is required message can be shown here
          // }
          // const baseName = key.split(".").slice(-1)[0];
          // const pattern = patternsToUse[baseName];
          // if (pattern && val && !pattern.test(val)) {
          //   newErrors[key] = `Invalid format for ${label || name}`;
          // }
        }
      }
    });
  };

  validateRecursively(fieldsToValidate);
  return newErrors;
};