import React from "react";
import HomePage from "./pages/HomePage";
import FormPage from "./pages/FormPage";
import ViewPage from "./pages/ViewPage";
import ViewHelpPage from "./pages/ViewHelpPage";
import FormHelpPage from "./pages/FormHelpPage";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { TranslationProvider } from "./utils/OpenAIRE/TranslationContext";

function App() {
  return (
    <TranslationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/form" element={<FormPage />} />
          <Route path="/form-dublincore-repository" element={<FormPage />} />
          <Route path="/form-dublincore-project" element={<FormPage />} />
          <Route path="/form-datacite" element={<FormPage />} />
          <Route path="/view" element={<ViewPage />} />
          <Route path="/view-help" element={<ViewHelpPage />} />
          <Route path="/form-help" element={<FormHelpPage />} />
        </Routes>
      </Router>
    </TranslationProvider>
  );
}

export default App;