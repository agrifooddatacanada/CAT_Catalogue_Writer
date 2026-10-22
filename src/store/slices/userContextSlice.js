import { createSlice } from "@reduxjs/toolkit";

function getInitialUserContext() {
  let orcid = "";
  let name = "";
  let orcidVerified = false;
  let isContextHub = false;

  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlOrcid = params.get("userOrcid");
      const urlName = params.get("userName");
      const urlVerified = params.get("orcidVerified") === "true";
      const isIframe =
        params.get("iframe") === "true" ||
        (window.self !== window.top);

      if (urlOrcid) {
        orcid = urlOrcid;
        sessionStorage.setItem("contexthub_user_orcid", urlOrcid);
      } else {
        orcid = sessionStorage.getItem("contexthub_user_orcid") || "";
      }

      if (urlName) {
        name = urlName;
        sessionStorage.setItem("contexthub_user_name", urlName);
      } else {
        name = sessionStorage.getItem("contexthub_user_name") || "";
      }

      if (params.has("orcidVerified")) {
        orcidVerified = urlVerified;
        sessionStorage.setItem(
          "contexthub_orcid_verified",
          String(urlVerified)
        );
      } else {
        orcidVerified =
          sessionStorage.getItem("contexthub_orcid_verified") === "true";
      }

      isContextHub = isIframe || !!orcid;
    } catch {
      // Ignore sessionStorage or URL parsing issues
    }
  }

  return {
    orcid,
    name,
    orcidVerified,
    isContextHub,
  };
}

const userContextSlice = createSlice({
  name: "userContext",
  initialState: getInitialUserContext(),
  reducers: {
    setUserContext: (state, action) => {
      const { orcid, name, orcidVerified } = action.payload || {};
      if (orcid !== undefined) state.orcid = orcid;
      if (name !== undefined) state.name = name;
      if (orcidVerified !== undefined) {
        state.orcidVerified = Boolean(orcidVerified);
      }
      state.isContextHub = true;

      try {
        if (orcid) sessionStorage.setItem("contexthub_user_orcid", orcid);
        if (name) sessionStorage.setItem("contexthub_user_name", name);
        if (orcidVerified !== undefined) {
          sessionStorage.setItem(
            "contexthub_orcid_verified",
            String(orcidVerified)
          );
        }
      } catch {
        // Ignore storage errors
      }
    },
  },
});

export const { setUserContext } = userContextSlice.actions;
export const selectUserContext = (state) => state.userContext;
export default userContextSlice.reducer;
