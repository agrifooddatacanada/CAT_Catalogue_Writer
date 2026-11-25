import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from "@mui/material";
import { useTranslation } from "../../utils/OpenAIRE/TranslationContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { t } = useTranslation();

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "info",
    duration: 5000,
  });

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "",
    cancelLabel: "",
    confirmColor: "error",
  });
  const confirmResolverRef = useRef(null);

  const notify = useCallback((message, severity = "info", duration = 5000) => {
    setToast({
      open: true,
      message: String(message || ""),
      severity,
      duration,
    });
  }, []);

  const handleCloseToast = (_, reason) => {
    if (reason === "clickaway") return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  const confirm = useCallback(
    ({
      title,
      message,
      confirmLabel,
      cancelLabel,
      confirmColor = "error",
    } = {}) =>
      new Promise((resolve) => {
        confirmResolverRef.current = resolve;
        setConfirmState({
          open: true,
          title: title || t("common.confirm"),
          message: message || "",
          confirmLabel: confirmLabel || t("common.confirm"),
          cancelLabel: cancelLabel || t("common.cancel"),
          confirmColor,
        });
      }),
    [t]
  );

  const resolveConfirm = useCallback((accepted) => {
    setConfirmState((prev) => ({ ...prev, open: false }));
    if (confirmResolverRef.current) {
      confirmResolverRef.current(accepted);
      confirmResolverRef.current = null;
    }
  }, []);

  const value = useMemo(
    () => ({
      notify,
      confirm,
    }),
    [notify, confirm]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      <Snackbar
        open={toast.open}
        autoHideDuration={toast.duration}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", maxWidth: 560 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={confirmState.open}
        onClose={() => resolveConfirm(false)}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="confirm-dialog-title">{confirmState.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            {confirmState.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => resolveConfirm(false)} color="inherit">
            {confirmState.cancelLabel}
          </Button>
          <Button
            onClick={() => resolveConfirm(true)}
            variant="contained"
            color={confirmState.confirmColor}
            autoFocus
          >
            {confirmState.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </NotificationContext.Provider>
  );
}

const fallbackContext = {
  notify: (msg) => {
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(msg);
    }
  },
  confirm: async ({ message }) => {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      return window.confirm(message || "");
    }
    return true;
  },
};

export function useNotification() {
  const ctx = useContext(NotificationContext);
  return ctx || fallbackContext;
}
