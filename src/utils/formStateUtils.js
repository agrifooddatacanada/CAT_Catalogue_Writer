// UTILITY FOR READING DEEPLY NESTED VALUES IN THE FORM STATE
export const getNestedValue = (obj, path) => {
  if (!path || typeof path !== "string") {
    console.warn("getNestedValue called with invalid path:", path);
    return "";
  }
  
  // 1. If exact flat key exists, return it (for flattened keys like resourceType.resourceType)
  if (obj.hasOwnProperty(path)) {
    return obj[path] == null ? "" : obj[path];
  }

  // 2. Otherwise, treat path as nested keys and traverse
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null) return "";
    current = current[key];
  }

  return current == null ? "" : current;
};

// UTILITY FOR WRITING DEEPLY NESTED VALUES IN THE FORM STATE
export const setNestedValue = (obj, path, value) => {
  if (!path) {
    console.warn("setNestedValue: path is undefined or empty");
    return obj;
  }

  // If obj has direct key matching the whole path (flat key), set it directly
  if (obj.hasOwnProperty(path)) {
    return { ...obj, [path]: value };
  }

  // Otherwise treat as nested keys path
  const keys = path.split(".");
  const lastKey = keys.pop();
  const newObj = { ...obj };
  let temp = newObj;
  keys.forEach((k) => {
    temp[k] = temp[k] ? { ...temp[k] } : {};
    temp = temp[k];
  });
  temp[lastKey] = value;
  return newObj;
};
