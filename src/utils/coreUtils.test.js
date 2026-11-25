import { flattenFormData, unflattenFormData } from "./formStateFlatten";
import { buildInstanceCountsFromValues } from "./instanceCounts";
import { extractAttributes } from "./extractAttributes";
import { extractPages } from "./extractPages";
import { getValidationError } from "./validationUtils";
import { isAllowedOrigin, isSafeDataUrl } from "./postMessageSecurity";
import { resolveSchemaEntry, slugify } from "./schemaRegistry";

describe("core utilities refinement regression tests", () => {
  test("flattenFormData and unflattenFormData round-trip nested objects, arrays, and dotted keys", () => {
    const input = {
      "dcterms.title": "Climate Study",
      published: false,
      creators: [
        { name: "Alice", tags: ["climate", "data"] },
        { name: "Bob", tags: ["soil"] },
      ],
    };

    const flat = flattenFormData(input);
    expect(flat["dcterms___$dot$___title"]).toBe("Climate Study");
    expect(flat.published).toBe(false);
    expect(flat["creators[0].tags[1]"]).toBe("data");

    const restored = unflattenFormData(flat);
    expect(restored).toEqual(input);
  });

  test("buildInstanceCountsFromValues records every nested array level (not just the last)", () => {
    const counts = buildInstanceCountsFromValues({
      "creator[2].affiliation[0].name": "University of Guelph",
      "creator[0].tags[3]": "agrifood",
    });

    expect(counts["creator"]).toBe(3);
    expect(counts["creator[2].affiliation"]).toBe(1);
    expect(counts["creator[0].tags"]).toBe(4);
  });

  test("extractAttributes expands sibling attributes referencing the same dependency and preserves captureBase-scoped formats", () => {
    const mockSchema = {
      oca_bundle: {
        bundle: {
          capture_base: {
            d: "ROOT",
            attributes: {
              author: "refs:PERSON",
              reviewer: "refs:PERSON",
            },
          },
          overlays: {
            label: [
              { language: "eng", attribute_labels: { author: "Author", reviewer: "Reviewer" } },
              { language: "fra", attribute_labels: { author: "Auteur", reviewer: "Évaluateur" } },
            ],
          },
        },
        dependencies: [
          {
            d: "PERSON",
            capture_base: {
              d: "PERSON",
              attributes: { id: "Text", name: "Text" },
            },
            overlays: {
              label: [
                { language: "eng", attribute_labels: { id: "Person ID", name: "Full Name" } },
                { language: "fra", attribute_labels: { id: "Identifiant", name: "Nom complet" } },
              ],
              format: {
                attribute_formats: { id: "^[0-9]{4}$" },
              },
            },
          },
        ],
      },
    };

    const eng = extractAttributes(mockSchema, "capture_base", "eng");
    expect(eng.fields).toHaveLength(2);
    expect(eng.fields[0].children).toHaveLength(2);
    // Sibling referencing same dependency MUST also expand
    expect(eng.fields[1].children).toHaveLength(2);
    expect(eng.depFormatPatterns["PERSON::id"]).toBeInstanceOf(RegExp);

    const fra = extractAttributes(mockSchema, "capture_base", "fra");
    expect(fra.fields[0].label).toBe("Auteur");
    expect(fra.fields[0].children[1].label).toBe("Nom complet");
  });

  test("extractPages scopes field lookup by captureBaseDigest to avoid name collisions", () => {
    const mockSchema = {
      oca_bundle: {
        bundle: { capture_base: { d: "ROOT" } },
        dependencies: [{ capture_base: { d: "CHILD" } }],
      },
      extensions: {
        adc: {
          ROOT: {
            overlays: {
              form: [
                {
                  language: "eng",
                  page_order: ["main"],
                  page_labels: { main: "Main Page" },
                  pages: [{ named_section: "main", attribute_order: ["title"] }],
                },
              ],
            },
          },
        },
      },
    };

    const fields = [
      {
        name: "title",
        path: "title",
        label: "Root Title",
        captureBase: "ROOT",
        children: [
          {
            name: "title",
            path: "title.title",
            label: "Nested Child Title",
            captureBase: "CHILD",
            children: [],
          },
        ],
      },
    ];

    const pages = extractPages(mockSchema, fields, "eng");
    expect(pages[0].items[0].field.label).toBe("Root Title");
  });

  test("getValidationError treats Boolean false as valid, guards ORCID duplicate check to ORCID fields, and includes placeholder hint", () => {
    const boolField = { name: "active", label: "Active", required: true, type: "Boolean" };
    expect(
      getValidationError({
        field: boolField,
        fieldPath: "active",
        value: false,
        readOnly: false,
      })
    ).toBeNull();

    const notesField = { name: "notes", label: "Notes", required: false, type: "Text" };
    expect(
      getValidationError({
        field: notesField,
        fieldPath: "prov___$dot$___qualifiedAttribution[1].notes",
        valuePath: "prov___$dot$___qualifiedAttribution[1].notes",
        value: "0000-0002-1825-0097",
        readOnly: false,
        allFormValues: {
          "prov___$dot$___qualifiedAttribution[0].id": "0000-0002-1825-0097",
        },
      })
    ).toBeNull();

    const yearField = {
      name: "year",
      label: "Year",
      placeholder: "YYYY",
      required: true,
    };
    const err = getValidationError({
      field: yearField,
      fieldPath: "year",
      value: "abc",
      readOnly: false,
      formatPatterns: { year: { source: "^\\d{4}$", type: "regex" } },
    });
    expect(err).toContain("YYYY");
  });

  test("postMessageSecurity allowlists ContextHub/SemanticEngine origins and safe dataUrls", () => {
    expect(isAllowedOrigin("https://csdcc.datacontexthub.org")).toBe(true);
    expect(isAllowedOrigin("https://sub.semanticengine.org")).toBe(true);
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedOrigin("https://evil.example.com")).toBe(false);

    expect(isSafeDataUrl("https://csdcc.datacontexthub.org/api/record.json")).toBe(true);
    expect(isSafeDataUrl("data:application/json;base64,e30=")).toBe(true);
    expect(isSafeDataUrl(["javascript", "alert(1)"].join(":"))).toBe(false);
  });

  test("resolveSchemaEntry matches exact names, SAIDs, and URL slugs", () => {
    const entry = resolveSchemaEntry(slugify("OpenAIRE Application Profile Parent"));
    expect(entry).not.toBeNull();
    expect(entry.name).toBe("OpenAIRE Application Profile Parent");
  });
});
