/**
 * Security & safe storage helpers for cross-window postMessage communication
 * and sessionStorage access in embedded iframe contexts.
 */

const EXACT_ALLOWED_ORIGINS = new Set([
  "https://csdcc.datacontexthub.org",
  "https://contexthub-dev.climatesmartagrifood.ca",
]);

let lastVerifiedHostOrigin = null;

/**
 * Validates whether an origin matches the allowlisted ContextHub / Semantic Engine
 * origins (aligned with staticwebapp.config.json frame-ancestors).
 */
export function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== "string" || origin === "null") {
    return false;
  }

  if (typeof window !== "undefined" && origin === window.location.origin) {
    return true;
  }

  if (EXACT_ALLOWED_ORIGINS.has(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return true;
    }
    if (
      parsed.protocol === "https:" &&
      (parsed.hostname === "semanticengine.org" ||
        parsed.hostname.endsWith(".semanticengine.org"))
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Records a verified origin from an incoming postMessage event so outbound replies
 * target that specific origin instead of "*".
 */
export function rememberVerifiedOrigin(origin) {
  if (isAllowedOrigin(origin)) {
    lastVerifiedHostOrigin = origin;
  }
}

/**
 * Resolves the safest targetOrigin for outbound postMessage calls.
 * Falls back to document.referrer origin if allowlisted.
 */
export function getTrustedTargetOrigin({ allowWildcardFallback = false } = {}) {
  if (lastVerifiedHostOrigin && isAllowedOrigin(lastVerifiedHostOrigin)) {
    return lastVerifiedHostOrigin;
  }

  if (typeof document !== "undefined" && document.referrer) {
    try {
      const refOrigin = new URL(document.referrer).origin;
      if (isAllowedOrigin(refOrigin)) {
        lastVerifiedHostOrigin = refOrigin;
        return refOrigin;
      }
    } catch {
      // Ignore invalid referrer
    }
  }

  return allowWildcardFallback ? "*" : null;
}

/**
 * Sends a postMessage to a target window using a verified targetOrigin.
 * For non-sensitive handshake requests (e.g. REQUEST_USER_CONTEXT), wildcard fallback
 * may be permitted when referrer is stripped by browser Referrer-Policy.
 */
export function safePostMessage(
  targetWindow,
  payload,
  { allowWildcardFallback = false } = {}
) {
  if (!targetWindow || targetWindow === window) return false;
  const targetOrigin = getTrustedTargetOrigin({ allowWildcardFallback });
  if (!targetOrigin) return false;

  try {
    targetWindow.postMessage(payload, targetOrigin);
    return true;
  } catch (err) {
    console.warn("Failed to post message to host window:", err);
    return false;
  }
}

/**
 * Validates that a dataUrl parameter uses a safe protocol before fetching.
 */
export function isSafeDataUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.startsWith("data:application/json")) return true;
  if (trimmed.startsWith("/")) return true;

  try {
    const parsed = new URL(trimmed, typeof window !== "undefined" ? window.location.origin : undefined);
    if (parsed.protocol === "https:") return true;
    if (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function safeSessionGet(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSessionSet(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeSessionRemove(key) {
  try {
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
