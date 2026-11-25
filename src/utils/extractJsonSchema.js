import {
  FILE_MAP,
  loadSchemaBySaid,
  loadSchemaJsonByName,
} from "./schemaRegistry";

export const fileMap = FILE_MAP;

export async function extractJsonSchemaAsync(schema, options = {}) {
  try {
    if (options?.exactSaid) {
      const bySaid = await loadSchemaBySaid(options.exactSaid);
      if (bySaid) return bySaid;
    }
    const byName = await loadSchemaJsonByName(schema);
    return byName || null;
  } catch (err) {
    console.error(`Failed to load schema for ${schema}:`, err);
    return null;
  }
}
