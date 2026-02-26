// Schema Context Map
export const SCHEMA_CONTEXT_MAP = {
  OpenAIRE: "https://www.openaire.eu/",
  "Dublin Core (Repository-specific) [Test]":
    "http://purl.org/dc/elements/1.1/",
  "Dublin Core (Project-specific) [Test]": "http://purl.org/dc/elements/1.1/",
  "DataCite [Test]": "https://schema.datacite.org/",
};

export const SCHEMA_ID_MAP = {
  OpenAIRE: "####digest-of-openaire####",
  "Dublin Core (Repository-specific) [Test]":
    "####digest-of-dublin_core_repository####",
  "Dublin Core (Project-specific) [Test]":
    "####digest-of-dublin_core_project####",
  "DataCite [Test]": "####digest-of-datacite####",
};

export const getContextUrl = (schema) => {
  return SCHEMA_CONTEXT_MAP[schema] || "https://schema.org";
};

export const getSchemaId = (schema) => {
  return SCHEMA_ID_MAP[schema] || "####digest-of-schema####";
};

const ID_TO_SCHEMA_MAP = Object.fromEntries(
  Object.entries(SCHEMA_ID_MAP).map(([k, v]) => [v, k]),
);

export const getSchemaFromId = (schemaId) =>
  ID_TO_SCHEMA_MAP[schemaId] || "OpenAIRE";
