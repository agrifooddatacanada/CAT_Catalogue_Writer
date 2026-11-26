import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import formValues, { setFieldValue } from "../store/slices/formValueSlice";
import fieldSchema from "../store/slices/fieldSchemaSlice";
import instanceCounts from "../store/slices/instanceCountsSlice";
import mode from "../store/slices/modeSlice";
import uploadFile from "../store/slices/uploadFileSlice";
import formUi from "../store/slices/formUiSlice";
import activePage from "../store/slices/activePageSlice";
import childFormNavigation from "../store/slices/childFormNavigationSlice";
import userContext from "../store/slices/userContextSlice";
import { TranslationProvider } from "../utils/OpenAIRE/TranslationContext";
import { NotificationProvider } from "../components/Stateless/NotificationContext";
import FormPage from "./FormPage";

const datasetSchemaJson = JSON.parse(
  fs.readFileSync(
    path.resolve(
      __dirname,
      "../../public/schemas/hidden/dataset_catalogue_record_OCA_package.json"
    ),
    "utf8"
  )
);

function createTestStore(actionLog) {
  const recorderMiddleware = () => (next) => (action) => {
    actionLog.push(action.type);
    return next(action);
  };
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
    middleware: (getDefault) => getDefault().concat(recorderMiddleware),
  });
}

