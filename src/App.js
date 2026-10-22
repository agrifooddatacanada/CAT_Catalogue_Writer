import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setUserContext } from "./store/slices/userContextSlice";
import HomePage from "./pages/HomePage";
import FormPage from "./pages/FormPage";
import ViewPage from "./pages/ViewPage";
import ViewHelpPage from "./pages/ViewHelpPage";
import FormHelpPage from "./pages/FormHelpPage";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { TranslationProvider } from "./utils/OpenAIRE/TranslationContext";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleMessage = (event) => {
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
      } catch (err) {
        console.warn("Error handling user context message:", err);
      }
    };

    window.addEventListener("message", handleMessage);

    // If embedded, ask parent ContextHub window for the user context
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "REQUEST_USER_CONTEXT" }, "*");
    } else if (window.opener && window.opener !== window && !window.opener.closed) {
      try {
        window.opener.postMessage({ type: "REQUEST_USER_CONTEXT" }, "*");
      } catch (err) {
        console.warn("Could not request user context from opener:", err);
      }
    }

    return () => window.removeEventListener("message", handleMessage);
  }, [dispatch]);

  return (
    <TranslationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/form" element={<FormPage />} />
          <Route path="/form/:schemaSlug" element={<FormPage />} />
          {/* <Route path="/form-q-test" element={<FormPage />} />
          <Route path="/form-schema-cat-rec" element={<FormPage />} />
          <Route path="/form-dublincore-repository" element={<FormPage />} />
          <Route path="/form-dublincore-project" element={<FormPage />} />
          <Route path="/form-datacite" element={<FormPage />} />
          <Route path="/form-dcat-demo" element={<FormPage />} />
          <Route path="/form-project-minimal" element={<FormPage />} />
          <Route path="/form-raid-project" element={<FormPage />} /> */}
          <Route path="/view" element={<ViewPage />} />
          <Route path="/view-help" element={<ViewHelpPage />} />
          <Route path="/form-help" element={<FormHelpPage />} />
        </Routes>
      </Router>
    </TranslationProvider>
  );
}

export default App;
