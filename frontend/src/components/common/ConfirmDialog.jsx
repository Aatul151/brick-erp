import { createContext, useContext, useState, useCallback } from "react";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from "@mui/material";
import Button from "../ui/Button";

const ConfirmContext = createContext(null);

const defaultOptions = {
    title: "Confirm",
    message: "Are you sure?",
    confirmText: "Confirm",
    cancelText: "Cancel",
    confirmVariant: "primary",
    buttonText: "OK",
};

/**
 * ConfirmProvider - Wraps app to enable useConfirm/useAlert
 */
export function ConfirmProvider({ children }) {
    const [state, setState] = useState({
        open: false,
        mode: "confirm", // 'confirm' | 'alert'
        title: defaultOptions.title,
        message: defaultOptions.message,
        confirmText: defaultOptions.confirmText,
        cancelText: defaultOptions.cancelText,
        confirmVariant: defaultOptions.confirmVariant,
        buttonText: defaultOptions.buttonText,
        resolve: null,
    });

    const handleClose = useCallback(() => {
        setState((prev) => {
            if (prev.resolve) prev.resolve(false);
            return { ...prev, open: false, resolve: null };
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setState((prev) => {
            if (prev.resolve) {
                prev.mode === "alert" ? prev.resolve() : prev.resolve(true);
            }
            return { ...prev, open: false, resolve: null };
        });
    }, []);

    const confirm = useCallback((messageOrOptions, options = {}) => {
        // Support both: confirm(message, options) and confirm({ title, message, ... })
        const isObject = messageOrOptions && typeof messageOrOptions === "object" && !Array.isArray(messageOrOptions);
        const opts = isObject ? { ...messageOrOptions, ...options } : { message: messageOrOptions, ...options };
        return new Promise((resolve) => {
            setState({
                open: true,
                mode: "confirm",
                title: opts.title ?? defaultOptions.title,
                message: opts.message ?? defaultOptions.message,
                confirmText: opts.confirmText ?? defaultOptions.confirmText,
                cancelText: opts.cancelText ?? defaultOptions.cancelText,
                confirmVariant: opts.confirmVariant ?? "danger",
                buttonText: opts.buttonText ?? defaultOptions.buttonText,
                resolve,
            });
        });
    }, []);

    const alert = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            setState({
                open: true,
                mode: "alert",
                title: options.title ?? "Notice",
                message: message ?? "",
                confirmText: options.confirmText ?? defaultOptions.confirmText,
                cancelText: options.cancelText ?? defaultOptions.cancelText,
                confirmVariant: options.confirmVariant ?? "primary",
                buttonText: options.buttonText ?? defaultOptions.buttonText,
                resolve: () => resolve(),
            });
        });
    }, []);

    const value = { confirm, alert };

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            <Dialog
                open={state.open}
                onClose={handleClose}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        minWidth: 320,
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 600, fontSize: "1.125rem" }}>{state.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: "text.primary", fontSize: "0.9375rem" }}>{state.message}</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
                    {state.mode === "confirm" ? (
                        <>
                            <Button variant="secondary" onClick={handleClose}>
                                {state.cancelText}
                            </Button>
                            <Button variant={state.confirmVariant} onClick={handleConfirm}>
                                {state.confirmText}
                            </Button>
                        </>
                    ) : (
                        <Button variant="primary" onClick={handleConfirm}>
                            {state.buttonText}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </ConfirmContext.Provider>
    );
}

/**
 * useConfirm - Returns { confirm, alert }
 *
 * confirm(message, options?) -> Promise<boolean>
 *   - Resolves true if user clicks Confirm, false if Cancel
 *   - options: { title, confirmText, cancelText, confirmVariant }
 *
 * alert(message, options?) -> Promise<void>
 *   - Resolves when user clicks OK
 *   - options: { title, buttonText }
 */
export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        throw new Error("useConfirm must be used within ConfirmProvider");
    }
    return ctx;
}
