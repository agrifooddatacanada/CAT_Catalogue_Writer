const context = require.context("../../public/schemas", false, /\.json$/);

const rawSchemas = context.keys().map((key) => {
  const json = context(key);
  const data = json.default || json;

  return {
    name: data?.oca_bundle?.bundle?.overlays?.meta?.[0]?.name || null,
    said: data?.d || null,
    filePath: `./schemas/${key.replace("./", "")}`,
    json: data,
  };
});

const schemaRegistryData = rawSchemas
  .filter((item) => item.name)
  .sort((a, b) => a.name.localeCompare(b.name));

const slugify = (name) =>
  String(name || "")
    .toLowerCase()
    .trim()
    .replace(/\[|\]/g, "")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const routeMapData = Object.fromEntries(
  schemaRegistryData.map((item) => [item.name, `/form/${slugify(item.name)}`]),
);

const fileMapData = Object.fromEntries(
  schemaRegistryData.map((item) => [item.name, item.filePath]),
);

const schemaIdMapData = Object.fromEntries(
  schemaRegistryData
    .filter((item) => item.said)
    .map((item) => [item.name, item.said]),
);

const idToSchemaMapData = Object.fromEntries(
  Object.entries(schemaIdMapData).map(([name, said]) => [said, name]),
);

export const SCHEMA_REGISTRY = schemaRegistryData;
export const ROUTE_MAP = routeMapData;
export const FILE_MAP = fileMapData;
export const SCHEMA_ID_MAP = schemaIdMapData;
export const ID_TO_SCHEMA_MAP = idToSchemaMapData;

export const getSchemaJsonByName = (schemaName) =>
  schemaRegistryData.find((item) => item.name === schemaName)?.json || null;
