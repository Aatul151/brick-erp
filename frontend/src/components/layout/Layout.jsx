import { useState } from "react";
import { Box, useTheme, useMediaQuery, alpha } from "@mui/material";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { BreadcrumbProvider } from "../../contexts/BreadcrumbContext";

const DRAWER_WIDTH_EXPANDED = 256;
const DRAWER_WIDTH_COLLAPSED = 80;

export default function Layout({ children }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const handleSidebarToggle = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleSidebarClose = () => {
        setSidebarOpen(false);
    };

    const handleSidebarCollapse = () => {
        setSidebarCollapsed((prev) => !prev);
    };

    const sidebarWidth = sidebarCollapsed
        ? DRAWER_WIDTH_COLLAPSED
        : DRAWER_WIDTH_EXPANDED;

    return (
        <Box
            sx={{
                display: "flex",
                minHeight: "100vh",
                backgroundColor: "background.default",
            }}
        >
            <Sidebar
                open={sidebarOpen}
                onClose={handleSidebarClose}
                collapsed={sidebarCollapsed}
            />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    width: { xs: "100%", md: `calc(100% - ${sidebarWidth}px)` },
                    minHeight: "100vh",
                    backgroundColor: "background.default",
                    transition: theme.transitions.create(["width", "margin"], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                }}
            >
                <Topbar
                    onMenuClick={handleSidebarToggle}
                    sidebarWidth={sidebarWidth}
                    sidebarCollapsed={sidebarCollapsed}
                    onToggleSidebar={handleSidebarCollapse}
                />
                <Box
                    sx={{
                        flexGrow: 1,
                        p: isMobile ? 2 : 3,
                        pt: { xs: 2, md: 2.5 },
                        mt: { xs: "64px", md: "72px" },
                        backgroundColor: alpha(
                            theme.palette.primary.main,
                            0.02,
                        ),
                        minHeight: "calc(100vh - 64px)",
                    }}
                >
                    <BreadcrumbProvider>{children}</BreadcrumbProvider>
                </Box>
            </Box>
        </Box>
    );
}
