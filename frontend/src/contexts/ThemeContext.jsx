import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { createTheme } from "@mui/material/styles";
import { useAuth } from "./AuthContext";
import { tenantApi } from "../utils/api/coreapi";

const STORAGE_KEY = "saas-theme-settings";

const defaultSettings = {
    mode: "light",
    primaryColor: "#2563eb",
    secondaryColor: "#64748b",
};

function loadSettings() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                mode: parsed.mode ?? defaultSettings.mode,
                primaryColor: parsed.primaryColor ?? defaultSettings.primaryColor,
                secondaryColor: parsed.secondaryColor ?? defaultSettings.secondaryColor,
            };
        }
    } catch (e) {
        console.warn("Failed to load theme settings:", e);
    }
    return { ...defaultSettings };
}

function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn("Failed to save theme settings:", e);
    }
}

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const { user, isSiteAdmin, updateUser } = useAuth();
    const [localSettings, setLocalSettings] = useState(loadSettings);

    const isTenantUser = user?.tenantId && !isSiteAdmin();
    const tenantTheme = user?.tenantThemeSetting && typeof user.tenantThemeSetting === "object" ? user.tenantThemeSetting : null;

    const settings = useMemo(() => {
        if (isTenantUser) {
            const t = tenantTheme || {};
            return {
                mode: t.mode ?? defaultSettings.mode,
                primaryColor: t.primaryColor ?? defaultSettings.primaryColor,
                secondaryColor: t.secondaryColor ?? defaultSettings.secondaryColor,
            };
        }
        return localSettings;
    }, [isTenantUser, tenantTheme, localSettings]);

    useEffect(() => {
        if (!isTenantUser) {
            saveSettings(localSettings);
        }
    }, [isTenantUser, localSettings]);

    const updateTheme = (updates) => {
        if (isTenantUser) {
            return;
        }
        setLocalSettings((prev) => ({ ...prev, ...updates }));
    };

    const toggleMode = async () => {
        const newMode = settings.mode === "light" ? "dark" : "light";
        if (isTenantUser) {
            try {
                await tenantApi.updateMyTenantThemeMode(newMode);
                const t = tenantTheme || {};
                updateUser({ tenantThemeSetting: { ...t, mode: newMode } });
            } catch (e) {
                console.error("Failed to update theme mode:", e);
            }
        } else {
            setLocalSettings((prev) => ({ ...prev, mode: newMode }));
        }
    };

    const value = useMemo(
        () => ({
            ...settings,
            updateTheme,
            toggleMode,
            isTenantUser,
            isSiteAdmin: isSiteAdmin(),
        }),
        [settings, isTenantUser],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeSettings() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error("useThemeSettings must be used within ThemeProvider");
    }
    return ctx;
}

export function createAppTheme(settings) {
    return createTheme({
        palette: {
            mode: settings.mode,
            primary: { main: settings.primaryColor },
            secondary: { main: settings.secondaryColor },
        },
    });
}
