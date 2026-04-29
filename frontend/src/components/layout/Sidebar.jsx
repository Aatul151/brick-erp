import { useState, useEffect } from "react";
import {
    Drawer,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Box,
    Typography,
    Tooltip,
    Button,
    useTheme,
    useMediaQuery,
    alpha,
    Collapse,
    Popover,
    MenuList,
    MenuItem,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import BusinessIcon from "@mui/icons-material/Business";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import BuildIcon from "@mui/icons-material/Build";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SecurityIcon from "@mui/icons-material/Security";
import HistoryIcon from "@mui/icons-material/History";
import ExtensionIcon from "@mui/icons-material/Extension";
import SettingsIcon from "@mui/icons-material/Settings";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { moduleApi, formsApi } from "../../utils/api/coreapi";

const DRAWER_WIDTH_EXPANDED = 256;
const DRAWER_WIDTH_COLLAPSED = 80;

const ICON_MAP = {
    Business: BusinessIcon,
    People: PeopleIcon,
    AdminPanelSettings: AdminPanelSettingsIcon,
    Security: SecurityIcon,
    History: HistoryIcon,
    Extension: ExtensionIcon,
    Settings: SettingsIcon,
    Home: HomeIcon,
    ViewModule: ViewModuleIcon,
};

const FALLBACK_ITEMS = {
    form_studio: {
        name: "Form Studio",
        path: "/form-studio",
        slug: "form_studio",
        icon: "ViewModule",
        roles: ["Site Admin", "Client Admin", "Client User"],
    },
    tenants: {
        name: "Tenants",
        path: "/tenants",
        slug: "tenants",
        icon: "Business",
        roles: ["Site Admin"],
    },
    users: {
        name: "Users",
        path: "/users",
        slug: "users",
        icon: "People",
        roles: ["Site Admin", "Client Admin"],
    },
    roles: {
        name: "Roles",
        path: "/roles",
        slug: "roles",
        icon: "AdminPanelSettings",
        roles: ["Site Admin"],
    },
    permissions: {
        name: "Permissions",
        path: "/permissions",
        slug: "permissions",
        icon: "Security",
        roles: ["Site Admin"],
    },
    modules: {
        name: "Modules",
        path: "/modules",
        slug: "modules",
        icon: "Extension",
        roles: ["Site Admin"],
    },
    settings: {
        name: "Settings",
        path: "/settings",
        slug: "settings",
        icon: "Settings",
        roles: ["Site Admin", "Client Admin"],
    },
    audit_logs: {
        name: "Audit Logs",
        path: "/audit-logs",
        slug: "audit_logs",
        icon: "History",
        roles: ["Site Admin", "Client Admin"],
    },
};

const ROOT_LEVEL_APPS = ["form_studio"];

const MENU_GROUPS = [
    {
        title: "User Management",
        slugs: ["tenants", "users", "roles", "permissions"],
        icon: GroupWorkIcon,
    },
    {
        title: "System Configuration",
        slugs: ["modules", "settings"],
        icon: BuildIcon,
    },
    { title: "Monitoring & Logs", slugs: ["audit_logs"], icon: HistoryIcon },
];

export function Sidebar({ open, onClose, collapsed }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { user, logout, hasPermission } = useAuth();

    const { data: modulesData } = useQuery({
        queryKey: ["modules"],
        queryFn: () => moduleApi.getAll({ active: "true" }),
        staleTime: 5 * 60 * 1000,
    });
    const { data: formsData = [] } = useQuery({
        queryKey: [
            "forms",
            "sidebar",
            user?.tenantId ?? "no-tenant",
            user?.id ?? user?._id ?? "anon",
        ],
        queryFn: () => formsApi.getAllWithMaster(),
        enabled: !!user?.tenantId,
        staleTime: 5 * 60 * 1000,
    });

    const slugToPath = (slug) => `/${(slug || "").replace(/_/g, "-")}`;

    const getItemData = (slug, useFallbackWhenMissing = false) => {
        const fallback = FALLBACK_ITEMS[slug];
        if (!fallback) return null;
        const fromApi = modulesData?.find((m) => m.slug === slug);
        if (fromApi) {
            return {
                name: fromApi.name,
                href: slugToPath(fromApi.slug),
                resource: fromApi.slug,
                IconComponent: ICON_MAP[fromApi.icon] || AdminPanelSettingsIcon,
                roles: [],
            };
        }
        if (useFallbackWhenMissing || !modulesData?.length) {
            return {
                name: fallback.name,
                href: fallback.path,
                resource: fallback.slug,
                IconComponent:
                    ICON_MAP[fallback.icon] || AdminPanelSettingsIcon,
                roles: fallback.roles,
            };
        }
        return null;
    };

    const menuGroups = MENU_GROUPS.map((g) => ({
        ...g,
        items: g.slugs.map((s) => getItemData(s, false)).filter(Boolean),
    })).filter((g) => g.items.length > 0);

    const canAccess = (item) => {
        if (user?.permissions?.length) {
            return hasPermission(item.resource, "menu");
        }
        return item.roles?.length
            ? item.roles.some((role) =>
                  user?.roles?.some((r) => r.roleName === role),
              )
            : true;
    };

    const rootLevelApps = ROOT_LEVEL_APPS.map((s) =>
        getItemData(s, true),
    ).filter(Boolean);
    const allMenuItems = [
        ...rootLevelApps,
        ...menuGroups.flatMap((g) => g.items),
    ];
    const showMasterSection = !!user?.tenantId;
    const masterForms = showMasterSection
        ? formsData.filter((f) => f?.formType === "master_form" && f?.name)
        : [];

    const hasAdminAccess = allMenuItems.some(canAccess);
    const [groupOpen, setGroupOpen] = useState(() =>
        MENU_GROUPS.reduce((acc, g) => {
            const hasRouteInGroup = g.slugs.some(
                (slug) =>
                    (FALLBACK_ITEMS[slug]?.path ||
                        `/${slug.replace(/_/g, "-")}`) === pathname,
            );
            acc[g.title] = hasRouteInGroup;
            return acc;
        }, {}),
    );
    const [popoverAnchor, setPopoverAnchor] = useState(null);
    const [popoverGroup, setPopoverGroup] = useState(null);

    useEffect(() => {
        setGroupOpen((prev) => {
            const next = { ...prev };
            MENU_GROUPS.forEach((g) => {
                const hasRouteInGroup = g.slugs.some((slug) => {
                    const item = getItemData(slug);
                    return item && pathname === item.href;
                });
                if (hasRouteInGroup) next[g.title] = true;
            });
            return next;
        });
    }, [pathname, modulesData]);

    const handleGroupClick = (groupTitle, e) => {
        if (collapsed) {
            setPopoverGroup(groupTitle);
            setPopoverAnchor(e.currentTarget);
        } else {
            setGroupOpen((prev) => ({
                ...prev,
                [groupTitle]: !prev[groupTitle],
            }));
        }
    };

    const handlePopoverClose = () => {
        setPopoverAnchor(null);
        setPopoverGroup(null);
    };

    const handleNav = (href) => {
        navigate(href);
        if (isMobile) onClose();
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login");
        if (isMobile) onClose();
    };

    const isSelected = (path) => pathname === path;

    const selectedStyles = {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        color: theme.palette.primary.main,
        borderRight: `3px solid ${theme.palette.primary.main}`,
        "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
        },
        "& .MuiListItemIcon-root": {
            color: theme.palette.primary.main,
        },
    };

    const itemStyles = {
        minHeight: { xs: 40, sm: 38 },
        px: collapsed ? 1.5 : 2.5,
        py: { xs: 0.875, sm: 0.75 },
        textTransform: "capitalize",
        justifyContent: collapsed ? "center" : "flex-start",
        "&.Mui-selected": selectedStyles,
        "&:hover": {
            backgroundColor: alpha(theme.palette.action.hover, 0.04),
        },
    };

    const drawerWidth = collapsed
        ? DRAWER_WIDTH_COLLAPSED
        : DRAWER_WIDTH_EXPANDED;

    const drawer = (
        <Box
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "background.paper",
            }}
        >
            {/* Logo Section */}
            <Toolbar
                sx={{
                    minHeight: 56,
                    px: collapsed ? 1.5 : 2.5,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    display: "flex",
                    justifyContent: collapsed ? "center" : "flex-start",
                    alignItems: "center",
                }}
            >
                {!collapsed && (
                    <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                backgroundColor: theme.palette.primary.main,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                            }}
                        >
                            <AdminPanelSettingsIcon
                                sx={{ fontSize: { xs: 26, sm: 24 } }}
                            />
                        </Box>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                color: "text.primary",
                                fontSize: { xs: "1.2rem", sm: "1.125rem" },
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {user?.tenantName || "Brick ERP"}
                        </Typography>
                    </Box>
                )}
                {collapsed && (
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            backgroundColor: theme.palette.primary.main,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                        }}
                    >
                        <AdminPanelSettingsIcon
                            sx={{ fontSize: { xs: 26, sm: 24 } }}
                        />
                    </Box>
                )}
            </Toolbar>

            {/* Navigation Items */}
            <Box sx={{ flexGrow: 1, overflow: "auto", py: 1 }}>
                <List sx={{ px: 0 }}>
                    {/* Dashboard */}
                    <ListItem disablePadding>
                        <Tooltip
                            title={collapsed ? "Dashboard" : ""}
                            placement="right"
                            arrow
                        >
                            <ListItemButton
                                selected={isSelected("/dashboard")}
                                onClick={() => handleNav("/dashboard")}
                                sx={itemStyles}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: collapsed ? 0 : 36,
                                        justifyContent: "center",
                                        color: isSelected("/dashboard")
                                            ? theme.palette.primary.main
                                            : "text.secondary",
                                        "& svg": {
                                            fontSize: {
                                                xs: "1.35rem",
                                                sm: "1.3rem",
                                            },
                                        },
                                    }}
                                >
                                    <DashboardIcon />
                                </ListItemIcon>
                                {!collapsed && (
                                    <ListItemText
                                        primary="Dashboard"
                                        primaryTypographyProps={{
                                            fontSize: {
                                                xs: "0.875rem",
                                                sm: "0.8125rem",
                                            },
                                            fontWeight: isSelected("/dashboard")
                                                ? 500
                                                : 400,
                                        }}
                                    />
                                )}
                            </ListItemButton>
                        </Tooltip>
                    </ListItem>

                    {/* Root-level apps */}
                    {rootLevelApps.filter(canAccess).map((app) => {
                        const Icon = app.IconComponent;
                        return (
                            <ListItem key={app.resource} disablePadding>
                                <Tooltip
                                    title={collapsed ? app.name : ""}
                                    placement="right"
                                    arrow
                                >
                                    <ListItemButton
                                        selected={isSelected(app.href)}
                                        onClick={() => handleNav(app.href)}
                                        sx={itemStyles}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: collapsed ? 0 : 36,
                                                justifyContent: "center",
                                                color: isSelected(app.href)
                                                    ? theme.palette.primary.main
                                                    : "text.secondary",
                                                "& svg": {
                                                    fontSize: {
                                                        xs: "1.35rem",
                                                        sm: "1.3rem",
                                                    },
                                                },
                                            }}
                                        >
                                            {Icon && <Icon />}
                                        </ListItemIcon>
                                        {!collapsed && (
                                            <ListItemText
                                                primary={app.name}
                                                primaryTypographyProps={{
                                                    fontSize: {
                                                        xs: "0.875rem",
                                                        sm: "0.8125rem",
                                                    },
                                                    fontWeight: isSelected(
                                                        app.href,
                                                    )
                                                        ? 500
                                                        : 400,
                                                }}
                                            />
                                        )}
                                    </ListItemButton>
                                </Tooltip>
                            </ListItem>
                        );
                    })}

                    {showMasterSection && (
                        <>
                            <Divider sx={{ my: 1 }} />
                            {!collapsed && (
                                <ListItem sx={{ px: 2.5, py: 0.5 }}>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontWeight: 600,
                                            color: "text.secondary",
                                            textTransform: "uppercase",
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        Master Section
                                    </Typography>
                                </ListItem>
                            )}
                            {masterForms.map((form) => {
                                const href = `/form-studio/entries/${encodeURIComponent(form.name)}`;
                                const selected = isSelected(href);
                                return (
                                    <ListItem
                                        key={form.id || form._id || form.name}
                                        disablePadding
                                    >
                                        <Tooltip
                                            title={
                                                collapsed
                                                    ? form.title || form.name
                                                    : ""
                                            }
                                            placement="right"
                                            arrow
                                        >
                                            <ListItemButton
                                                selected={selected}
                                                onClick={() => handleNav(href)}
                                                sx={{
                                                    ...itemStyles,
                                                    pl: collapsed ? 1.5 : 5,
                                                    pr: 2.5,
                                                }}
                                            >
                                                <ListItemIcon
                                                    sx={{
                                                        minWidth: collapsed
                                                            ? 0
                                                            : 32,
                                                        justifyContent:
                                                            "center",
                                                        color: selected
                                                            ? theme.palette
                                                                  .primary.main
                                                            : "text.secondary",
                                                        "& svg": {
                                                            fontSize: {
                                                                xs: "1.2rem",
                                                                sm: "1.15rem",
                                                            },
                                                        },
                                                    }}
                                                >
                                                    <ViewModuleIcon />
                                                </ListItemIcon>
                                                {!collapsed && (
                                                    <ListItemText
                                                        primary={
                                                            form.title ||
                                                            form.name
                                                        }
                                                        primaryTypographyProps={{
                                                            fontSize: {
                                                                xs: "0.8125rem",
                                                                sm: "0.75rem",
                                                            },
                                                            fontWeight: selected
                                                                ? 500
                                                                : 400,
                                                        }}
                                                    />
                                                )}
                                            </ListItemButton>
                                        </Tooltip>
                                    </ListItem>
                                );
                            })}
                            {!collapsed && masterForms.length === 0 && (
                                <ListItem sx={{ px: 2.5, py: 0.5 }}>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: "text.disabled" }}
                                    >
                                        No master forms
                                    </Typography>
                                </ListItem>
                            )}
                        </>
                    )}

                    {/* Menu groups */}
                    {hasAdminAccess && (
                        <>
                            <Divider sx={{ my: 1 }} />
                            {menuGroups.map((group) => {
                                const accessibleItems =
                                    group.items.filter(canAccess);
                                if (accessibleItems.length === 0) return null;
                                const isGroupOpen = groupOpen[group.title];
                                const isGroupSelected = accessibleItems.some(
                                    (item) => pathname === item.href,
                                );
                                return (
                                    <Box key={group.title}>
                                        <ListItem disablePadding>
                                            <Tooltip
                                                title={
                                                    collapsed ? group.title : ""
                                                }
                                                placement="right"
                                                arrow
                                            >
                                                <ListItemButton
                                                    selected={isGroupSelected}
                                                    onClick={(e) =>
                                                        handleGroupClick(
                                                            group.title,
                                                            e,
                                                        )
                                                    }
                                                    sx={itemStyles}
                                                >
                                                    <ListItemIcon
                                                        sx={{
                                                            minWidth: collapsed
                                                                ? 0
                                                                : 36,
                                                            justifyContent:
                                                                "center",
                                                            color: isGroupSelected
                                                                ? theme.palette
                                                                      .primary
                                                                      .main
                                                                : "text.secondary",
                                                            "& svg": {
                                                                fontSize: {
                                                                    xs: "1.35rem",
                                                                    sm: "1.3rem",
                                                                },
                                                            },
                                                        }}
                                                    >
                                                        {(() => {
                                                            const GroupIcon =
                                                                group.icon;
                                                            return (
                                                                <GroupIcon />
                                                            );
                                                        })()}
                                                    </ListItemIcon>
                                                    {!collapsed && (
                                                        <>
                                                            <ListItemText
                                                                primary={
                                                                    group.title
                                                                }
                                                                primaryTypographyProps={{
                                                                    fontSize: {
                                                                        xs: "0.875rem",
                                                                        sm: "0.8125rem",
                                                                    },
                                                                    fontWeight:
                                                                        isGroupSelected
                                                                            ? 500
                                                                            : 400,
                                                                }}
                                                            />
                                                            {isGroupOpen ? (
                                                                <ExpandLess />
                                                            ) : (
                                                                <ExpandMore />
                                                            )}
                                                        </>
                                                    )}
                                                </ListItemButton>
                                            </Tooltip>
                                        </ListItem>
                                        <Popover
                                            open={
                                                Boolean(popoverAnchor) &&
                                                popoverGroup === group.title
                                            }
                                            anchorEl={popoverAnchor}
                                            onClose={handlePopoverClose}
                                            anchorOrigin={{
                                                vertical: "top",
                                                horizontal: "right",
                                            }}
                                            transformOrigin={{
                                                vertical: "top",
                                                horizontal: "left",
                                            }}
                                            PaperProps={{
                                                sx: {
                                                    mt: 0.5,
                                                    minWidth: 200,
                                                    boxShadow:
                                                        "0 4px 12px rgba(0,0,0,0.15)",
                                                    borderRadius: 2,
                                                },
                                            }}
                                        >
                                            <MenuList dense>
                                                {accessibleItems.map((item) => {
                                                    const selected = isSelected(
                                                        item.href,
                                                    );
                                                    const Icon =
                                                        item.IconComponent;
                                                    return (
                                                        <MenuItem
                                                            key={item.name}
                                                            selected={selected}
                                                            onClick={() => {
                                                                handleNav(
                                                                    item.href,
                                                                );
                                                                handlePopoverClose();
                                                            }}
                                                            sx={{
                                                                minHeight: {
                                                                    xs: 40,
                                                                    sm: 36,
                                                                },
                                                                px: 2,
                                                                py: {
                                                                    xs: 0.875,
                                                                    sm: 0.75,
                                                                },
                                                                textTransform:
                                                                    "capitalize",
                                                                "&.Mui-selected":
                                                                    {
                                                                        backgroundColor:
                                                                            alpha(
                                                                                theme
                                                                                    .palette
                                                                                    .primary
                                                                                    .main,
                                                                                0.08,
                                                                            ),
                                                                        color: theme
                                                                            .palette
                                                                            .primary
                                                                            .main,
                                                                        "&:hover":
                                                                            {
                                                                                backgroundColor:
                                                                                    alpha(
                                                                                        theme
                                                                                            .palette
                                                                                            .primary
                                                                                            .main,
                                                                                        0.12,
                                                                                    ),
                                                                            },
                                                                        "& .MuiListItemIcon-root":
                                                                            {
                                                                                color: theme
                                                                                    .palette
                                                                                    .primary
                                                                                    .main,
                                                                            },
                                                                    },
                                                            }}
                                                        >
                                                            <ListItemIcon
                                                                sx={{
                                                                    minWidth: 32,
                                                                    justifyContent:
                                                                        "center",
                                                                    color: selected
                                                                        ? theme
                                                                              .palette
                                                                              .primary
                                                                              .main
                                                                        : "text.secondary",
                                                                    "& svg": {
                                                                        fontSize:
                                                                            {
                                                                                xs: "1.2rem",
                                                                                sm: "1.15rem",
                                                                            },
                                                                    },
                                                                }}
                                                            >
                                                                {Icon && (
                                                                    <Icon />
                                                                )}
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                primary={
                                                                    item.name
                                                                }
                                                                primaryTypographyProps={{
                                                                    fontSize: {
                                                                        xs: "0.875rem",
                                                                        sm: "0.8125rem",
                                                                    },
                                                                    fontWeight:
                                                                        selected
                                                                            ? 500
                                                                            : 400,
                                                                }}
                                                            />
                                                        </MenuItem>
                                                    );
                                                })}
                                            </MenuList>
                                        </Popover>
                                        <Collapse
                                            in={isGroupOpen && !collapsed}
                                            timeout="auto"
                                            unmountOnExit
                                        >
                                            <List
                                                component="div"
                                                disablePadding
                                            >
                                                {accessibleItems.map((item) => {
                                                    const selected = isSelected(
                                                        item.href,
                                                    );
                                                    const Icon =
                                                        item.IconComponent;
                                                    return (
                                                        <ListItem
                                                            key={item.name}
                                                            disablePadding
                                                        >
                                                            <Tooltip
                                                                title={
                                                                    collapsed
                                                                        ? item.name
                                                                        : ""
                                                                }
                                                                placement="right"
                                                                arrow
                                                            >
                                                                <ListItemButton
                                                                    selected={
                                                                        selected
                                                                    }
                                                                    onClick={() =>
                                                                        handleNav(
                                                                            item.href,
                                                                        )
                                                                    }
                                                                    sx={{
                                                                        ...itemStyles,
                                                                        pl: 5,
                                                                        pr: 2.5,
                                                                    }}
                                                                >
                                                                    <ListItemIcon
                                                                        sx={{
                                                                            minWidth: 32,
                                                                            justifyContent:
                                                                                "center",
                                                                            color: selected
                                                                                ? theme
                                                                                      .palette
                                                                                      .primary
                                                                                      .main
                                                                                : "text.secondary",
                                                                            "& svg":
                                                                                {
                                                                                    fontSize:
                                                                                        {
                                                                                            xs: "1.2rem",
                                                                                            sm: "1.15rem",
                                                                                        },
                                                                                },
                                                                        }}
                                                                    >
                                                                        {Icon && (
                                                                            <Icon />
                                                                        )}
                                                                    </ListItemIcon>
                                                                    <ListItemText
                                                                        primary={
                                                                            item.name
                                                                        }
                                                                        primaryTypographyProps={{
                                                                            fontSize:
                                                                                {
                                                                                    xs: "0.8125rem",
                                                                                    sm: "0.75rem",
                                                                                },
                                                                            fontWeight:
                                                                                selected
                                                                                    ? 500
                                                                                    : 400,
                                                                        }}
                                                                    />
                                                                </ListItemButton>
                                                            </Tooltip>
                                                        </ListItem>
                                                    );
                                                })}
                                            </List>
                                        </Collapse>
                                    </Box>
                                );
                            })}
                        </>
                    )}
                </List>
            </Box>

            {/* Logout - Fixed at bottom */}
            <Box
                sx={{
                    borderTop: `1px solid ${theme.palette.divider}`,
                    pt: 1,
                    pb: { xs: 2, sm: 1.5 },
                    px: collapsed ? 1.5 : 2,
                }}
            >
                {collapsed ? (
                    <Tooltip title="Logout" placement="right" arrow>
                        <ListItemButton
                            onClick={handleLogout}
                            sx={{
                                minHeight: { xs: 40, sm: 36 },
                                px: 1.5,
                                py: { xs: 0.875, sm: 0.75 },
                                borderRadius: 1,
                                justifyContent: "center",
                                color: theme.palette.error.main,
                                "&:hover": {
                                    backgroundColor: alpha(
                                        theme.palette.error.main,
                                        0.12,
                                    ),
                                },
                            }}
                        >
                            <LogoutIcon
                                sx={{
                                    fontSize: { xs: "1.35rem", sm: "1.25rem" },
                                }}
                            />
                        </ListItemButton>
                    </Tooltip>
                ) : (
                    <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        size="medium"
                        onClick={handleLogout}
                        startIcon={<LogoutIcon />}
                        sx={{
                            minHeight: { xs: 48, sm: 40 },
                            py: 1.25,
                            px: 2,
                            justifyContent: "flex-start",
                            textTransform: "none",
                            fontSize: { xs: "0.9375rem", sm: "0.875rem" },
                            fontWeight: 500,
                            borderColor: theme.palette.error.main,
                            color: theme.palette.error.main,
                            "&:hover": {
                                borderColor: theme.palette.error.dark,
                                backgroundColor: alpha(
                                    theme.palette.error.main,
                                    0.08,
                                ),
                            },
                        }}
                    >
                        Logout
                    </Button>
                )}
            </Box>
        </Box>
    );

    return (
        <Drawer
            variant={isMobile ? "temporary" : "permanent"}
            open={isMobile ? open : true}
            onClose={onClose}
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                margin: 0,
                transition: theme.transitions.create("width", {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                }),
                "& .MuiDrawer-paper": {
                    width: drawerWidth,
                    boxSizing: "border-box",
                    borderRight: `1px solid ${theme.palette.divider}`,
                    backgroundColor: "background.paper",
                    borderRadius: 0,
                    margin: 0,
                    padding: 0,
                    transition: theme.transitions.create("width", {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    overflowX: "hidden",
                },
            }}
        >
            {drawer}
        </Drawer>
    );
}
