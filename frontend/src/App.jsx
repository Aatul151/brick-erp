import { useMemo } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, CssBaseline, CircularProgress, Box, Typography } from "@mui/material";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider as AppThemeProvider, useThemeSettings, createAppTheme } from "./contexts/ThemeContext";
import { RESOURCE, ACTION } from "./utils/resources";
import ProtectedLayout from "./components/ProtectedLayout";
import { ThemeSync } from "./components/layout/ThemeSync";
import { ConfirmProvider } from "./components/common/ConfirmDialog";
import Login from "./pages/core/auth/Login";
import Dashboard from "./pages/core/dashboard/Dashboard";
import Tenants from "./pages/core/admin/Tenants";
import Users from "./pages/core/admin/Users";
import Roles from "./pages/core/admin/Roles";
import Permissions from "./pages/core/admin/Permissions";
import Modules from "./pages/core/system/Modules";
import AuditLogs from "./pages/core/audit/AuditLogs";
import Settings from "./pages/core/system/Settings";
import Profile from "./pages/core/account/Profile";
import FormStudioList from "./pages/apps/form-studio/FormStudioList";
import FormBuilderPage from "./pages/apps/form-studio/FormBuilderPage";
import FormEntriesPage from "./pages/apps/form-studio/FormEntriesPage";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000,
        },
    },
});

// Route config: single source of truth for protected routes (like CorporateRouting / createBrowserRouter pattern)
const PROTECTED_ROUTES = [
    { path: "/dashboard", component: Dashboard },
    {
        path: "/tenants",
        component: Tenants,
        permission: { resource: RESOURCE.TENANTS, action: ACTION.READ },
        roles: ["Site Admin"],
    },
    {
        path: "/users",
        component: Users,
        permission: { resource: RESOURCE.USERS, action: ACTION.READ },
        roles: ["Site Admin", "Client Admin"],
    },
    {
        path: "/roles",
        component: Roles,
        permission: { resource: RESOURCE.ROLES, action: ACTION.READ },
        roles: ["Site Admin"],
    },
    {
        path: "/permissions",
        component: Permissions,
        permission: { resource: RESOURCE.PERMISSIONS, action: ACTION.READ },
        roles: ["Site Admin"],
    },
    {
        path: "/modules",
        component: Modules,
        permission: { resource: RESOURCE.MODULES, action: ACTION.READ },
        roles: ["Site Admin"],
    },
    {
        path: "/audit-logs",
        component: AuditLogs,
        permission: { resource: RESOURCE.AUDIT_LOGS, action: ACTION.READ },
        roles: ["Site Admin", "Client Admin"],
    },
    {
        path: "/settings",
        component: Settings,
        permission: { resource: RESOURCE.SETTINGS, action: ACTION.READ },
        roles: ["Site Admin", "Client Admin"],
    },
    {
        path: "/form-studio/build/:formName",
        component: FormBuilderPage,
        permission: { resource: RESOURCE.FORM_STUDIO, action: ACTION.READ },
        roles: ["Site Admin", "Client Admin", "Client User"],
    },
    {
        path: "/form-studio/build",
        component: FormBuilderPage,
        permission: { resource: RESOURCE.FORM_STUDIO, action: ACTION.READ },
        roles: ["Site Admin", "Client Admin", "Client User"],
    },
    {
        path: "/form-studio/entries/:formName",
        component: FormEntriesPage,
        permission: { resource: RESOURCE.FORM_STUDIO, action: ACTION.READ },
        roles: ["Site Admin", "Client Admin", "Client User"],
    },
    {
        path: "/form-studio",
        component: FormStudioList,
        permission: { resource: RESOURCE.FORM_STUDIO, action: ACTION.READ },
        roles: ["Site Admin", "Client Admin", "Client User"],
    },
    { path: "/profile", component: Profile },
];

function AppRoutes() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress color="primary" size={48} />
            </Box>
        );
    }

    return (
        <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />

            {/* Protected routes - ProtectedLayout wraps all (auth + Layout), permission applied per route */}
            {PROTECTED_ROUTES.map(({ path, component: Component, permission, roles }) => (
                <Route
                    key={path}
                    path={path}
                    element={
                        <ProtectedLayout permission={permission} roles={roles}>
                            <Component />
                        </ProtectedLayout>
                    }
                />
            ))}

            {/* Exact / - redirect to dashboard or login */}
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />

            {/* Default: redirect unknown paths to dashboard */}
            <Route path="*" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
            <Route
                path="/404"
                element={
                    <Box
                        sx={{
                            minHeight: "100vh",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Box sx={{ textAlign: "center" }}>
                            <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>
                                404
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 2 }}>
                                Page not found
                            </Typography>
                            <Typography
                                component="a"
                                href="/"
                                color="primary"
                                sx={{
                                    fontWeight: 600,
                                    "&:hover": { textDecoration: "underline" },
                                }}
                            >
                                Go to Dashboard
                            </Typography>
                        </Box>
                    </Box>
                }
            />
        </Routes>
    );
}

function AppThemeWrapper({ children }) {
    const { mode, primaryColor, secondaryColor } = useThemeSettings();
    const theme = useMemo(() => createAppTheme({ mode, primaryColor, secondaryColor }), [mode, primaryColor, secondaryColor]);
    return (
        <ThemeProvider theme={theme}>
            <ThemeSync />
            {children}
        </ThemeProvider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppThemeProvider>
                <AppThemeWrapper>
                    <CssBaseline />
                    <QueryClientProvider client={queryClient}>
                        <ConfirmProvider>
                            <AppRoutes />
                        </ConfirmProvider>
                    </QueryClientProvider>
                </AppThemeWrapper>
            </AppThemeProvider>
        </AuthProvider>
    );
}
