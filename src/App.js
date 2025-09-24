import React from "react";
import HomePage from "./pages/HomePage";
import FormPage from "./pages/FormPage";
import ReviewPage from "./pages/ReviewPage";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/form" element={<FormPage />} />
        <Route path="/review" element={<ReviewPage />} />
      </Routes>
    </Router>
  );
}

export default App;