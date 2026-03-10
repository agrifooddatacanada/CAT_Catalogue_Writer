import { configureStore } from "@reduxjs/toolkit";
import formValues from "./slices/formValueSlice";
import fieldSchema from "./slices/fieldSchemaSlice";
import instanceCounts from "./slices/instanceCountsSlice";
import mode from "./slices/modeSlice";
import uploadFile from "./slices/uploadFileSlice";

const store = configureStore({
  reducer: {
    fieldSchema,
    formValues,
    instanceCounts,
    mode,
    uploadFile,
  },
});

export default store;
