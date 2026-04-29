import { Toolbar, IconButton, Box, Menu, MenuItem, Avatar, Typography, useTheme, useMediaQuery, alpha } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useState } from "react";
import { Breadcrumb } from "../common/Breadcrumb";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({ onMenuClick, sidebarWidth, sidebarCollapsed, onToggleSidebar }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login");
        handleMenuClose();
    };

    return (
        <Box
            sx={{
                position: "fixed",
                top: 0,
                left: { xs: 0, md: sidebarWidth },
                right: 0,
                height: 64,
                zIndex: theme.zIndex.drawer + 1,
                backgroundColor: "background.paper",
                borderBottom: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.palette.mode === "dark" ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.08)",
                transition: theme.transitions.create(["left"], {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                }),
            }}
        >
            <Toolbar
                sx={{
                    height: 64,
                    px: { xs: 2, sm: 3 },
                    justifyContent: "space-between",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {isMobile && (
                        <IconButton edge="start" onClick={onMenuClick} sx={{ mr: 0.5 }}>
                            <MenuIcon />
                        </IconButton>
                    )}
                    {!isMobile && (
                        <IconButton
                            onClick={onToggleSidebar}
                            size="medium"
                            sx={{
                                color: "text.secondary",
                                "&:hover": {
                                    backgroundColor: alpha(theme.palette.action.hover, 0.1),
                                },
                            }}
                        >
                            <MenuOpenIcon
                                sx={{
                                    transform: sidebarCollapsed ? "none" : "scaleX(-1)",
                                }}
                            />
                        </IconButton>
                    )}
                    <Box
                        sx={{
                            display: { xs: "none", sm: "flex" },
                            alignItems: "center",
                            gap: 0.75,
                        }}
                    >
                        <Breadcrumb size="small" sx={{ mb: 0, pt: 0, px: 0 }} />
                    </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            mr: 0.5,
                            maxWidth: { xs: 160, sm: "none" },
                            overflow: "hidden",
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                lineHeight: 1.5,
                                fontSize: { xs: "0.7rem", sm: "0.75rem" },
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {user?.fullName || "User"}
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "end",
                                gap: 0.5,
                            }}
                        >
                            <AdminPanelSettingsIcon
                                sx={{
                                    fontSize: { xs: "1rem", sm: "0.9rem" },
                                    color: "text.secondary",
                                }}
                            />
                            <Typography
                                variant="caption"
                                sx={{
                                    lineHeight: 1.2,
                                    fontSize: { xs: "0.65rem", sm: "0.7rem" },
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {user?.roles?.map((r) => r.roleName).join(", ") || "-"}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={handleMenuOpen}
                        size="small"
                        sx={{
                            p: 0,
                            "&:hover": { backgroundColor: "transparent" },
                        }}
                    >
                        <Avatar
                            sx={{
                                width: 32,
                                height: 32,
                                bgcolor: theme.palette.primary.main,
                                fontSize: "0.875rem",
                            }}
                        >
                            {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                        </Avatar>
                    </IconButton>
                    <ThemeToggle />

                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                        anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                        }}
                        transformOrigin={{
                            vertical: "top",
                            horizontal: "right",
                        }}
                        PaperProps={{
                            sx: {
                                mt: 1.5,
                                minWidth: 200,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            },
                        }}
                    >
                        <MenuItem
                            onClick={() => {
                                navigate("/profile");
                                handleMenuClose();
                            }}
                        >
                            <AccountCircleIcon sx={{ mr: 1.5, fontSize: 20 }} />
                            Profile
                        </MenuItem>
                        <MenuItem onClick={handleLogout}>
                            <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                            Logout
                        </MenuItem>
                    </Menu>
                </Box>
            </Toolbar>
        </Box>
    );
}
