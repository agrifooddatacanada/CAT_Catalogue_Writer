import React, { createContext, useContext, useState } from "react";
import translations from "./TranslationContent";

const TranslationContext = createContext();

export function TranslationProvider({ children }) {
  const [lang, setLang] = useState("eng");

  function getNestedValue(obj, key) {
    return key.split(".").reduce((o, i) => (o ? o[i] : undefined), obj);
  }

  const t = (key) => getNestedValue(translations[lang], key) || key;

  const value = {
    lang,
    setLang,
    t,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

// Export useTranslation as named export
export function useTranslation() {
  return useContext(TranslationContext);
}
