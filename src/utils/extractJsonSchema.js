import { FILE_MAP, getSchemaJsonByName } from "./schemaRegistry";

export const fileMap = FILE_MAP;

export async function extractJsonSchemaAsync(schema) {
  try {
    return getSchemaJsonByName(schema) || getSchemaJsonByName("OpenAIRE");
  } catch (err) {
    console.error(`Failed to load schema for ${schema}:`, err);
    return false;
  }
}

// Map schema name -> file name
// const fileMap = {
//   "q-002-test": "./q-002-test.json",
//   schema_catalogue_record: "./schema_catalogue_record_OCA_package.json",
//   OpenAIRE: "./OpenAIRE_OCA_package.json",
//   "Dublin Core (Repository-specific)":
//     "./Dublin_Core_Repository_OCA_package.json",
//   "Dublin Core (Project-specific)": "./Dublin_Core_Project_OCA_package.json",
//   DataCite: "./DataCite_OCA_package.json",
//   "DCAT [Demo]": "./cataloguerecord_DCAT.top_OCA_package.json",
//   "Project (Minimal)": "./Project_OCA_package.json",
//   "RAiD (Project)": "./Project_OCA_package.v1.json",
// };

// export async function extractJsonSchemaAsync(schema) {
//   const filePath = fileMap[schema] || fileMap.OpenAIRE;

//   try {
//     const res = await fetch(filePath);
//     const jsonSchema = await res.json();
//     return jsonSchema;
//   } catch (err) {
//     console.error(`Failed to load schema for ${schema}:`, err);
//     return false;
//   }
// }
