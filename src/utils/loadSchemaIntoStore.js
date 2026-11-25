import { extractJsonSchemaAsync } from "./extractJsonSchema";
import { extractAttributes } from "./extractAttributes";
import { enrichFieldsWithPaths } from "./enrichFieldsWithPaths";
import { extractPages } from "./extractPages";
import { serializeRegexPatterns } from "./regexUtils";
import { getInitialViewMode } from "./viewModeUtils";
import { resolveSchemaName } from "./schemaRegistry";
import {
  setSchemaName,
  setFields,
  setPages,
  setFormatPatterns,
  setDepFormatPatterns,
  setLoadedSchemaMeta,
} from "../store/slices/fieldSchemaSlice";
import { setViewMode } from "../store/slices/formUiSlice";

/**
 * Loads a schema bundle lazily, extracts attributes/pages in the active language,
 * and dispatches schema metadata into Redux without resetting user form values.
 */
export async function loadSchemaIntoStore(
  dispatch,
  { schema, exactSaid = null, lang = "eng", preserveUiState = false }
) {
  const jsonSchema = await extractJsonSchemaAsync(
    schema,
    exactSaid ? { exactSaid } : undefined
  );
  if (!jsonSchema) {
    throw new Error(`Schema "${schema}" could not be loaded.`);
  }

  const canonicalName = resolveSchemaName(schema);
  const { fields: rawFields, formatPatterns, depFormatPatterns } =
    extractAttributes(jsonSchema, "capture_base", lang);
  const enrichedFields = enrichFieldsWithPaths(rawFields);
  const pages = extractPages(jsonSchema, enrichedFields, lang);

  dispatch(setSchemaName(canonicalName));
  dispatch(setPages(pages));
  dispatch(setFormatPatterns(serializeRegexPatterns(formatPatterns)));
  dispatch(setDepFormatPatterns(serializeRegexPatterns(depFormatPatterns)));
  if (!preserveUiState) {
    dispatch(setViewMode(getInitialViewMode(enrichedFields)));
  }
  dispatch(setFields(enrichedFields));
  dispatch(
    setLoadedSchemaMeta({
      schemaKey: canonicalName,
      exactSaid: exactSaid || jsonSchema?.d || null,
      lang,
    })
  );

  return {
    jsonSchema,
    canonicalName,
    enrichedFields,
    pages,
  };
}
