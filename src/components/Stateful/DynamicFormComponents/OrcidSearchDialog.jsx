import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Alert, Box, Button, Chip, CircularProgress, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useTranslation } from "../../../utils/OpenAIRE/TranslationContext";
import {
  checkDuplicateContributorOrcid,
  extractCleanOrcid,
  searchOrcidRegistry,
} from "../../../utils/orcidUtils";
import "./OrcidSearchDialog.css";

const PAGE_SIZE = 10;
const MAX_VISIBLE_AFFILIATIONS = 3;

const OrcidSearchDialog = ({
  open,
  onClose,
  onSelectOrcid,
  initialQuery = "",
  currentOrcidValue = "",
  allFormValues = null,
  valuePath = "",
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const queryInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const titleId = useId();
  const captionId = useId();
  const nameInputId = useId();
  const affiliationInputId = useId();

  const [query, setQuery] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [submittedAffiliation, setSubmittedAffiliation] = useState("");
  const [page, setPage] = useState(0);
  const [results, setResults] = useState([]);
  const [numFound, setNumFound] = useState(0);
  const [isBroadMatch, setIsBroadMatch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedAffiliations, setExpandedAffiliations] = useState({});

  const cleanCurrentOrcid = extractCleanOrcid(currentOrcidValue);

  const runSearch = useCallback(async (searchText, affText, pageIndex = 0, forceBroad = false) => {
    const trimmedQuery = String(searchText || "").trim();
    const trimmedAff = String(affText || "").trim();

    if (!trimmedQuery && !trimmedAff) {
      setResults([]);
      setNumFound(0);
      setIsBroadMatch(false);
      setError(null);
      setHasSearched(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setSubmittedQuery(trimmedQuery);
    setSubmittedAffiliation(trimmedAff);
    setPage(pageIndex);

    const res = await searchOrcidRegistry({
      query: trimmedQuery,
      affiliation: trimmedAff,
      start: pageIndex * PAGE_SIZE,
      rows: PAGE_SIZE,
      signal: controller.signal,
      broad: forceBroad,
    });

    if (res.aborted) return;

    setIsLoading(false);
    if (res.error) {
      setError(res.error);
      setResults([]);
      setNumFound(0);
      setIsBroadMatch(false);
    } else {
      setError(null);
      setResults(res.results);
      setNumFound(res.numFound);
      setIsBroadMatch(Boolean(res.isBroadMatch));
      setExpandedAffiliations({});
    }
  }, []);

  // Open/close native <dialog> via showModal()/close()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
      const trimmedInit = String(initialQuery || "").trim();
      setQuery(trimmedInit);
      setAffiliation("");
      setError(null);
      setExpandedAffiliations({});
      if (trimmedInit) {
        runSearch(trimmedInit, "", 0, false);
      } else {
        setResults([]);
        setNumFound(0);
        setHasSearched(false);
        setSubmittedQuery("");
        setSubmittedAffiliation("");
        setPage(0);
      }
      requestAnimationFrame(() => {
        queryInputRef.current?.focus();
      });
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, initialQuery, runSearch]);

  // Sync React state when native <dialog> closes (Esc, close button, light dismiss)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      onClose?.();
    };

    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  // Fallback light-dismiss for browsers without native dialog.closedBy (e.g. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof HTMLDialogElement !== "undefined" && "closedBy" in HTMLDialogElement.prototype) {
      return;
    }

    const isOutside = (e) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    let pressedOutside = false;
    const handlePointerDown = (e) => {
      pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e) => {
      if (pressedOutside && isOutside(e) && dialog.open) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    runSearch(query, affiliation, 0, false);
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 0 || nextPage * PAGE_SIZE >= numFound || isLoading) return;
    runSearch(submittedQuery, submittedAffiliation, nextPage, isBroadMatch);
  };

  const handleSelect = (item) => {
    onSelectOrcid?.(item);
    if (dialogRef.current?.open) {
      dialogRef.current.close("selected");
    }
  };

  const toggleAffiliations = (orcidId) => {
    setExpandedAffiliations((prev) => ({
      ...prev,
      [orcidId]: !prev[orcidId],
    }));
  };

  const firstNameLabel = t("orcid.col_first_name") || "First Name";
  const lastNameLabel = t("orcid.col_last_name") || "Last Name";
  const otherNamesLabel = t("orcid.col_other_names") || "Other Names";
  const affiliationsLabel = t("orcid.col_affiliations") || "Affiliations";

  const externalSearchTerm = [query.trim(), affiliation.trim()].filter(Boolean).join(" ");
  const externalOrcidSearchUrl = externalSearchTerm
    ? `https://orcid.org/orcid-search/search?searchQuery=${encodeURIComponent(externalSearchTerm)}`
    : "https://orcid.org/orcid-search/search";

  const startIdx = numFound === 0 ? 0 : page * PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * PAGE_SIZE, numFound);
  const totalPages = Math.ceil(numFound / PAGE_SIZE);

  const dialogElement = (
    <dialog
      ref={dialogRef}
      className="orcid-search-dialog"
      aria-labelledby={titleId}
      closedby="any"
    >
      {/* Header */}
      <div className="orcid-dialog-header">
        <div className="orcid-dialog-title-group">
          <span className="orcid-badge-circle" aria-hidden="true">
            iD
          </span>
          <h1 id={titleId} className="orcid-dialog-title">
            {t("orcid.search_dialog_title") || "Search ORCID Registry"}
          </h1>
        </div>
        <button
          type="button"
          className="orcid-dialog-close-btn"
          onClick={() => dialogRef.current?.close()}
          aria-label={t("orcid.close_search") || "Close ORCID search"}
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </button>
      </div>

      {/* Search Bar */}
      <form className="orcid-search-form" onSubmit={handleSubmit}>
        <div className="orcid-search-field">
          <label htmlFor={nameInputId} className="orcid-search-label">
            {t("orcid.search_name_label") || "Name, keyword, or ORCID iD"}
          </label>
          <input
            ref={queryInputRef}
            id={nameInputId}
            type="search"
            className="orcid-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              t("orcid.search_name_placeholder") || "e.g. Niraj Patil or 0000-0002-1825-0097"
            }
            autoFocus
          />
        </div>

        <div className="orcid-search-field orcid-search-field--affiliation">
          <label htmlFor={affiliationInputId} className="orcid-search-label">
            {t("orcid.search_affiliation_label") || "Affiliation (optional)"}
          </label>
          <input
            id={affiliationInputId}
            type="search"
            className="orcid-search-input"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            placeholder={
              t("orcid.search_affiliation_placeholder") || "e.g. University of Guelph"
            }
          />
        </div>

        <div className="orcid-search-actions">
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={isLoading || (!query.trim() && !affiliation.trim())}
            startIcon={
              isLoading ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <SearchIcon sx={{ fontSize: 16 }} />
              )
            }
            sx={{
              height: 36,
              backgroundColor: "#A6CE39",
              color: "#1b3806",
              fontWeight: 700,
              textTransform: "none",
              px: 2,
              boxShadow: "none",
              "&:hover": {
                backgroundColor: "#93b831",
                boxShadow: "none",
              },
            }}
          >
            {isLoading
              ? t("orcid.searching") || "Searching..."
              : t("orcid.search_button") || "Search"}
          </Button>
        </div>
      </form>

      {/* Body */}
      <div className="orcid-dialog-body">
        {error && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => runSearch(submittedQuery || query, submittedAffiliation || affiliation, page, isBroadMatch)}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {t("orcid.retry") || "Retry"}
              </Button>
            }
            sx={{ py: 0.5, fontSize: "0.8rem" }}
          >
            {error}
          </Alert>
        )}

        {hasSearched && !isLoading && !error && (
          <div className="orcid-results-meta">
            <span>
              {numFound > 0
                ? `${t("orcid.showing") || "Showing"} ${startIdx}–${endIdx} ${t("orcid.of") || "of"} ${numFound.toLocaleString()} ${t("orcid.results") || "results"}`
                : t("orcid.no_results_found") || "No matching ORCID records found."}
            </span>
            {isBroadMatch && numFound > 0 && (
              <Chip
                size="small"
                label={t("orcid.broad_match_hint") || "Showing closest partial matches"}
                variant="outlined"
                sx={{ height: 20, fontSize: "0.7rem", color: "#4b5563" }}
              />
            )}
          </div>
        )}

        {isLoading ? (
          <div className="orcid-empty-state" role="status" aria-live="polite">
            <CircularProgress size={28} sx={{ color: "#2e7d32" }} />
            <Typography variant="body2" color="text.secondary">
              {t("orcid.searching_registry") || "Searching the ORCID Registry..."}
            </Typography>
          </div>
        ) : !hasSearched ? (
          <div className="orcid-empty-state">
            <SearchIcon sx={{ fontSize: 32, color: "#9ca3af" }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "#374151" }}>
              {t("orcid.search_prompt_title") || "Find a contributor in the ORCID Registry"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 440 }}>
              {t("orcid.search_prompt_desc") ||
                "Enter a person's name (and optionally their institution/affiliation) to view matching ORCID iDs, other names, and affiliations."}
            </Typography>
          </div>
        ) : results.length === 0 && !error ? (
          <div className="orcid-empty-state">
            <Typography variant="body2" sx={{ fontWeight: 600, color: "#374151" }}>
              {t("orcid.no_results_found") || "No matching ORCID records found."}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("orcid.no_results_hint") ||
                "Try searching with only a first and last name, or broaden the affiliation filter."}
            </Typography>
          </div>
        ) : results.length > 0 ? (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={captionId}
            className="orcid-table-wrapper"
          >
            <table
              className="orcid-results-table"
              style={{
                "--label-first-name": `"${firstNameLabel.replace(/"/g, '\\"')}"`,
                "--label-last-name": `"${lastNameLabel.replace(/"/g, '\\"')}"`,
                "--label-other-names": `"${otherNamesLabel.replace(/"/g, '\\"')}"`,
                "--label-affiliations": `"${affiliationsLabel.replace(/"/g, '\\"')}"`,
              }}
            >
              <caption id={captionId} className="orcid-sr-only">
                {t("orcid.table_caption") || "ORCID Registry search results"}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t("orcid.col_orcid_id") || "ORCID iD"}</th>
                  <th scope="col">{firstNameLabel}</th>
                  <th scope="col">{lastNameLabel}</th>
                  <th scope="col">{otherNamesLabel}</th>
                  <th scope="col">{affiliationsLabel}</th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    {t("orcid.col_action") || "Action"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((item) => {
                  const isCurrentFieldSelection =
                    cleanCurrentOrcid && cleanCurrentOrcid === item.orcidId;
                  const dupInfo =
                    allFormValues && valuePath
                      ? checkDuplicateContributorOrcid(allFormValues, valuePath, item.orcidId)
                      : { isDuplicate: false };
                  const isExpanded = Boolean(expandedAffiliations[item.orcidId]);
                  const visibleAffiliations = isExpanded
                    ? item.affiliations
                    : item.affiliations.slice(0, MAX_VISIBLE_AFFILIATIONS);
                  const remainingAffCount =
                    item.affiliations.length - visibleAffiliations.length;

                  return (
                    <tr key={item.orcidId}>
                      <th scope="row">
                        <a
                          href={`https://orcid.org/${item.orcidId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="orcid-id-link"
                          title={t("orcid.view_profile_new_tab") || "Open ORCID profile in new tab"}
                        >
                          <span
                            className="orcid-badge-circle orcid-badge-circle--sm"
                            aria-hidden="true"
                          >
                            iD
                          </span>
                          <span>{item.orcidId}</span>
                          <OpenInNewIcon sx={{ fontSize: 12 }} />
                        </a>
                      </th>
                      <td>
                        {item.givenNames || <span className="orcid-cell-muted">—</span>}
                      </td>
                      <td>
                        {item.familyNames || <span className="orcid-cell-muted">—</span>}
                      </td>
                      <td>
                        {item.otherNames.length > 0 ? (
                          item.otherNames.join(", ")
                        ) : (
                          <span className="orcid-cell-muted">—</span>
                        )}
                      </td>
                      <td>
                        {item.affiliations.length > 0 ? (
                          <div className="orcid-affiliations-list">
                            {visibleAffiliations.map((aff, idx) => (
                              <span key={`${item.orcidId}-aff-${idx}`}>{aff}</span>
                            ))}
                            {remainingAffCount > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleAffiliations(item.orcidId)}
                                style={{
                                  alignSelf: "flex-start",
                                  border: "none",
                                  background: "none",
                                  padding: 0,
                                  color: "#2e7d32",
                                  fontSize: "0.74rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                +{remainingAffCount} {t("orcid.more_affiliations") || "more"}
                              </button>
                            )}
                            {isExpanded && item.affiliations.length > MAX_VISIBLE_AFFILIATIONS && (
                              <button
                                type="button"
                                onClick={() => toggleAffiliations(item.orcidId)}
                                style={{
                                  alignSelf: "flex-start",
                                  border: "none",
                                  background: "none",
                                  padding: 0,
                                  color: "#4b5563",
                                  fontSize: "0.74rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                {t("forminputsingle.show_less") || "Show less"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="orcid-cell-muted">—</span>
                        )}
                      </td>
                      <td className="orcid-action-cell">
                        {dupInfo.isDuplicate ? (
                          <Chip
                            size="small"
                            label={t("orcid.already_added") || "Already Added"}
                            color="warning"
                            variant="outlined"
                            sx={{ height: 24, fontSize: "0.72rem", fontWeight: 600 }}
                          />
                        ) : isCurrentFieldSelection ? (
                          <Chip
                            size="small"
                            icon={
                              <CheckCircleIcon
                                sx={{ fontSize: 15, color: "#2e7d32 !important" }}
                              />
                            }
                            label={t("orcid.selected") || "Selected"}
                            variant="outlined"
                            sx={{
                              height: 24,
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              borderColor: "#A6CE39",
                              color: "#2e7d32",
                              backgroundColor: "rgba(166, 206, 57, 0.12)",
                            }}
                          />
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleSelect(item)}
                            sx={{
                              backgroundColor: "#A6CE39",
                              color: "#1b3806",
                              fontWeight: 700,
                              textTransform: "none",
                              fontSize: "0.75rem",
                              py: 0.35,
                              px: 1.25,
                              minWidth: 0,
                              boxShadow: "none",
                              "&:hover": {
                                backgroundColor: "#93b831",
                                boxShadow: "none",
                              },
                            }}
                          >
                            {t("orcid.select_orcid") || "Select"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="orcid-dialog-footer">
        <a
          href={externalOrcidSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="orcid-external-link"
        >
          <span>{t("orcid.open_on_orcid") || "Open full search on orcid.org"}</span>
          <OpenInNewIcon sx={{ fontSize: 13 }} />
        </a>

        <Box className="orcid-pagination">
          {totalPages > 1 && (
            <>
              <Button
                size="small"
                variant="outlined"
                disabled={page === 0 || isLoading}
                onClick={() => handlePageChange(page - 1)}
                startIcon={<ChevronLeftIcon sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: "none",
                  fontSize: "0.75rem",
                  py: 0.25,
                  px: 1,
                  minWidth: 0,
                  borderColor: "#cbd5e1",
                  color: "#374151",
                }}
              >
                {t("orcid.prev_page") || "Prev"}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {page + 1} / {totalPages.toLocaleString()}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                disabled={(page + 1) * PAGE_SIZE >= numFound || isLoading}
                onClick={() => handlePageChange(page + 1)}
                endIcon={<ChevronRightIcon sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: "none",
                  fontSize: "0.75rem",
                  py: 0.25,
                  px: 1,
                  minWidth: 0,
                  borderColor: "#cbd5e1",
                  color: "#374151",
                }}
              >
                {t("orcid.next_page") || "Next"}
              </Button>
            </>
          )}
          <Button
            size="small"
            variant="text"
            onClick={() => dialogRef.current?.close()}
            sx={{
              textTransform: "none",
              fontSize: "0.78rem",
              color: "#4b5563",
              ml: 0.5,
            }}
          >
            {t("popup.cancel") || "Cancel"}
          </Button>
        </Box>
      </div>
    </dialog>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(dialogElement, document.body);
};

export default OrcidSearchDialog;
