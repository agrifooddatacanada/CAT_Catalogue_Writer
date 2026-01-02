// Schema Context Map
export const SCHEMA_CONTEXT_MAP = {
    "OpenAIRE": "https://www.openaire.eu/",
    "Dublin Core (Repository-specific) [Test]": "http://purl.org/dc/elements/1.1/",
    "Dublin Core (Project-specific) [Test]": "http://purl.org/dc/elements/1.1/",
    "DataCite [Test]": "https://schema.datacite.org/"
}

export const getContextUrl = (schema) => {
  return SCHEMA_CONTEXT_MAP[schema] || "https://schema.org";
};