import { configureStore } from "@reduxjs/toolkit";
import formValues from "./slices/formValueSlice";
import fieldSchema from "./slices/fieldSchemaSlice";
import instanceCounts from "./slices/instanceCountsSlice";
import mode from "./slices/modeSlice";
import uploadFile from "./slices/uploadFileSlice";
import formUi from "./slices/formUiSlice";
import activePage from "./slices/activePageSlice";
import childFormNavigation from "./slices/childFormNavigationSlice";

const store = configureStore({
  reducer: {
    fieldSchema,
    formValues,
    instanceCounts,
    mode,
    uploadFile,
    formUi,
    activePage,
    childFormNavigation,
  },
});

export default store;
