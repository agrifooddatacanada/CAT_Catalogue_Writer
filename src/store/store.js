import { configureStore } from "@reduxjs/toolkit";
import formValues from "./slices/formValueSlice";
import fieldSchema from "./slices/fieldSchemaSlice";
import instanceCounts from "./slices/instanceCountsSlice";
import mode from "./slices/modeSlice";

const store = configureStore({
  reducer: {
    fieldSchema,
    formValues,
    instanceCounts,
    mode,
  },
});

export default store;
