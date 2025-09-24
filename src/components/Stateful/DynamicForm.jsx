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
} from "@mui/material";
import { extractAttributes } from "../../utils/extractAttributes";

// Function to extract localized categories from entry overlay by language
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

// Helpers to get/set nested values from formState
const getNestedValue = (obj, path) => {
  if (!path || typeof path !== "string") {
    console.warn("getNestedValue called with invalid path:", path);
    return "";
  }
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : ""), obj) || "";
};
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

function DynamicForm({ jsonData, language = "eng" }) {
  const [fields, setFields] = useState([]);
  const [formatPatterns, setFormatPatterns] = useState({});
  const [formState, setFormState] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Extract localized category values according to current language
    const localizedCategories = extractEntryValuesByLanguage(
      jsonData,
      language
    );
    const { fields: extractedFields, formatPatterns } = extractAttributes(
      jsonData,
      "capture_base"
    );

    console.log("Extracted fields:", extractedFields);
    console.log("Extracted formatPatterns:", formatPatterns);

    // Enrich fields with localized categories
    const enrichedFields = extractedFields.map((field) => {
      if (field.categories == null && localizedCategories[field.name]) {
        return { ...field, categories: localizedCategories[field.name] };
      }
      return field;
    });

    setFields(enrichedFields);
    setFormatPatterns(formatPatterns); // store patterns for validation

    // // Extract fields passing localized categories to enrich the field categories
    // const extracted = extractAttributes(jsonData, "capture_base").map(
    //   (field) => {
    //     if (field.categories == null && localizedCategories[field.name]) {
    //       return { ...field, categories: localizedCategories[field.name] };
    //     }
    //     return field;
    //   }
    // );

    // setFields(extracted);

    const initState = {};
    const initNestedState = (fields, parentKey = "") => {
      fields.forEach(({ name, multiple, children }) => {
        const key = parentKey ? `${parentKey}.${name}` : name;
        if (children && children.length > 0) {
          initNestedState(children, key);
        } else {
          initState[key] = multiple ? [] : "";
        }
      });
    };
    initNestedState(enrichedFields);
    setFormState(initState);
  }, [jsonData, language]);

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

    const validateFields = (fields, parentKey = "") => {
      fields.forEach(({ name, required, multiple, children }) => {
        const key = parentKey ? `${parentKey}.${name}` : name;
        const val = getNestedValue(formState, key);

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

          // Format validation with regex patterns from the overlay
          // Extract base attribute name (last segment)
          const baseName = key.split(".").slice(-1)[0];
          const pattern = formatPatterns[baseName];
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

  // Render individual input recursively
  const renderInput = (
    { name, label, type, multiple, categories, children, path },
    depth = 0,
    key
  ) => {
    const value = getNestedValue(formState, path);
    const error = errors[path];
    const errorProps = error ? { error: true, helperText: error } : {};

    if (children && children.length) {
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
          <FormControl fullWidth {...errorProps}>
            {/* <InputLabel id={`${path}-label`}>{name}</InputLabel> */}
            <Select
              //labelId={`${path}-label`}
              value={value}
              onChange={(e) => handleChange(path, e.target.value)}
              //label={label || name}
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
        ) : type === "DateTime" ? (
          <TextField
            type="date"
            fullWidth
            value={value}
            onChange={(e) => handleChange(path, e.target.value)}
            InputLabelProps={{ shrink: true }}
            {...errorProps}
          />
        ) : (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => handleChange(path, e.target.value)}
            {...errorProps}
          />
        )}
      </Box>
    );
  };

  return (
    <>
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

      {/* Debug display of extracted fields */}
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
