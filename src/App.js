import React, { Suspense, lazy, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Box, CircularProgress } from "@mui/material";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { setUserContext } from "./store/slices/userContextSlice";
import { TranslationProvider } from "./utils/OpenAIRE/TranslationContext";
import { NotificationProvider } from "./components/Stateless/NotificationContext";
import ErrorBoundary from "./components/Stateless/ErrorBoundary";
import HomePage from "./pages/HomePage";
import FormPage from "./pages/FormPage";
import {
  isAllowedOrigin,
  rememberVerifiedOrigin,
  safePostMessage,
  safeSessionRemove,
  safeSessionSet,
} from "./utils/postMessageSecurity";

const ViewPage = lazy(() => import("./pages/ViewPage"));
const ViewHelpPage = lazy(() => import("./pages/ViewHelpPage"));
const FormHelpPage = lazy(() => import("./pages/FormHelpPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function RouteFallback() {
  return (
    <Box
      sx={{
        minHeight: "50vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
      }}
      role="status"
      aria-live="polite"
    >
      <CircularProgress />
    </Box>
  );
}

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleMessage = (event) => {
      if (!isAllowedOrigin(event.origin)) return;
      rememberVerifiedOrigin(event.origin);

      try {
        const data = event.data;
        if (!data || typeof data !== "object") return;

        if (data.type === "SET_USER_CONTEXT") {
          const user = data.user || data.payload || data;
          dispatch(
            setUserContext({
              orcid: user.orcid || "",
              name: user.name || user.displayName || "",
              orcidVerified: Boolean(user.orcidVerified),
            })
          );
        }

        if (data.type === "CLEAR_RECORD") {
          safeSessionRemove("contexthub_pending_record");
          safeSessionRemove("contexthub_pending_upgrade");
          safeSessionRemove("contexthub_is_published");
          return;
        }

        if (data.type === "UPGRADE_RECORD" || data.upgrade === true) {
          const record = data.record || data.data || data.payload;
          if (data.isPublished !== undefined) {
            safeSessionSet("contexthub_is_published", String(Boolean(data.isPublished)));
          }
          if (record && typeof record === "object") {
            safeSessionSet(
              "contexthub_pending_upgrade",
              JSON.stringify({
                record,
                sourceSchemaId: data.sourceSchemaId || record["@schema_id"] || null,
                targetSchemaId: data.targetSchemaId || null,
                isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
                version: data.version || null,
              })
            );
          }
          return;
        }

        if (
          data.type === "SET_RECORD" ||
          data.type === "LOAD_RECORD" ||
          data.type === "SET_DATA" ||
          data.type === "SET_CATALOGUE_RECORD" ||
          data.type === "IMPORT_RECORD" ||
          data.type === "PREFILL_RECORD" ||
          data.type === "PREFILL" ||
          data.action === "LOAD_RECORD"
        ) {
          const record = data.record || data.data || data.payload;
          if (data.isPublished !== undefined) {
            safeSessionSet("contexthub_is_published", String(Boolean(data.isPublished)));
          }
          if (record && typeof record === "object") {
            safeSessionSet("contexthub_pending_record", JSON.stringify(record));
          }
        }
      } catch (err) {
        console.warn("Error handling user context message:", err);
      }
    };

    window.addEventListener("message", handleMessage);

    // Non-sensitive handshake requests to ContextHub host window
    if (window.parent && window.parent !== window) {
      safePostMessage(window.parent, { type: "REQUEST_USER_CONTEXT" }, { allowWildcardFallback: true });
      safePostMessage(window.parent, { type: "REQUEST_RECORD" }, { allowWildcardFallback: true });
    } else if (window.opener && window.opener !== window && !window.opener.closed) {
      safePostMessage(window.opener, { type: "REQUEST_USER_CONTEXT" }, { allowWildcardFallback: true });
      safePostMessage(window.opener, { type: "REQUEST_RECORD" }, { allowWildcardFallback: true });
    }

    return () => window.removeEventListener("message", handleMessage);
  }, [dispatch]);

  return (
    <ErrorBoundary>
      <TranslationProvider>
        <NotificationProvider>
          <Router>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/form" element={<FormPage />} />
                <Route path="/form/:schemaSlug" element={<FormPage />} />
                <Route path="/view" element={<ViewPage />} />
                <Route path="/view-help" element={<ViewHelpPage />} />
                <Route path="/form-help" element={<FormHelpPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </Router>
        </NotificationProvider>
      </TranslationProvider>
    </ErrorBoundary>
  );
}

export default App;
