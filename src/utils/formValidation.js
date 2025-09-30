// Recursive validation function accepting fields and form state,
// returning a dictionary with error messages per field path.
export const validateFieldsForState = (fieldsToValidate, stateToValidate, formatPatterns) => {
  const newErrors = {};

  const validateRecursively = (fields, parentKey = "") => {
    fields.forEach(({ name, required, multiple, children, label }) => {
      const key = parentKey ? `${parentKey}.${name}` : name;
      const val = key.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), stateToValidate);

      if (children && children.length > 0) {
        validateRecursively(children, key);
      } else {
        if (required && (val === "" || (Array.isArray(val) && val.length === 0))) {
          newErrors[key] = "This field is required";
        }
        const baseName = key.split(".").slice(-1)[0];
        const pattern = formatPatterns[baseName];
        if (pattern && val && !pattern.test(val)) {
          newErrors[key] = `Invalid format for ${label || name}`;
        }
      }
    });
  };

  validateRecursively(fieldsToValidate);
  return newErrors;
};