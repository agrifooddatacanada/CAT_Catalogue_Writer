import { SCHEMA_ID_MAP, ID_TO_SCHEMA_MAP } from "./schemaRegistry";

// Schema Context Map
export const SCHEMA_CONTEXT_MAP = {
  "Basic DMP": "https://w3id.org/dcso/ns/core#",
  "cataloguerecord_DCAT.top": "http://purl.org/dc/terms/",
  "ContextHub_project_catalogue_record": [
    "https://schema.org",
    { "raid": "https://raid.org/schema/", "vocab": "https://vocabulary.raid.org/" }
  ],
  "ContextHub_questionnaire_catalogue_record": {
    "dcat": "http://www.w3.org/ns/dcat#",
    "dcterms": "http://purl.org/dc/terms/",
    "foaf": "http://xmlns.com/foaf/0.1/",
    "prov": "http://www.w3.org/ns/prov#",
    "adms": "http://www.w3.org/ns/adms#"
  },
  "ContextHub_schema_catalogue_record": {
    "dcat": "http://www.w3.org/ns/dcat#",
    "dcterms": "http://purl.org/dc/terms/",
    "foaf": "http://xmlns.com/foaf/0.1/",
    "prov": "http://www.w3.org/ns/prov#",
    "adms": "http://www.w3.org/ns/adms#"
  },
  "Data Request Schema": "test",
  DataCite: "https://schema.datacite.org/",
  dataset_catalogue_record: "http://purl.org/dc/elements/1.1/",
  Dublin_Core_Project: "http://purl.org/dc/elements/1.1/",
  Dublin_Core_Repository: "http://purl.org/dc/elements/1.1/",
  "OpenAIRE Application Profile Parent": "https://www.openaire.eu/",
  "Project (RAiD\\-inspired)":
    "https://www.example-schema.com/project-raid-inspired",
  "Project description": "https://metadata.raid.org/en/v1.6/",
  schema_catalogue_record: "http://purl.org/dc/elements/1.1/",
};

/**
 * Resolves context URL for either a family name or a versioned name like "Name (v1.0.0)".
 */
export const getContextUrl = (schema) => {
  if (!schema) return null;
  if (SCHEMA_CONTEXT_MAP[schema]) return SCHEMA_CONTEXT_MAP[schema];
  const familyName = String(schema).replace(/\s*\(v[^)]+\)$/, "").trim();
  return SCHEMA_CONTEXT_MAP[familyName] || null;
};

/**
 * Resolves SAID identifier for either a family name or a versioned name.
 */
export const getSchemaId = (schema) => {
  if (!schema) return null;
  if (SCHEMA_ID_MAP[schema]) return SCHEMA_ID_MAP[schema];
  const familyName = String(schema).replace(/\s*\(v[^)]+\)$/, "").trim();
  return SCHEMA_ID_MAP[familyName] || null;
};

/**
 * Resolves internal schema name from historical or current SAID identifier.
 */
export const getSchemaFromId = (schemaId) => ID_TO_SCHEMA_MAP[schemaId] || null;
