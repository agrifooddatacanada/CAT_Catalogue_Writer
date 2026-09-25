import React, { createContext, useContext, useState, useEffect } from "react";
import translations from "./TranslationContent";

const TranslationContext = createContext();

export function normalizeLang(val) {
  if (!val || typeof val !== "string") return null;
  const lower = val.trim().toLowerCase();
  if (
    lower === "fr" ||
    lower === "fra" ||
    lower === "french" ||
    lower.startsWith("fr")
  ) {
    return "fra";
  }
  if (
    lower === "en" ||
    lower === "eng" ||
    lower === "english" ||
    lower.startsWith("en")
  ) {
    return "eng";
  }
  return null;
}

function getInitialLanguage() {
  if (typeof window !== "undefined" && window.location) {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = normalizeLang(
        params.get("lang") || params.get("language"),
      );
      if (urlLang) return urlLang;
    } catch {
      // Ignore URL parsing error
    }
  }
  return "eng";
}

export function TranslationProvider({ children }) {
  const [lang, setLang] = useState(getInitialLanguage);

  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = event.data;
        if (!data) return;

        // Support { type: 'SET_LANGUAGE', lang: 'fra' }, { type: 'CHANGE_LANGUAGE', lang: 'fr' }, { lang: 'fr' }, etc.
        const candidateLang =
          data.lang ||
          data.language ||
          (data.type === "SET_LANGUAGE" ? data.payload : null);
        const resolved = normalizeLang(candidateLang);
        if (resolved) {
          setLang(resolved);
        }
      } catch (err) {
        console.warn("Error handling postMessage language change:", err);
      }
    };

    window.addEventListener("message", handleMessage);

    const handlePopState = () => {
      const urlLang = getInitialLanguage();
      if (urlLang) setLang(urlLang);
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

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
