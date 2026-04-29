import { useEffect } from "react";
import { useTheme } from "@mui/material/styles";

/**
 * Syncs MUI theme colors to CSS variables so Tailwind/custom CSS can use them.
 * Enables theme-aware styling for components using class names.
 */
export function ThemeSync() {
    const theme = useTheme();

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty("--primary-main", theme.palette.primary.main);
        root.style.setProperty("--secondary-main", theme.palette.secondary?.main || "#64748b");
    }, [theme]);

    return null;
}
