import { SCHEMA_ID_MAP, ID_TO_SCHEMA_MAP } from "./schemaRegistry";

// Schema Context Map
export const SCHEMA_CONTEXT_MAP = {
  "cataloguerecord_DCAT.top": "http://purl.org/dc/terms/",
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

export const getContextUrl = (schema) => {
  return SCHEMA_CONTEXT_MAP[schema] || null;
};

export const getSchemaId = (schema) => {
  return SCHEMA_ID_MAP[schema] || null;
};

export const getSchemaFromId = (schemaId) => ID_TO_SCHEMA_MAP[schemaId] || null;
