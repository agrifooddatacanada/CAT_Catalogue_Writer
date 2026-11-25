import {
  buildOrcidSearchQuery,
  normalizeOrcidSearchItem,
  sanitizeOrcidSearchText,
  searchOrcidRegistry,
} from "./orcidUtils";

describe("orcidUtils search helpers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("sanitizeOrcidSearchText strips Solr special characters and normalizes whitespace", () => {
    expect(sanitizeOrcidSearchText('  Niraj:Patil (Guelph)! + "test"  ')).toBe(
      "Niraj Patil Guelph test"
    );
    expect(sanitizeOrcidSearchText("")).toBe("");
  });

  test("buildOrcidSearchQuery handles direct ORCID iD, name edismax, and name + affiliation", () => {
    expect(buildOrcidSearchQuery({ query: "https://orcid.org/0009-0006-1153-1757" })).toBe(
      "orcid:0009-0006-1153-1757"
    );

    const nameQuery = buildOrcidSearchQuery({ query: "Niraj Patil" });
    expect(nameQuery).toContain("{!edismax");
    expect(nameQuery).toContain("mm=100%");
    expect(nameQuery).toContain("Niraj Patil");

    const broadNameQuery = buildOrcidSearchQuery({ query: "Niraj Patil", broad: true });
    expect(broadNameQuery).toContain("mm=1}");

    const combinedQuery = buildOrcidSearchQuery({
      query: "Niraj Patil",
      affiliation: "University of Guelph",
    });
    expect(combinedQuery).toContain("given-and-family-names:(Niraj AND Patil)");
    expect(combinedQuery).toContain("affiliation-org-name:(University AND of AND Guelph)");
  });

  test("normalizeOrcidSearchItem extracts display name, unique other names, and affiliations", () => {
    const normalized = normalizeOrcidSearchItem({
      "orcid-id": "0000-0002-5092-547X",
      "given-names": "Jennifer",
      "family-names": "Reniers",
      "credit-name": "J. Reniers",
      "other-name": ["Jennifer A. Dobson", "Jennifer A. Dobson"],
      "institution-name": ["University of Guelph", "University of Guelph", " "],
    });

    expect(normalized).toEqual({
      orcidId: "0000-0002-5092-547X",
      givenNames: "Jennifer",
      familyNames: "Reniers",
      creditName: "J. Reniers",
      displayName: "J. Reniers",
      otherNames: ["J. Reniers", "Jennifer A. Dobson"],
      affiliations: ["University of Guelph"],
    });
  });

  test("searchOrcidRegistry parses expanded-search results and falls back to broad search when strict returns 0", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ "expanded-result": [], "num-found": 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "expanded-result": [
            {
              "orcid-id": "0009-0006-1153-1757",
              "given-names": "Niraj",
              "family-names": "Patil",
              "credit-name": null,
              "other-name": [],
              "institution-name": ["University of Guelph"],
            },
          ],
          "num-found": 1,
        }),
      });

    const res = await searchOrcidRegistry({ query: "Niraj Patil ExtraTerm" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.error).toBeNull();
    expect(res.isBroadMatch).toBe(true);
    expect(res.numFound).toBe(1);
    expect(res.results[0].orcidId).toBe("0009-0006-1153-1757");
    expect(res.results[0].displayName).toBe("Niraj Patil");
    expect(res.results[0].affiliations).toEqual(["University of Guelph"]);
  });

  test("searchOrcidRegistry returns error message on HTTP failure", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    const res = await searchOrcidRegistry({ query: "Niraj Patil" });
    expect(res.results).toEqual([]);
    expect(res.error).toContain("503");
  });
});
