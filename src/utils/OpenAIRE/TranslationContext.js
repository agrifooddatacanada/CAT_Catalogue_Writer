import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import translations from "./TranslationContent";
import {
  isAllowedOrigin,
  rememberVerifiedOrigin,
  safeLocalGet,
  safeLocalSet,
} from "../postMessageSecurity";

const TranslationContext = createContext();
const LANG_STORAGE_KEY = "cat_catalogue_writer_lang";

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

    const persisted = normalizeLang(safeLocalGet(LANG_STORAGE_KEY));
    if (persisted) return persisted;
  }
  return "eng";
}

function getNestedValue(obj, key) {
  return key.split(".").reduce((o, i) => (o ? o[i] : undefined), obj);
}

export function TranslationProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLanguage);

  const setLang = useCallback((nextLang) => {
    const resolved = normalizeLang(nextLang) || "eng";
    setLangState(resolved);
    safeLocalSet(LANG_STORAGE_KEY, resolved);
  }, []);

  // Keep <html lang="en|fr"> synchronized for screen readers & browsers (WCAG 3.1.1)
  useEffect(() => {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = lang === "fra" ? "fr" : "en";
    }
  }, [lang]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (!isAllowedOrigin(event.origin)) return;
      rememberVerifiedOrigin(event.origin);
      try {
        const data = event.data;
        if (!data || typeof data !== "object") return;

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
      if (typeof window !== "undefined" && window.location) {
        try {
          const params = new URLSearchParams(window.location.search);
          const urlLang = normalizeLang(
            params.get("lang") || params.get("language"),
          );
          if (urlLang) setLangState(urlLang);
        } catch {
          // Ignore URL parsing error
        }
      }
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [setLang]);

  const t = useCallback(
    (key) => {
      const value = getNestedValue(translations[lang], key);
      if (value !== undefined) return value;
      const fallback = getNestedValue(translations.eng, key);
      return fallback !== undefined ? fallback : key;
    },
    [lang],
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
    }),
    [lang, setLang, t],
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
