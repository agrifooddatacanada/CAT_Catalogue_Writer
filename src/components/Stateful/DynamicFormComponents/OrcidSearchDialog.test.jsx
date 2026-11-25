import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OrcidSearchDialog from "./OrcidSearchDialog";
import { TranslationProvider } from "../../../utils/OpenAIRE/TranslationContext";
import * as orcidUtils from "../../../utils/orcidUtils";

describe("OrcidSearchDialog", () => {
  beforeAll(() => {
    // jsdom does not fully implement HTMLDialogElement.showModal / close
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function showModal() {
        this.open = true;
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function close(returnValue = "") {
        this.returnValue = returnValue;
        this.open = false;
        this.dispatchEvent(new Event("close"));
      };
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("searches ORCID registry, displays names/other names/affiliations, flags duplicates, and selects a match", async () => {
    const searchSpy = jest
      .spyOn(orcidUtils, "searchOrcidRegistry")
      .mockResolvedValue({
        results: [
          {
            orcidId: "0009-0006-1153-1757",
            givenNames: "Niraj",
            familyNames: "Patil",
            creditName: "",
            displayName: "Niraj Patil",
            otherNames: ["N. Patil"],
            affiliations: ["University of Guelph"],
          },
          {
            orcidId: "0000-0002-0339-109X",
            givenNames: "Niraj Nitish",
            familyNames: "Patil",
            creditName: "",
            displayName: "Niraj Nitish Patil",
            otherNames: [],
            affiliations: ["University of Limerick"],
          },
        ],
        numFound: 2,
        isBroadMatch: false,
        error: null,
      });

    const onSelectOrcid = jest.fn();
    const onClose = jest.fn();
    const outerSubmit = jest.fn((e) => e.preventDefault());

    render(
      <TranslationProvider>
        <form onSubmit={outerSubmit}>
          <OrcidSearchDialog
            open={true}
            onClose={onClose}
            onSelectOrcid={onSelectOrcid}
            initialQuery="Niraj Patil"
            allFormValues={{
              "prov___$dot$___qualifiedAttribution[0].id": "0000-0002-0339-109X",
            }}
            valuePath="prov___$dot$___qualifiedAttribution[1].id"
          />
        </form>
      </TranslationProvider>
    );

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ query: "Niraj Patil", start: 0, rows: 10 })
      );
    });

    expect(await screen.findByText("0009-0006-1153-1757")).toBeInTheDocument();
    expect(screen.getByText("N. Patil")).toBeInTheDocument();
    expect(screen.getByText("University of Guelph")).toBeInTheDocument();
    expect(screen.getByText("Already Added")).toBeInTheDocument();

    // Submitting search inside portal must not trigger outer form submit
    fireEvent.click(screen.getByRole("button", { name: /^search$/i }));
    expect(outerSubmit).not.toHaveBeenCalled();

    // Selecting the non-duplicate match invokes onSelectOrcid after search finishes
    const selectButton = await screen.findByRole("button", { name: /^select$/i });
    fireEvent.click(selectButton);
    expect(onSelectOrcid).toHaveBeenCalledWith(
      expect.objectContaining({
        orcidId: "0009-0006-1153-1757",
        displayName: "Niraj Patil",
      })
    );
  });
});
