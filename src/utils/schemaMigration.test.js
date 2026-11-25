import { migrateRecordToSchema } from "./schemaMigration";
import { escapeKey } from "./pathEncoding";

describe("migrateRecordToSchema", () => {
  const targetFields = [
    { name: escapeKey("dcterms.title"), path: escapeKey("dcterms.title"), label: "Title", mandatory: true },
    { name: escapeKey("dcterms.description"), path: escapeKey("dcterms.description"), label: "Description" },
    { name: "newMandatoryField", path: "newMandatoryField", label: "New Mandatory Field", required: true },
    {
      name: "contributor",
      path: "contributor",
      label: "Contributor",
      multiple: true,
      children: [
        { name: "name", path: "contributor.name", label: "Name" },
        { name: "orcid", path: "contributor.orcid", label: "ORCID" },
      ],
    },
  ];

  test("maps matching fields, strips obsolete fields into unmappedFields, and flags missing required fields", () => {
    const oldRecord = {
      "@context": "http://purl.org/dc/terms/",
      "@type": "dcat:CatalogRecord",
      "@schema_id": "EHyGYfN7TNAUsfG9cpvC1uqC-RfahoO6TdaYtYw1cH4R",
      "@schema_version": "1.0.0",
      d: "urn:said:EOldRecordSaid123456789012345678901234567890",
      dcterms: {
        title: "Legacy Project",
        description: "Original description",
        modified: "2026-01-01T00:00:00.000Z",
        isVersionOf: "urn:said:EEarlier",
        removedDctermsField: "Old value",
      },
      legacyRenamedField: "Needs manual re-entry",
      contributor: [
        { name: "Dr. Jane Doe", legacyRole: "PI" },
      ],
    };

    const result = migrateRecordToSchema(oldRecord, targetFields);

    expect(result.formValues[escapeKey("dcterms.title")]).toBe("Legacy Project");
    expect(result.formValues[escapeKey("dcterms.description")]).toBe("Original description");
    expect(result.formValues["contributor[0].name"]).toBe("Dr. Jane Doe");

    // Obsolete keys must NOT leak into formValues
    expect(result.formValues.legacyRenamedField).toBeUndefined();
    expect(result.formValues["contributor[0].legacyRole"]).toBeUndefined();
    expect(result.formValues["@schema_version"]).toBeUndefined();

    // Unmapped user fields are captured for manual reference (system/envelope keys excluded)
    const unmappedKeys = result.unmappedFields.map((f) => f.key);
    expect(unmappedKeys).toContain("legacyRenamedField");
    expect(unmappedKeys).toContain("contributor[0].legacyRole");
    expect(unmappedKeys).toContain("dcterms.removedDctermsField");
    expect(unmappedKeys).not.toContain("@schema_id");
    expect(unmappedKeys).not.toContain("dcterms.modified");

    // New mandatory field with no value is flagged
    expect(result.missingRequiredFields).toEqual([
      { path: "newMandatoryField", label: "New Mandatory Field" },
    ]);
    expect(result.mappedCount).toBe(3);
  });
});
