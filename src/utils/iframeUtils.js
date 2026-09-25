/**
 * Utility functions for detecting if the application is running inside an iframe.
 */

export function checkIsIframe(searchParams) {
  // Check searchParams first if provided
  if (searchParams && typeof searchParams.get === "function") {
    if (searchParams.get("iframe") === "true") {
      return true;
    }
  }

  // Check window.location directly if available
  if (typeof window !== "undefined" && window.location) {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("iframe") === "true") {
        return true;
      }
    } catch {
      // Ignore URL parsing errors
    }

    // Check window hierarchy
    try {
      if (window.self !== window.top) {
        return true;
      }
    } catch {
      // Cross-origin access error on window.top means we are inside an iframe
      return true;
    }
  }

  return false;
}
