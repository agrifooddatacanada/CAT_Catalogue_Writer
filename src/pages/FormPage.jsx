import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box } from "@mui/system";
import DynamicForm from "../components/Stateful/DynamicForm";
import { useTranslation } from "../utils/OpenAIRE/TranslationContext";
import Footer from "../components/Stateless/Footer";
import PageHeaders from "../components/Stateless/PageHeaders";
import { useSelector, useDispatch } from "react-redux";
import {
  selectFields,
  selectHasFormData,
  selectSchemaName,
} from "../store/selectors/formSelectors";
import {
  setFields,
  setFormatPatterns,
  setDepFormatPatterns,
  setSchemaName,
} from "../store/slices/fieldSchemaSlice";
import { extractJsonSchemaAsync } from "../utils/extractJsonSchema";
import { extractAttributes } from "../utils/extractAttributes";
import { enrichFieldsWithPaths } from "../utils/enrichFieldsWithPaths";
import { serializeRegexPatterns } from "../utils/regexUtils";
import { Link, Typography } from "@mui/material";
import { setMode } from "../store/slices/modeSlice";

function FormPage() {
  const { t, lang } = useTranslation(); // use translation function

  const navigate = useNavigate();

  const dispatch = useDispatch();

  dispatch(setMode("edit"));

  const [searchParams] = useSearchParams();

  // Redux state
  const reduxSchema = useSelector(selectSchemaName);
  const fields = useSelector(selectFields);
  const hasFormData = useSelector(selectHasFormData);

  // Try URL param first, then Redux
  const schemaFromUrl = searchParams.get("schema");
  const schema = reduxSchema || schemaFromUrl;
  const isEditMode = hasFormData;

  // AUTO-LOAD SCHEMA
  useEffect(() => {
    const loadSchema = async () => {
      if (!schema || Array.isArray(fields)) return; // already loaded

      try {
        const jsonSchema = await extractJsonSchemaAsync(schema);
        if (!jsonSchema) throw new Error("Schema fetch failed");

        dispatch(setSchemaName(schema));
        const {
          fields: rawFields,
          formatPatterns,
          depFormatPatterns,
        } = extractAttributes(jsonSchema);
        const enrichedFields = enrichFieldsWithPaths(rawFields);

        dispatch(setFields(enrichedFields));
        dispatch(setFormatPatterns(serializeRegexPatterns(formatPatterns)));
        dispatch(
          setDepFormatPatterns(serializeRegexPatterns(depFormatPatterns)),
        );
      } catch (error) {
        console.error("Schema load failed:", error);
      }
    };

    loadSchema();
  }, [schema, fields?.length]); // deps: schema changes or fields empty

  // Loading states
  if (!schema) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Typography>
          No schema selected. <Link href="/">Go to Home</Link>
        </Typography>
      </div>
    );
  }

  if (!Array.isArray(fields)) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Typography>Loading {schema} schema...</Typography>
      </div>
    );
  }

  return (
    <div className="FormPage">
      <PageHeaders
        page_heading={
          isEditMode ? t("formpage.edit_header") : t("formpage.write_header")
        }
        tooltip_description={
          isEditMode ? t("formpage.edit_tooltip") : t("formpage.write_tooltip")
        }
        help_button_redirect={() => navigate("/form-help")}
      />

      {/* <pre>{JSON.stringify(fields, null, 2)}</pre> */}
      <Box sx={{ maxWidth: 1000, margin: "auto", padding: 5 }}>
        <DynamicForm
          language={lang}
          isEditMode={isEditMode} // TRUE when editing existing data
        />
      </Box>
      <Footer powered_by={t("powered_by")} supported_by={t("supported_by")} />
    </div>
  );
}

export default FormPage;
