import React, { useRef, useEffect, useState } from "react";
import { isEqual } from "lodash";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormInputSingle from "./DynamicFormComponents/FormInputSingle";
import FormInputMultiple from "./DynamicFormComponents/FormInputMultiple";
import FormInputGroup from "./DynamicFormComponents/FormInputGroup";
import PopupDialog from "./DynamicFormComponents/PopupDialog";
import { getNestedValue, setNestedValue } from "../../utils/formStateUtils";
import { validateFieldsForState } from "../../utils/formValidation";
import useDynamicFormState from "../../hooks/useDynamicFormState";
import { v4 as uuidv4 } from "uuid";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";
//
const checkMultipleEntriesFilled = (fields, state) => {
  for (const field of fields) {
    // Only enforce check if field is required & multiple
    if (field.required && field.multiple) {
      const val = getNestedValue(state, field.path);
      // If missing or empty array, fail validity
      if (!Array.isArray(val) || val.length === 0) {
        return false; // empty required multiple field disables Submit
      }
    }

    if (field.children && field.children.length > 0) {
      if (!checkMultipleEntriesFilled(field.children, state)) {
        return false;
      }
    }
  }
  return true;
};

//
const filterMandatoryFields = (fields) => {
  return fields
    .filter((field) => field.required) // keep only required parents and singles
    .map((field) => ({
      ...field,
      children: field.children ? filterMandatoryFields(field.children) : [],
    }));
};

//
function unflatten(formState) {
  const result = {};
  Object.keys(formState).forEach((flatKey) => {
    const keys = flatKey.split(".");
    keys.reduce((acc, key, idx) => {
      if (idx === keys.length - 1) {
        acc[key] = formState[flatKey];
        return null;
      }
      if (!acc[key]) acc[key] = {};
      return acc[key];
    }, result);
  });
  return result;
}

