// Schema Context Map
export const SCHEMA_CONTEXT_MAP = {
  OpenAIRE: "https://www.openaire.eu/",
  "Dublin Core (Repository-specific)": "http://purl.org/dc/elements/1.1/",
  "Dublin Core (Project-specific)": "http://purl.org/dc/elements/1.1/",
  DataCite: "https://schema.datacite.org/",
  "DCAT [Demo]": "http://purl.org/dc/terms/",
  "Project (RAiD-inspired)":
    "https://www.example-schema.com/project-raid-inspired",
};

export const SCHEMA_ID_MAP = {
  OpenAIRE: "ELFQbADu3w__7hDbaF6iY_1nOa68LgJWmqf3B_dTV0e5",
  "Dublin Core (Repository-specific)":
    "EDqM_wwgWgRrEd609T9X8wTasxpp1e_QJYmdBxFVRoii",
  "Dublin Core (Project-specific)":
    "EJ4icsxrpbxRHy0Eo_zHMB9_kTkrZ4hmT7r4CKLtL41_",
  DataCite: "####digest_of_oca_datacite_package####",
  "DCAT [Demo]": "EFyyq7pbgewSwaeAZlBKl4Zk2nciNTfB2CpnEjphcnQ8",
  "Project (RAiD-inspired)": "EOCArfeoEEQCo2HU7zuSAlqEevTxMLgg0-qgcTsp3BIP",
};

export const getContextUrl = (schema) => {
  return SCHEMA_CONTEXT_MAP[schema] || null;
};

export const getSchemaId = (schema) => {
  return SCHEMA_ID_MAP[schema] || null;
};

const ID_TO_SCHEMA_MAP = Object.fromEntries(
  Object.entries(SCHEMA_ID_MAP).map(([k, v]) => [v, k]),
);

export const getSchemaFromId = (schemaId) => ID_TO_SCHEMA_MAP[schemaId] || null;
