import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Chip,
  Box,
  Select,
  MenuItem,
  //InputLabel,
  FormControl,
  FormHelperText,
  Typography,
  Dialog,
} from "@mui/material";
import { extractAttributes } from "../../utils/extractAttributes";

// EXTRACT LOCALIZED CATEGORIES DIRECTLY FROM ENTRY OVERLAYS IN MAIN BUNDLE
function extractEntryValuesByLanguage(jsonData, language) {
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

// UTILITY FOR READING DEEPLY NESTED VALUES IN THE FROM STATE
const getNestedValue = (obj, path) => {
  if (!path || typeof path !== "string") {
    console.warn("getNestedValue called with invalid path:", path);
    return "";
  }
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : ""), obj) || "";
};

// UTILITY FOR WRITING DEEPLY NESTED VALUES IN THE FROM STATE
const setNestedValue = (obj, path, value) => {
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

// COMPONENT STATE
function DynamicForm({ jsonData, language = "eng" }) {
  // FORM SCHEMA EXTRACTED FROM JSON
  const [fields, setFields] = useState([]);

  // REGEX VALIDATIONS
  const [formatPatterns, setFormatPatterns] = useState({});

  // CURRENT INPUT VALUES
  const [formState, setFormState] = useState({});

  // VALIDATION ERROR MESSAGES
  const [errors, setErrors] = useState({});

  // VALIDATION ERRORS FOR POPUPS
  const [popupErrors, setPopupErrors] = useState({});

  // MANAGE WHICH FIELD'S DIALOG IS OPEN
  const [dialogOpen, setDialogOpen] = useState(null);

  // MANAGE INPUT VALUES FOR AN INDIVIDUAL ITEM (FOR POP-UP)
  const [popupValue, setPopupValue] = useState({});

  // REUSABLE VALIDATE FUNCTION ACCEPTING FIELDS AND STATE
  const validateFieldsForState = (fieldsToValidate, stateToValidate) => {
    const newErrors = {};

    const validateRecursively = (fields, parentKey = "") => {
      fields.forEach(({ name, required, multiple, children }) => {
        const key = parentKey ? `${parentKey}.${name}` : name;
        const val = getNestedValue(stateToValidate, key);

        if (children && children.length > 0) {
          validateRecursively(children, key);
        } else {
          if (
            required &&
            (val === "" || (Array.isArray(val) && val.length === 0))
          ) {
            newErrors[key] = "This field is required";
          }

          const baseName = key.split(".").slice(-1)[0];
          const pattern = formatPatterns[baseName];
          if (pattern && val && !pattern.test(val)) {
            newErrors[key] = `Invalid format for ${name}`;
          }
        }
      });
    };

    validateRecursively(fieldsToValidate);
    return newErrors;
  };

  // ON SAVE BUTTON CLICK IN POPUP
  const handlePopupSave = () => {
    if (!popupField) return;

    // Validate popup inputs using popupField schema and popupValue state
    const errors = validateFieldsForState(
      popupField.children || [popupField],
      popupValue
    );
    if (Object.keys(errors).length > 0) {
      setPopupErrors(errors);
      return; // don't save if validation errors
    }

    // Save popup value into formState
    handleDialogSave(dialogOpen, popupValue);

    // Clear popup errors and close dialog
    setPopupErrors({});
    setDialogOpen(null);
    setPopupValue({});
  };

  // ON SAVE, APPEND THE CONSTRUCTED MINI-OBJECT TO ARRAY
  const handleDialogSave = (path, value) => {
    setFormState((prev) => {
      const arr = Array.isArray(getNestedValue(prev, path))
        ? [...getNestedValue(prev, path)]
        : [];
      return setNestedValue(prev, path, [...arr, value]);
    });
  };

  // REMOVE AN ITEM FROM THE ARRAY AT `path` IN FORM STATE
  const handleItemDelete = (path, idx) => {
    setFormState((prev) => {
      const arr = Array.isArray(getNestedValue(prev, path))
        ? [...getNestedValue(prev, path)]
        : [];
      arr.splice(idx, 1);
      return setNestedValue(prev, path, arr);
    });
  };

  // IDENTIFY CURRENT FIELD SCHEMA FOR OPEN POPUP PATH
  const findFieldByPath = React.useCallback((fieldsList, path) => {
    if (!path) return null;
    const [head, ...rest] = path.split(".");
    const field = fieldsList.find((f) => f.name === head);
    if (!field) return null;
    if (rest.length === 0) return field;
    if (field.children) return findFieldByPath(field.children, rest.join("."));
    return null;
  }, []);

  // FIND CURRENT FIELD BY MATCHING OPEN PATH AGAINST FIELDS ARRAY
  const popupField = findFieldByPath(fields, dialogOpen);

  // ON MOUNT OR WHEN jsonData/language CHANGES
  useEffect(() => {
    //
    const addPathToFields = (fields, parentPath = "") => {
      return fields.map((field) => {
        const currentPath = parentPath
          ? `${parentPath}.${field.name}`
          : field.name;
        return {
          ...field,
          path: currentPath,
          children: field.children
            ? addPathToFields(field.children, currentPath)
            : [],
        };
      });
    };

    // EXTRACT SCHEMA FIELDS
    const localizedCategories = extractEntryValuesByLanguage(
      jsonData,
      language
    );

    // EXTRACT FORMAT PATTERNS
    const { fields: extractedFields, formatPatterns } = extractAttributes(
      jsonData,
      "capture_base"
    );

    // MERGE IN LOCALIZED CATEGORIES
    const enrichedFields = extractedFields.map((field) => {
      if (field.categories == null && localizedCategories[field.name]) {
        return { ...field, categories: localizedCategories[field.name] };
      }
      return field;
    });

    const enrichedFieldsWithPaths = addPathToFields(enrichedFields);

    setFields(enrichedFieldsWithPaths);
    setFormatPatterns(formatPatterns); // store patterns for validation

    // INITIALIZE EMPTY FORM STATE STRUCTURE WITH NESTED ATTRIBUTES
    const initState = {};
    const initNestedState = (fields, parentKey = "") => {
      fields.forEach(({ name, multiple, children, path }) => {
        const key = path || (parentKey ? `${parentKey}.${name}` : name);
        if (children && children.length > 0) {
          initNestedState(children, key);
        } else {
          initState[key] = multiple ? [] : "";
        }
      });
    };
    initNestedState(enrichedFieldsWithPaths);
    setFormState(initState);
  }, [jsonData, language]);

  useEffect(() => {
    if (dialogOpen) {
      const field = findFieldByPath(fields, dialogOpen);
      if (!field) return;

      if (field.children && field.children.length) {
        const emptyObj = {};
        field.children.forEach((child) => {
          emptyObj[child.name] = "";
        });
        setPopupValue(emptyObj);
      } else {
        setPopupValue("");
      }
    }
  }, [dialogOpen, fields, findFieldByPath]);

  // UPDATE FORM STATE WHEN INPUTS CHANGE
  const handleChange = (path, value) => {
    console.log("handleChange", path, value);
    setFormState((prev) => {
      const updated = setNestedValue(prev, path, value);
      console.log("Updated formState:", updated);
      return updated;
    });
  };

  const validate = () => {
    const newErrors = {};

    // RECURSIVELY CHECK FIELDS
    const validateFields = (fields, parentKey = "") => {
      fields.forEach(({ name, required, multiple, children }) => {
        const key = parentKey ? `${parentKey}.${name}` : name;
        const val = getNestedValue(formState, key);

        // ENFORCE REQUIRED FIELDS
        if (children && children.length > 0) {
          validateFields(children, key);
        } else {
          // Required field validation
          if (
            required &&
            (val === "" || (Array.isArray(val) && val.length === 0))
          ) {
            newErrors[key] = "This field is required";
          }

          // APPLY REGEX FORMAT CHECKS
          // Extract base attribute name (last segment)
          const baseName = key.split(".").slice(-1)[0];
          const pattern = formatPatterns[baseName];

          // POPULATE ERRORS
          if (pattern && val && !pattern.test(val)) {
            newErrors[key] = `Invalid format for ${name}`;
          }
        }
      });
    };

    validateFields(fields);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // RECURSIVE RENDERER (INDIVIDUAL INPUTS)
  const renderInput = (
    { name, label, type, multiple, categories, children, path },
    depth = 0,
    key,
    mode = "form",
    errorState = {}
  ) => {
    const value =
      mode === "popup"
        ? getNestedValue(popupValue, path)
        : getNestedValue(formState, path);

    const error = mode === "popup" ? errorState[path] : errors[path];

    //const value = getNestedValue(formState, path);
    //const error = errors[path];
    const errorProps = error ? { error: true, helperText: error } : {};

    // CHANGE HANDLER FOR POPUP INPUTS
    const handlePopupChange = (path, value) => {
      setPopupValue((prev) => setNestedValue(prev, path, value));
    };

    // CHANGE HANDLER BASED ON MODE
    const onChange = (p, val) => {
      if (mode === "popup") {
        handlePopupChange(p, val);
      } else {
        handleChange(p, val);
      }
    };

    // RENDER ADD BUTTON AND DISPLAY EXISTING ITEMS AS LIST FOR FIELDS THAT CAN HAVE MULTIPLE VALUES
    if (multiple) {
      const entries = value || [];
      const columns =
        children && children.length > 0
          ? children.map((child) => child.name)
          : entries.length > 0
          ? Object.keys(entries[0])
          : [];

      const formatValue = (val) => {
        if (val === null || val === undefined) return "";
        if (typeof val === "object") return JSON.stringify(val, null, 2);
        return val;
      };

      return (
        <Box key={key} sx={{ mb: 2 }}>
          <Typography variant={depth === 0 ? "h6" : "h8"}>
            {label || name}
          </Typography>

          {/* Table showing existing entries */}
          {entries.length > 0 && (
            <Box sx={{ overflowX: "auto", mb: 2 }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        style={{
                          border: "1px solid #ccc",
                          padding: "8px",
                          textAlign: "left",
                          backgroundColor: "#eee",
                        }}
                      >
                        {col}
                      </th>
                    ))}
                    <th
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                        textAlign: "center",
                        backgroundColor: "#eee",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                      {columns.map((col) => (
                        <td
                          key={col}
                          style={{
                            border: "1px solid #ccc",
                            padding: "8px",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {formatValue(entry[col])}
                        </td>
                      ))}
                      <td
                        style={{
                          border: "1px solid #ccc",
                          padding: "8px",
                          textAlign: "center",
                        }}
                      >
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleItemDelete(path, idx)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}

          <Button variant="outlined" onClick={() => setDialogOpen(path)}>
            Add {label || name}
          </Button>
          {/* POP-UP DIALOG RENDERED ONCE PER COMPONENT
              NOT HERE (INSIDE `renderInput`) */}
        </Box>
      );
    }

    // DECIDE GROUP HEADINGS IF CHILDREN PRESENT
    if (children && children.length > 0) {
      // Render nested group with a typography header
      return (
        <Box key={key}>
          <Typography variant={depth === 0 ? "h6" : "h8"} gutterBottom>
            {label || name}
          </Typography>
          {children.map((child) =>
            renderInput(
              {
                ...child,
                path: path ? `${path}.${child.name}` : child.name,
              },
              depth + 1,
              child.name
            )
          )}
        </Box>
      );
    }

    // Single input fields are already using label above input
    return (
      <Box sx={{ mb: 2 }}>
        {/* Heading above the input */}
        <Typography
          variant={depth === 0 ? "h6" : "h8"}
          component="label"
          sx={{ mb: 0.5, display: "block" }}
        >
          {label || name}
        </Typography>

        {categories && categories.length > 0 ? (
          // RENDER SELECT FOR CATEGORICAL FIELDS & ATTACH VALIDATION ERROR DISPLAY
          <FormControl fullWidth {...errorProps}>
            <Select
              value={value}
              onChange={(e) => onChange(path, e.target.value)}
              multiple={multiple}
              renderValue={(selected) =>
                multiple ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((val) => (
                      <Chip key={val} label={val} />
                    ))}
                  </Box>
                ) : (
                  selected || <em>None</em>
                )
              }
            >
              {categories.map((option) => {
                const code = option.split(" ")[0];
                return (
                  <MenuItem key={code} value={code}>
                    {option}
                  </MenuItem>
                );
              })}
            </Select>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        ) : // RENDER TEXT FIELD FOR DATES & ATTACH VALIDATION ERROR DISPLAY
        type === "DateTime" ? (
          <TextField
            type="date"
            fullWidth
            value={value}
            onChange={(e) => onChange(path, e.target.value)}
            InputLabelProps={{ shrink: true }}
            {...errorProps}
          />
        ) : (
          // RENDER TEXT FIELD FOR FREE TEXT & ATTACH VALIDATION ERROR DISPLAY
          <TextField
            fullWidth
            value={value}
            onChange={(e) => onChange(path, e.target.value)}
            {...errorProps}
          />
        )}
      </Box>
    );
  };

  // RETURN JSX
  return (
    <>
      {/* GENERATED FORM (RECURSICE INPUT RENDERING + SUBMIT BUTTON) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!validate()) return;
          console.log("Form submitted:", formState);
        }}
      >
        {fields.map((field) => renderInput({ ...field, path: field.name }))}
        <Button variant="contained" type="submit" sx={{ mt: 2 }}>
          Submit
        </Button>
      </form>

      {fields.map((field) => {
        const entries = getNestedValue(formState, field.path);
        console.log("Rendering entries for field", field.name, entries);

        if (
          !field.multiple ||
          !Array.isArray(entries) ||
          entries.length === 0
        ) {
          return null;
        }

        const columns =
          field.children && field.children.length > 0
            ? field.children.map((child) => child.name)
            : Object.keys(entries[0] || {});
        console.log("Columns for field", field.name, columns);

        return (
          <Box key={`table-${field.path}`} sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              {field.label || field.name} Entries
            </Typography>
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        style={{
                          border: "1px solid #ccc",
                          padding: "8px",
                          textAlign: "left",
                          backgroundColor: "#eee",
                        }}
                      >
                        {col}
                      </th>
                    ))}
                    <th
                      style={{
                        border: "1px solid #ccc",
                        padding: "8px",
                        textAlign: "center",
                        backgroundColor: "#eee",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                      {columns.map((col) => (
                        <td
                          key={col}
                          style={{ border: "1px solid #ccc", padding: "8px" }}
                        >
                          {typeof entry[col] === "object" && entry[col] !== null
                            ? JSON.stringify(entry[col])
                            : entry[col] || ""}
                        </td>
                      ))}
                      <td
                        style={{
                          border: "1px solid #ccc",
                          padding: "8px",
                          textAlign: "center",
                        }}
                      >
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleItemDelete(field.path, idx)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        );
      })}

      {/* DIALOG POP-UP JSX 
          RENDERED INSIDE MAIN COMPONENT TO ACCESS HOOKS AND UPDATE STATE */}
      <Dialog open={!!dialogOpen} onClose={() => setDialogOpen(null)}>
        <Box sx={{ p: 2, minWidth: 300 }}>
          <Typography variant="h5" align="center" gutterBottom>
            Add Entry
          </Typography>
          {popupField && popupField.children?.length > 0 ? (
            popupField.children.map((child) =>
              renderInput(
                {
                  ...child,
                  path: child.name,
                },
                0,
                child.name,
                "popup",
                popupErrors
              )
            )
          ) : (
            <TextField
              autoFocus
              fullWidth
              value={popupValue}
              onChange={(e) => setPopupValue(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button onClick={() => setDialogOpen(null)}>Cancel</Button>
            <Button variant="contained" onClick={handlePopupSave}>
              Save
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* DEBUG PANEL SHOWING EXTRACTED FIELDS JSON FOR VERIFICATION */}
      <Box
        sx={{
          mt: 4,
          p: 2,
          border: "1px solid #ccc",
          backgroundColor: "#fafafa",
          whiteSpace: "pre-wrap",
          fontSize: "0.875rem",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Extracted Fields (for verification):
        </Typography>
        <pre>{JSON.stringify(fields, null, 2)}</pre>
      </Box>
    </>
  );
}

export default DynamicForm;
