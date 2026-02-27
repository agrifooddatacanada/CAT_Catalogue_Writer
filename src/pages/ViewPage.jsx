import React from "react";
import { Box } from "@mui/system";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import DynamicForm from "../components/Stateful/DynamicForm";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PageHeaders from "../components/Stateless/PageHeaders";
import { saidify } from "saidify";
import theme from "../theme";
import { useSelector, useDispatch } from "react-redux";
import {
  selectHasFormData,
  selectFields,
  selectAllFormValues,
  selectSchemaName,
} from "../store/selectors/formSelectors";
import { setMode } from "../store/slices/modeSlice";
import canonicalize from "../utils/canonicalize";
import { getContextUrl, getSchemaId } from "../utils/schemaContextMapping";

function ViewPage() {
  const { t, lang } = useTranslation(); // use translation function
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const schema = useSelector(selectSchemaName);
  const isUploadedJson = useSelector(selectHasFormData);
  const flatFormState = useSelector(selectAllFormValues);

  function unflatten(flatObject) {
    const result = {};
    for (const [key, value] of Object.entries(flatObject)) {
      const path = parsePath(key);
      let current = result;
      for (let i = 0; i < path.length; i++) {
        const segment = path[i];
        const isLast = i === path.length - 1;
        const nextSegment = path[i + 1];
        if (isLast) {
          // Leaf - deep clone the value to avoid frozen object issues
          current[segment] = deepClone(value);
        } else {
          const isNextArrayIndex = typeof nextSegment === "number";
          if (typeof segment === "number") {
            // Current container MUST be an array
            if (!Array.isArray(current)) {
              current = [];
            }
            ensureIndex(current, segment);
            if (current[segment] == null) {
              current[segment] = isNextArrayIndex ? [] : {};
            }
            current = current[segment];
          } else {
            // segment is a string key
            if (current[segment] == null) {
              current[segment] = isNextArrayIndex ? [] : {};
            }
            current = current[segment];
          }
        }
      }
    }
    return result;
  }

  // Deep clone to handle frozen/immutable objects
  function deepClone(value) {
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(deepClone);
    }
    const cloned = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        cloned[key] = deepClone(value[key]);
      }
    }
    return cloned;
  }

  function ensureIndex(arr, index) {
    while (arr.length <= index) {
      arr.push(null);
    }
  }

  function parsePath(path) {
    if (!path) return [];
    return path
      .split(/\.|\[/)
      .filter(Boolean)
      .map((segment) => {
        segment = segment.replace(/]$/, "");
        return /^\d+$/.test(segment) ? parseInt(segment, 10) : segment;
      });
  }

  const formState = unflatten(flatFormState);

  const jsonSchema = useSelector(selectFields);

  const downloadJson = (jsonData) => {
    // Deep clone to avoid mutating original formState
    const dataForSaid = deepClone(jsonData);

    // Clean existing metadata fields
    const cleanKeys = ["catalogue_id", "d", "@context", "@schema_id"];
    cleanKeys.forEach((key) => {
      if (key in dataForSaid) delete dataForSaid[key];
    });

    // Canonicalize (assuming you import canonicalize)
    const canonicalizedState = canonicalize(dataForSaid);
    const formData = JSON.parse(canonicalizedState);

    // Get context from schema or Redux (match your logic)
    const contextUrl = getContextUrl(jsonSchema);
    const schemaId = getSchemaId(schema);

    // Build exact structure: @context, @type, d (empty), then form data
    const formDataWithId = {
      "@context": contextUrl,
      "@type": "Catalogue Record",
      "@schema_id": schemaId,
      d: "",
      ...formData,
    };

    // Compute SAID using modified data
    const [, objWithSaid] = saidify(formDataWithId, "d");

    const content = JSON.stringify(objWithSaid);
    const blob = new Blob([content], { type: "application/ld+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `catalogue-${objWithSaid.d || "export"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!jsonSchema) {
    return <div>{t("viewpage.loading")}</div>;
  }

  if (!isUploadedJson) {
    return <p>{t("viewpage.no_catalogue")}</p>;
  }

  const handleEditClick = () => {
    dispatch(setMode("edit"));
    // Pass schema back to form so it loads correct OCA package
    navigate("/form");
  };

  return (
    <div className="ViewPage">
      <PageHeaders
        page_heading={
          !isUploadedJson ? t("viewpage.review") : t("viewpage.view")
        }
        tooltip_description={
          !isUploadedJson
            ? t("viewpage.review_tooltip")
            : t("viewpage.view_tooltip")
        }
        help_button_redirect={() => navigate("/view-help")}
      />

      <Box sx={{ maxWidth: 1000, margin: "auto", padding: 5 }}>
        <DynamicForm language={lang} />

        <Button
          variant="contained"
          type="submit"
          sx={{
            backgroundColor: theme.primaryColor,
            "&:hover": {
              backgroundColor: theme.primaryColor,
            },
            mt: "2px",
            mr: "10px",
          }}
          onClick={handleEditClick}
          startIcon={<EditIcon />}
        >
          {t("viewpage.edit")}
        </Button>
        <Button
          variant="contained"
          type="submit"
          sx={{
            backgroundColor: theme.primaryColor,
            "&:hover": {
              backgroundColor: theme.primaryColor,
            },
            mt: "2px",
            mr: "10px",
          }}
          onClick={() => downloadJson(formState)}
          startIcon={<FileDownloadIcon />}
        >
          {t("viewpage.download")}
        </Button>
      </Box>
      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default ViewPage;