// COMPONENT STATE
function DynamicForm({
  jsonData,
  language = "eng",
  initialData = null,
  readOnly = false,
  isEditMode = false,
  onSave,
}) {
  //
  const {
    fields,
    formState,
    setFormState,
    errors,
    popupErrors,
    dialogOpen,
    setDialogOpen,
    popupValue,
    setPopupValue,
    setEditingIndex,
    formatPatterns,
    handleItemDelete,
    handlePopupSave,
    findFieldByPath,
    matches,
    flatten,
  } = useDynamicFormState(jsonData, language, initialData); // Pass `initialData` here

  const { t } = useTranslation(); // use translation function

  //
  const popupField = findFieldByPath(fields, dialogOpen);

  //
  const [isFormValid, setIsFormValid] = useState();

  //
  const [showMandatoryOnly, setShowMandatoryOnly] = useState(true);

  //
  const displayedFields = showMandatoryOnly
    ? filterMandatoryFields(fields)
    : fields;

  //
  const initialFormStateRef = useRef(null);

  //
  const [isModified, setIsModified] = useState(false);

  //
  const handleSubmit = (event) => {
    event.preventDefault();

    const nestedState = unflatten(formState);

    //alert("Old catalogue_id: " + nestedState.catalogue_id);

    // Remove existing catalogue_id if any
    if ("catalogue_id" in nestedState) {
      delete nestedState.catalogue_id;
    }
    // Add a unique file identifier
    const formDataWithId = {
      "@context": "https://schema.org",
      "@type": "Catalogue",
      catalogue_id: uuidv4(),
      ...nestedState,
    };

    //alert("Saving file with catalogue_id: " + formDataWithId.catalogue_id);

    // Instead of download, call onSave with data
    if (typeof onSave === "function") {
      onSave(formDataWithId, isModified);
    }
  };

  //
  useEffect(() => {
    // Validate whole form state, including multiple-entry arrays
    const errors = validateFieldsForState(fields, formState, formatPatterns);
    const multipleFilled = checkMultipleEntriesFilled(fields, formState);
    setIsFormValid(Object.keys(errors).length === 0 && multipleFilled);
  }, [formState, fields, formatPatterns]);

  //
  useEffect(() => {
    // When `formState` or `initialData` changes, update the reference
    if (initialData) {
      initialFormStateRef.current = flatten(initialData);
    } else {
      initialFormStateRef.current = {};
    }
  }, [initialData, flatten]);

  //
  useEffect(() => {
    if (!initialFormStateRef.current) return;
    // Compare current formState with initial
    const modified = !isEqual(formState, initialFormStateRef.current);
    setIsModified(modified);
  }, [formState]);

  //
  const isValueFilled = (val) => {
    if (val === null || val === undefined) return false;
    if (typeof val === "string") return val.trim() !== "";
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object") return Object.keys(val).length > 0;
    return true; // For numbers or booleans
  };

  //
  const isPopupSaveEnabled = () => {
    if (!popupField) return false;

    // Validate all fields first
    const errors = validateFieldsForState(
      popupField.children || [popupField],
      popupValue,
      formatPatterns
    );
    if (Object.keys(errors).length > 0) {
      return false; // has validation errors, disable save
    }

    const fieldsToCheck =
      popupField.children && popupField.children.length > 0
        ? popupField.children
        : [popupField];

    const requiredFields = fieldsToCheck.filter((f) => f.required);

    if (requiredFields.length > 0) {
      // All required fields must be filled
      const allRequiredFilled = requiredFields.every((f) =>
        isValueFilled(popupValue[f.name])
      );
      return allRequiredFilled;
    } else {
      // No required fields, enable Save if at least one field is filled
      return fieldsToCheck.some((f) => isValueFilled(popupValue[f.name]));
    }
  };

  // RECURSIVE RENDERER (INDIVIDUAL INPUTS)
  const renderInput = (
    field,
    depth = 0,
    key,
    mode = "form",
    errorState = {}
  ) => {
    const {
      name,
      label,
      placeholder,
      type,
      multiple,
      categories,
      children,
      path,
      required,
    } = field;

    const value =
      mode === "popup"
        ? getNestedValue(popupValue, path)
        : getNestedValue(formState, path);

    const error = mode === "popup" ? errorState[path] : errors[path];

    // CHANGE HANDLER BASED ON MODE
    const onChange = (p, val) => {
      if (mode === "popup") {
        setPopupValue((prev) => setNestedValue(prev, p, val));
      } else {
        setFormState((prev) => setNestedValue(prev, p, val));
      }
    };

    // RENDER ADD BUTTON AND DISPLAY EXISTING ITEMS AS LIST FOR FIELDS THAT CAN HAVE MULTIPLE VALUES
    if (multiple) {
      return (
        <FormInputMultiple
          key={key}
          required={required}
          label={label}
          name={name}
          path={path}
          children={children}
          multiple={multiple}
          value={value || []}
          setPopupValue={setPopupValue}
          setEditingIndex={setEditingIndex}
          setDialogOpen={setDialogOpen}
          handleItemDelete={handleItemDelete}
          depth={depth}
          readOnly={readOnly}
          isEditMode={isEditMode}
        />
      );
    }

    if (children && children.length > 0) {
      return (
        <FormInputGroup
          key={key}
          children={children}
          label={label}
          name={name}
          path={path}
          depth={depth}
          renderInput={renderInput}
          required={required}
          readOnly={readOnly}
        />
      );
    }

    return (
      <FormInputSingle
        key={key}
        name={name}
        label={label}
        type={type}
        multiple={multiple}
        categories={categories}
        children={children}
        path={path}
        value={value}
        error={error}
        onChange={onChange}
        required={required}
        depth={depth}
        readOnly={readOnly}
        isEditMode={isEditMode}
        placeholder={placeholder}
      />
    );
  };

  // RETURN JSX
  return (
    <>
      <Box sx={{ mb: 2, display: "flex", gap: 2, justifyContent: "center" }}>
        <Button
          variant={showMandatoryOnly ? "contained" : "outlined"}
          onClick={() => setShowMandatoryOnly(true)}
          sx={{
            mb: 2,
            backgroundColor: showMandatoryOnly
              ? "rgba(70, 160, 35, 1)"
              : "rgba(255, 255, 255, 1)",
            color: showMandatoryOnly
              ? "rgba(255, 255, 255, 1)"
              : "rgba(70, 160, 35, 1)",
            borderColor: showMandatoryOnly
              ? "rgba(255, 255, 255, 1)"
              : "rgba(70, 160, 35, 1)",
          }}
        >
          {t("dynamicform.mandatory")}
        </Button>
        <Button
          variant={
            //showMandatoryOnly ? "contained" :
            "outlined"
          }
          //onClick={() => setShowMandatoryOnly(true)}
          sx={{
            mb: 2,
            //showMandatoryOnly ?
            backgroundColor: "rgba(255, 255, 255, 1)",
            //: "rgba(70, 160, 35, 1)",
            //showMandatoryOnly ?
            color: "rgba(70, 160, 35, 1)",
            //: "rgba(255, 255, 255, 1)",
            //showMandatoryOnly ?
            borderColor: "rgba(70, 160, 35, 1)",
            //: "rgba(255, 255, 255, 1)",
          }}
        >
          {t("dynamicform.recommended")}
        </Button>
        <Button
          variant={!showMandatoryOnly ? "contained" : "outlined"}
          onClick={() => setShowMandatoryOnly(false)}
          sx={{
            mb: 2,
            backgroundColor: showMandatoryOnly
              ? "rgba(255, 255, 255, 1)"
              : "rgba(70, 160, 35, 1)",
            color: showMandatoryOnly
              ? "rgba(70, 160, 35, 1)"
              : "rgba(255, 255, 255, 1)",
            borderColor: showMandatoryOnly
              ? "rgba(70, 160, 35, 1)"
              : "rgba(255, 255, 255, 1)",
          }}
        >
          {t("dynamicform.complete")}
        </Button>
      </Box>

      {!readOnly && (
        <Typography
          sx={{ mb: "20px", fontSize: "13px" }}
        >
          {t("All fields with ( ")}
          <span style={{ color: "red"}}>*</span>
          {t(" ) are Mandatory")}
        </Typography>
      )}

      {/* GENERATED FORM (RECURSICE INPUT RENDERING + SUBMIT BUTTON) */}
      <form onSubmit={handleSubmit}>
        {displayedFields.map((field) =>
          renderInput({ ...field, path: field.name })
        )}
        {!readOnly && (
          <>
            <Button
              variant="contained"
              type="submit"
              disabled={!isFormValid || !isModified}
              sx={{ mt: 2, backgroundColor: "rgba(70, 160, 35, 1)" }}
              startIcon={isEditMode && <SaveIcon />}
              endIcon={!isEditMode && <SendIcon />}
            >
              {isEditMode
                ? t("dynamicform.save_changes")
                : t("dynamicform.review")}
            </Button>
          </>
        )}
      </form>

      {/* DIALOG POP-UP JSX 
          RENDERED INSIDE MAIN COMPONENT TO ACCESS HOOKS AND UPDATE STATE */}
      <PopupDialog
        open={!!dialogOpen}
        onClose={() => setDialogOpen(null)}
        matches={matches}
        popupField={popupField}
        popupValue={popupValue}
        setPopupValue={setPopupValue}
        popupErrors={popupErrors}
        handlePopupSave={handlePopupSave}
        isPopupSaveEnabled={isPopupSaveEnabled}
        renderInput={renderInput}
      />

      {/* DEBUG PANEL SHOWING EXTRACTED FIELDS JSON FOR VERIFICATION */}
      {/* <Box
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
      </Box> */}
    </>
  );
}

export default DynamicForm;
