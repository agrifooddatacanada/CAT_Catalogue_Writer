// Map schema name -> file name
const fileMap = {
  OpenAIRE: "./OpenAIRE_OCA_package.json",
  "Dublin Core (Repository-specific) [Test]":
    "./Dublin_Core_Repository_OCA_package.json",
  "Dublin Core (Project-specific) [Test]":
    "./Dublin_Core_Project_OCA_package.json",
  "DataCite [Test]": "./DataCite_OCA_package.json",
};

export async function extractJsonSchemaAsync(schema) {
  const filePath = fileMap[schema] || fileMap.OpenAIRE;

  try {
    const res = await fetch(filePath);
    const jsonSchema = await res.json();
    return jsonSchema;
  } catch (err) {
    console.error(`Failed to load schema for ${schema}:`, err);
    return false;
  }
}
