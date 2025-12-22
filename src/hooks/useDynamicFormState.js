import React, { useState, useEffect } from "react";
import { extractEntryValuesByLanguage } from "../utils/formDataParsing";
import { getNestedValue, setNestedValue } from "../utils/formStateUtils";
import { extractAttributes } from "../utils/extractAttributes";
import { validateFieldsForState } from "../utils/formValidation";
import { useMediaQuery } from "@mui/system";

// Helper recursive function for deep initialization
const initializeEmptyObject = (childrenFields) => {
  const obj = {};
  childrenFields.forEach((child) => {
    if (child.children && child.children.length > 0) {
      obj[child.name] = initializeEmptyObject(child.children);
    } else {
      obj[child.name] = child.multiple ? [] : "";
    }
  });
  return obj;
};

// FLATTEN NESTED OBJECT TO SINGLE LEVEL WITH DOT NOTATION KEYS
function flatten(obj, parentKey = "", result = {}) {
    for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        const value = obj[key];
        const newKey = parentKey ? `${parentKey}.${key}`: key;
        if (value && typeof value === "object" && !Array.isArray(value)) {
            flatten(value, newKey, result);
        } else {
            result[newKey] = value;
        }
    }
    return result;
}

function useDynamicFormState(jsonData, language = "eng", initialData = null) {
    // FORM SCHEMA EXTRACTED FROM JSON
    const [fields, setFields] = useState([]);
    
    // REGEX VALIDATIONS
    const [formatPatterns, setFormatPatterns] = useState({});

    // REGEX VALIDATIONS FOR CHILD
    const [depFormatPatterns, setDepFormatPatterns] = useState({});
    
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
    
    //
    const [editingIndex, setEditingIndex] = useState(null);

    //
    const matches = useMediaQuery("(max-width:600px)");
    
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

    // ON MOUNT OR WHEN jsonData/language CHANGES
    useEffect(() => {
        if (!jsonData) {
            setFields([]);
            return;
        }

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
        const { fields: extractedFields, formatPatterns, depFormatPatterns } = extractAttributes(
            jsonData,
            "capture_base",
            language
        );

        if (!Array.isArray(extractedFields)) {
            console.error("extractAttributes returned invalid fields:", extractedFields);
            setFields([]);
            return;
        }
    
        // MERGE IN LOCALIZED CATEGORIES
        const enrichedFields = extractedFields.map((field) => {
            if (field.categories == null && localizedCategories[field.name]) {
                return { ...field, categories: localizedCategories[field.name] };
            }
            return field;
        });
    
        // ADD PATH TO FIELD SCHEMA OBJECTS
        const enrichedFieldsWithPaths = addPathToFields(enrichedFields);
    
        // SET FIELDS AND VALIDATION PATTERNS
        setFields(enrichedFieldsWithPaths);
        setFormatPatterns(formatPatterns);
        setDepFormatPatterns(depFormatPatterns);

        // PREPARE FLATTENED INITIAL `formState` (IF EDITING)
        let initState = {};

        // Initialize form state depending on initialData existence
        if (initialData) {
            // Flatten nested initialData to flat key structure
            initState = flatten(initialData);
        } else {
            // Create empty initial state based on schema paths
            const emptyState = {};
            const initNestedState = (fields, parentKey = "") => {
                fields.forEach(({ name, multiple, children, path }) => {
                    const key = path || (parentKey ? `${parentKey}.${name}` : name);
                    if (children && children.length > 0) {
                        initNestedState(children, key);
                    } else {
                        emptyState[key] = multiple ? [] : "";
                    }
                });
            };
            initNestedState(enrichedFieldsWithPaths);
            initState = emptyState;
        }
        setFormState(initState);
    }, [jsonData, language, initialData]);

    // INITIALIZE `popupValue` WHEN POPUP DIALOG OPENS
    useEffect(() => {
        if (!dialogOpen) return;
    
        if (editingIndex !== null) {
            // In edit mode, popupValue is already set on Edit button click, do not override
            return;
        }
    
        const field = findFieldByPath(fields, dialogOpen);
        if (!field) return;
    
        if (field.children && field.children.length) {
            setPopupValue(initializeEmptyObject(field.children));
        } else {
            setPopupValue("");
        }
    }, [dialogOpen, fields, findFieldByPath, editingIndex]);

    // VALIDATE `popupValue` WHEN IT CHANGES
    useEffect(() => {
        if (!dialogOpen) return;
        // FIND CURRENT FIELD BY MATCHING OPEN PATH AGAINST FIELDS ARRAY
        const popupField = findFieldByPath(fields, dialogOpen);
        if (!popupField) return;

        // Determine field type
            const hasChildren = popupField.children && popupField.children.length > 0;
            const fieldsToCheck = hasChildren ? popupField.children : [popupField];
            
            let valueToValidate;
            if (hasChildren) {
              valueToValidate = popupValue;
            } else {
              // Check if already wrapped - only wrap if needed
              if (
                typeof popupValue === "object" &&
                popupValue !== null &&
                popupField.name in popupValue &&
                Object.keys(popupValue).length === 1
              ) {
                valueToValidate = popupValue; // Already wrapped - use as-is
              } else {
                valueToValidate = { [popupField.name]: popupValue }; // Wrap it
              }
            }
        
            const patternsToUse = hasChildren ? depFormatPatterns : formatPatterns;
        
            // Validate all fields first
            const errors = validateFieldsForState(
              fieldsToCheck,
              valueToValidate, // Consistent structure
              patternsToUse
            );
        setPopupErrors(errors);
    }, [popupValue, dialogOpen, fields, formatPatterns, depFormatPatterns, findFieldByPath]);

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

    // ON SAVE BUTTON CLICK IN POPUP
    const handlePopupSave = () => {
        const popupField = findFieldByPath(fields, dialogOpen);
        if (!popupField) return false;
    
        // Validate popup inputs using popupField schema and popupValue state
        const errors = validateFieldsForState(
            popupField.children || [popupField],
            popupValue,
            depFormatPatterns
        );
        if (Object.keys(errors).length > 0) {
            setPopupErrors(errors);
            return; // block save if invalid
        }

        const hasChildren = popupField.children && popupField.children.length > 0;
        const valueToSave = hasChildren
            ? popupValue
            : popupValue[popupField.name];
    
        //
        if (editingIndex !== null) {
            // Update existing entry at editingIndex
            setFormState((prev) => {
                const arr = Array.isArray(getNestedValue(prev, dialogOpen))
                    ? [...getNestedValue(prev, dialogOpen)]
                    : [];
                arr[editingIndex] = valueToSave;
                return setNestedValue(prev, dialogOpen, arr);
            });
        } else {
            // Add new entry
            handleDialogSave(dialogOpen, valueToSave);
        }
    
        // Clear popup errors and close dialog
        setEditingIndex(null);
        setPopupErrors({});
        setDialogOpen(null);
        setPopupValue({});
    };

    // EXPOSE STATES AND HANDLERS NEEDED EXTERNALLY (`DynamicForm` COMPONENT)
    return {
        fields,
        formState,
        setFormState,
        errors,
        setErrors,
        popupErrors,
        dialogOpen,
        setDialogOpen,
        popupValue,
        setPopupValue,
        setEditingIndex,
        formatPatterns,
        depFormatPatterns,
        handleItemDelete,
        handlePopupSave,
        findFieldByPath,
        matches,
        flatten
    };
}

export default useDynamicFormState;