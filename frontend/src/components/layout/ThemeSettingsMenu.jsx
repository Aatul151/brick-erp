import { Drawer, Box, Typography, useTheme } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { useThemeSettings } from "../../contexts/ThemeContext";

const PREDEFINED_THEMES = [
    { primaryColor: "#4f46e5", secondaryColor: "#6366f1", name: "Indigo" },
    { primaryColor: "#1e40af", secondaryColor: "#3b82f6", name: "Navy" },
    { primaryColor: "#0d9488", secondaryColor: "#14b8a6", name: "Teal" },
    { primaryColor: "#57534e", secondaryColor: "#78716c", name: "Stone" },
    { primaryColor: "#6d28d9", secondaryColor: "#8b5cf6", name: "Violet" },
    { primaryColor: "#4a154b", secondaryColor: "#36c5f0", name: "Slack" },
    { primaryColor: "#25d366", secondaryColor: "#075e54", name: "WhatsApp" },
    { primaryColor: "#229ed9", secondaryColor: "#2aabee", name: "Telegram" },
    { primaryColor: "#4285f4", secondaryColor: "#34a853", name: "Chrome" },
    { primaryColor: "#0078d4", secondaryColor: "#00bcf2", name: "Copilot" },
    { primaryColor: "#0891b2", secondaryColor: "#22d3ee", name: "Cyan" },
    { primaryColor: "#b91c1c", secondaryColor: "#dc2626", name: "Red" },
    { primaryColor: "#ea580c", secondaryColor: "#f97316", name: "Orange" },
    { primaryColor: "#d97706", secondaryColor: "#f59e0b", name: "Amber" },
    { primaryColor: "#881337", secondaryColor: "#9f123c", name: "Maroon" },
];

export function ThemeSettingsMenu({ open, onClose }) {
    const theme = useTheme();
    const { primaryColor, secondaryColor, updateTheme } = useThemeSettings();

    const isPredefinedThemeActive = (themeConfig) =>
        themeConfig.primaryColor === primaryColor &&
        themeConfig.secondaryColor === secondaryColor;

    const handlePredefinedTheme = (themeConfig) => {
        updateTheme({
            primaryColor: themeConfig.primaryColor,
            secondaryColor: themeConfig.secondaryColor,
        });
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: 320,
                    mt: { xs: 0, md: "64px" },
                    height: { xs: "100%", md: "calc(100% - 64px)" },
                },
            }}
        >
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Theme Colors
                </Typography>

                {/* Predefined Color Themes */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {PREDEFINED_THEMES.map((themeConfig, index) => {
                            const isActive =
                                isPredefinedThemeActive(themeConfig);
                            return (
                                <Box
                                    key={index}
                                    sx={{
                                        position: "relative",
                                        width: 44,
                                        height: 44,
                                        borderRadius: "50%",
                                        background: `linear-gradient(135deg, ${themeConfig.primaryColor} 0%, ${themeConfig.secondaryColor} 100%)`,
                                        cursor: "pointer",
                                        border: `2px solid ${isActive ? theme.palette.primary.main : "transparent"}`,
                                        flexShrink: 0,
                                        transition: "transform 0.2s",
                                        "&:hover": {
                                            transform: "scale(1.1)",
                                        },
                                    }}
                                    onClick={() =>
                                        handlePredefinedTheme(themeConfig)
                                    }
                                    title={themeConfig.name}
                                >
                                    {isActive && (
                                        <CheckIcon
                                            sx={{
                                                position: "absolute",
                                                top: "50%",
                                                left: "50%",
                                                transform:
                                                    "translate(-50%, -50%)",
                                                color: "white",
                                                fontSize: 22,
                                                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
                                            }}
                                        />
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            </Box>
        </Drawer>
    );
}
