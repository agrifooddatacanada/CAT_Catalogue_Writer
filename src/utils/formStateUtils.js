// UTILITY FOR READING DEEPLY NESTED VALUES IN THE FORM STATE
export const getNestedValue = (obj, path) => {
  if (!path || typeof path !== "string") {
    console.warn("getNestedValue called with invalid path:", path);
    return "";
  }
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : ""), obj) || "";
};

// UTILITY FOR WRITING DEEPLY NESTED VALUES IN THE FORM STATE
export const setNestedValue = (obj, path, value) => {
  if (!path) {
    console.warn("setNestedValue: path is undefined or empty");
    return obj;
  }
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
