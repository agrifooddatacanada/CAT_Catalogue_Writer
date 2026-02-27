// Schema Context Map
export const SCHEMA_CONTEXT_MAP = {
  OpenAIRE: "https://www.openaire.eu/",
  "Dublin Core (Repository-specific) [Test]":
    "http://purl.org/dc/elements/1.1/",
  "Dublin Core (Project-specific) [Test]": "http://purl.org/dc/elements/1.1/",
  "DataCite [Test]": "https://schema.datacite.org/",
};

export const SCHEMA_ID_MAP = {
  OpenAIRE: "ELFQbADu3w__7hDbaF6iY_1nOa68LgJWmqf3B_dTV0e5",
  "Dublin Core (Repository-specific) [Test]":
    "EDqM_wwgWgRrEd609T9X8wTasxpp1e_QJYmdBxFVRoii",
  "Dublin Core (Project-specific) [Test]":
    "EJ4icsxrpbxRHy0Eo_zHMB9_kTkrZ4hmT7r4CKLtL41_",
  "DataCite [Test]": "####digest_of_oca_datacite_package####",
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