describe("FormPage embedded edit prefill under React.StrictMode", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.sessionStorage.clear();
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("prefills form from dataUrl under StrictMode and commits schema only once", async () => {
    let resolveFetch;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    global.fetch = jest.fn(() =>
      fetchPromise.then(() => ({
        ok: true,
        status: 200,
        json: async () => datasetSchemaJson,
      }))
    );

    const record = {
      "@context": "http://purl.org/dc/terms/",
      "@type": "Catalogue Record",
      "@schema_id": "ED7BjGJlzWOIBFuInwEtOH0-a7ZDHTUejbK17NJKgPc7",
      d: "EAW25xk5RYjvx-X3j7UiSvTJgAla_3mLF61OHWKeXVJA",
      "dcat.version": "2.0.0",
      dcterms: {
        title: "Soil Moisture Dataset",
        description: "Preloaded soil dataset description",
        type: "dataset",
        identifier: "EXTERNAL_DATA/soil_dataset2.csv",
      },
    };
    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(record)
    )}`;

    const actionLog = [];
    const store = createTestStore(actionLog);

    render(
      <React.StrictMode>
        <Provider store={store}>
          <TranslationProvider>
            <NotificationProvider>
              <MemoryRouter
                initialEntries={[
                  `/form/dataset-catalogue-record?schema=dataset_catalogue_record&iframe=true&mode=edit&isPublished=true&dataUrl=${encodeURIComponent(
                    dataUrl
                  )}`,
                ]}
              >
                <Routes>
                  <Route path="/form/:schemaSlug" element={<FormPage />} />
                </Routes>
              </MemoryRouter>
            </NotificationProvider>
          </TranslationProvider>
        </Provider>
      </React.StrictMode>
    );

    await act(async () => {
      resolveFetch();
      await Promise.resolve();
    });

    await waitFor(() => {
      const state = store.getState();
      expect(state.formValues.formState["dcterms___$dot$___title"]).toBe(
        "Soil Moisture Dataset"
      );
      expect(state.formValues.formState["dcterms___$dot$___description"]).toBe(
        "Preloaded soil dataset description"
      );
      expect(state.formValues.formState["dcat___$dot$___version"]).toBe("2.0.0");
      expect(state.mode.mode).toBe("edit");
    });

    // Schema must be committed to Redux only once (not twice under StrictMode)
    const setFieldsDispatches = actionLog.filter(
      (type) => type === "fieldSchema/setFields"
    );
    expect(setFieldsDispatches).toHaveLength(1);
  });

  test("prefills form from SET_RECORD postMessage received before schema finishes loading", async () => {
    const record = {
      "@context": "http://purl.org/dc/terms/",
      "@type": "Catalogue Record",
      d: "EB2y2lP1s_WrevuexfBMIvxjZ0se6tV4x2oZTZk_yGoZ",
      "dcat.version": "3.1.0",
      dcterms: {
        title: "Milk Aggregation Study",
        description: "Loaded via postMessage before fields ready",
        type: "dataset",
      },
    };

    const actionLog = [];
    const store = createTestStore(actionLog);

    render(
      <React.StrictMode>
        <Provider store={store}>
          <TranslationProvider>
            <NotificationProvider>
              <MemoryRouter
                initialEntries={[
                  `/form/dataset-catalogue-record?schema=dataset_catalogue_record&iframe=true&mode=edit&isPublished=true`,
                ]}
              >
                <Routes>
                  <Route path="/form/:schemaSlug" element={<FormPage />} />
                </Routes>
              </MemoryRouter>
            </NotificationProvider>
          </TranslationProvider>
        </Provider>
      </React.StrictMode>
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "http://localhost:3000",
          data: {
            type: "SET_RECORD",
            record,
            isPublished: true,
            version: "3.1.0",
          },
        })
      );
    });

    await waitFor(() => {
      const state = store.getState();
      expect(state.formValues.formState["dcterms___$dot$___title"]).toBe(
        "Milk Aggregation Study"
      );
      expect(state.formValues.formState["dcterms___$dot$___description"]).toBe(
        "Loaded via postMessage before fields ready"
      );
      expect(state.formValues.formState["dcat___$dot$___version"]).toBe("3.1.0");
      expect(state.mode.mode).toBe("edit");
      expect(state.uploadFile.isPublished).toBe(true);
    });

    const setFieldsDispatches = actionLog.filter(
      (type) => type === "fieldSchema/setFields"
    );
    expect(setFieldsDispatches).toHaveLength(1);
  });

  test("disables Update & Review until at least one prefilled field is modified, and disables again if reverted", async () => {
    const validRecord = {
      "@context": "http://purl.org/dc/terms/",
      "@type": "Catalogue Record",
      "@schema_id": "ED7BjGJlzWOIBFuInwEtOH0-a7ZDHTUejbK17NJKgPc7",
      d: "EAW25xk5RYjvx-X3j7UiSvTJgAla_3mLF61OHWKeXVJA",
      "dcat.version": "2.0.0",
      "dcterms.title": "Soil Moisture Dataset",
      "dcterms.description": "Preloaded soil dataset description",
      "dcterms.type": "Dataset",
      "dcterms.identifier": "EXTERNAL_DATA/soil_dataset2.csv",
      "dcterms.issued": "2025-06-14",
      "dcterms.conformsTo": "https://example.org/schema",
      "dcterms.creator": [{ name: "Liv Tyler" }],
    };

    const actionLog = [];
    const store = createTestStore(actionLog);

    render(
      <React.StrictMode>
        <Provider store={store}>
          <TranslationProvider>
            <NotificationProvider>
              <MemoryRouter
                initialEntries={[
                  `/form/dataset-catalogue-record?schema=dataset_catalogue_record&iframe=true&mode=edit&isPublished=true`,
                ]}
              >
                <Routes>
                  <Route path="/form/:schemaSlug" element={<FormPage />} />
                </Routes>
              </MemoryRouter>
            </NotificationProvider>
          </TranslationProvider>
        </Provider>
      </React.StrictMode>
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "http://localhost:3000",
          data: {
            type: "SET_RECORD",
            record: validRecord,
            isPublished: true,
          },
        })
      );
    });

    const updateButton = await screen.findByRole("button", {
      name: /Update & Review/i,
    });
    expect(updateButton).toBeDisabled();

    // Modifying a field enables Update & Review
    act(() => {
      store.dispatch(
        setFieldValue({
          path: "dcterms___$dot$___title",
          value: "Soil Moisture Dataset (Updated)",
        })
      );
    });
    await waitFor(() => {
      expect(updateButton).toBeEnabled();
    });

    // Reverting the field back to its original preloaded value disables Update & Review again
    act(() => {
      store.dispatch(
        setFieldValue({
          path: "dcterms___$dot$___title",
          value: "Soil Moisture Dataset",
        })
      );
    });
    await waitFor(() => {
      expect(updateButton).toBeDisabled();
    });
  });
});
