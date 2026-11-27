import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { fireEvent, render, screen, within } from "@testing-library/react";
import FieldChecker from "./FieldChecker";
import FormInputSingle, {
  MULTI_CATEGORY_SEARCH_THRESHOLD,
  parseCategoryOption,
} from "./FormInputSingle";
import { TranslationProvider } from "../../../utils/OpenAIRE/TranslationContext";
import formValues from "../../../store/slices/formValueSlice";
import fieldSchema from "../../../store/slices/fieldSchemaSlice";
import instanceCounts from "../../../store/slices/instanceCountsSlice";
import mode from "../../../store/slices/modeSlice";
import uploadFile from "../../../store/slices/uploadFileSlice";
import formUi from "../../../store/slices/formUiSlice";
import activePage from "../../../store/slices/activePageSlice";
import childFormNavigation from "../../../store/slices/childFormNavigationSlice";
import userContext from "../../../store/slices/userContextSlice";

function createTestStore({
  field,
  fieldPath = "dcterms__spatial",
  initialFormState = {},
  initialInstanceCounts = {},
  viewMode = "edit",
}) {
  return configureStore({
    reducer: {
      fieldSchema,
      formValues,
      instanceCounts,
      mode,
      uploadFile,
      formUi,
      activePage,
      childFormNavigation,
      userContext,
    },
    preloadedState: {
      fieldSchema: {
        schema: {},
        fields: [field],
        fieldsByPath: { [fieldPath]: field },
        pages: [],
        childPages: {},
        formatPatterns: {},
        depFormatPatterns: {},
        schemaName: "TestSchema",
        schemaSaid: "",
      },
      formValues: {
        formState: initialFormState,
        initialFormState,
      },
      instanceCounts: {
        instanceCounts: initialInstanceCounts,
      },
      mode: {
        mode: viewMode,
      },
    },
  });
}

function buildCategories(count) {
  const base = [
    "Q1951 (Alberta)",
    "Q1973 (British Columbia)",
    "Q1904 (Ontario)",
    "Q16 (Canada)",
    "Q36004 (Cocos (Keeling) Islands)",
  ];
  const result = base.slice(0, Math.min(count, base.length));
  for (let i = result.length; i < count; i++) {
    result.push(`Q${10000 + i} (Location ${i + 1})`);
  }
  return result;
}

describe("FormInputSingle multi-category threshold & searchable dropdown", () => {
  test("parseCategoryOption handles nested parentheses safely", () => {
    expect(parseCategoryOption("Q36004 (Cocos (Keeling) Islands)")).toEqual({
      code: "Q36004",
      label: "Cocos (Keeling) Islands",
      raw: "Q36004 (Cocos (Keeling) Islands)",
    });
    expect(parseCategoryOption("Q1904 (Ontario)")).toEqual({
      code: "Q1904",
      label: "Ontario",
      raw: "Q1904 (Ontario)",
    });
  });

  test("renders checkboxes when multi-select entries are at or below threshold", () => {
    const categories = buildCategories(MULTI_CATEGORY_SEARCH_THRESHOLD);
    const store = createTestStore({
      field: {
        name: "dcterms__spatial",
        label: "Location",
        type: ["Text"],
        multiple: true,
        required: false,
        categories,
        children: [],
      },
    });

    render(
      <Provider store={store}>
        <TranslationProvider>
          <FormInputSingle valuePath="dcterms__spatial" />
        </TranslationProvider>
      </Provider>,
    );

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(
      MULTI_CATEGORY_SEARCH_THRESHOLD,
    );
  });

  test("renders searchable dropdown with 'Select All That Apply' placeholder above threshold and stores codes in Redux", () => {
    const categories = buildCategories(MULTI_CATEGORY_SEARCH_THRESHOLD + 5);
    const store = createTestStore({
      field: {
        name: "dcterms__spatial",
        label: "Location",
        type: ["Text"],
        multiple: true,
        required: false,
        categories,
        children: [],
      },
    });

    render(
      <Provider store={store}>
        <TranslationProvider>
          <FormInputSingle valuePath="dcterms__spatial" />
        </TranslationProvider>
      </Provider>,
    );

    const input = screen.getByPlaceholderText("Select All That Apply");
    expect(input).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();

    // Search by label and select Ontario
    fireEvent.mouseDown(input);
    fireEvent.change(input, { target: { value: "Ontario" } });
    fireEvent.click(screen.getByRole("option", { name: /Ontario/i }));

    // Search by QID code and select Cocos (Keeling) Islands
    fireEvent.change(input, { target: { value: "Q36004" } });
    fireEvent.click(
      screen.getByRole("option", { name: /Cocos \(Keeling\) Islands/i }),
    );

    // Redux stores clean codes with indexed paths and accurate instanceCount
    const state = store.getState();
    expect(state.formValues.formState["dcterms__spatial[0]"]).toBe("Q1904");
    expect(state.formValues.formState["dcterms__spatial[1]"]).toBe("Q36004");
    expect(state.instanceCounts.instanceCounts["dcterms__spatial"]).toBe(2);

    // Chips show human-readable labels instead of raw QIDs
    const ontarioChip = screen.getByTitle("Q1904 (Ontario)");
    const cocosChip = screen.getByTitle("Q36004 (Cocos (Keeling) Islands)");
    expect(ontarioChip).toHaveTextContent("Ontario");
    expect(cocosChip).toHaveTextContent("Cocos (Keeling) Islands");

    // Removing the first chip compacts Redux indices cleanly
    const deleteIcon = within(ontarioChip).getByTestId("CancelIcon");
    fireEvent.click(deleteIcon);

    const updatedState = store.getState();
    expect(updatedState.formValues.formState["dcterms__spatial[0]"]).toBe(
      "Q36004",
    );
    expect(
      updatedState.formValues.formState["dcterms__spatial[1]"],
    ).toBeUndefined();
    expect(updatedState.instanceCounts.instanceCounts["dcterms__spatial"]).toBe(
      1,
    );
  });

  test("renders human-readable labels for selected codes in view (read-only) mode", () => {
    const categories = buildCategories(MULTI_CATEGORY_SEARCH_THRESHOLD + 5);
    const store = createTestStore({
      field: {
        name: "dcterms__spatial",
        label: "Location",
        type: ["Text"],
        multiple: true,
        required: false,
        categories,
        children: [],
      },
      initialFormState: {
        "dcterms__spatial[0]": "Q1904",
        "dcterms__spatial[1]": "Q16",
      },
      initialInstanceCounts: {
        dcterms__spatial: 2,
      },
      viewMode: "view",
    });

    render(
      <Provider store={store}>
        <TranslationProvider>
          <FormInputSingle valuePath="dcterms__spatial" />
        </TranslationProvider>
      </Provider>,
    );

    expect(screen.getByText("Ontario")).toBeInTheDocument();
    expect(screen.getByText("Canada")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  test("renders field description only once when mounted via FieldChecker for Array[Text] fields", () => {
    const categories = buildCategories(MULTI_CATEGORY_SEARCH_THRESHOLD + 5);
    const store = createTestStore({
      field: {
        name: "dcterms__spatial",
        label: "Location",
        description: "Spatial characteristics of the resource.",
        type: ["Text"],
        multiple: true,
        required: false,
        categories,
        children: [],
      },
    });

    render(
      <Provider store={store}>
        <TranslationProvider>
          <FieldChecker valuePath="dcterms__spatial" />
        </TranslationProvider>
      </Provider>,
    );

    expect(
      screen.getAllByText("Spatial characteristics of the resource."),
    ).toHaveLength(1);
  });
});
