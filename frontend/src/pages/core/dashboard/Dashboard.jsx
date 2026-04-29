import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress, alpha } from "@mui/material";
import { useAuth } from "../../../contexts/AuthContext";
import { tenantApi } from "../../../utils/api/coreapi";
import { PageHeader } from "../../../components/common/PageHeader";
import { PageContent } from "../../../components/common/PageContent";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BusinessIcon from "@mui/icons-material/Business";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import PersonOffIcon from "@mui/icons-material/PersonOff";

export default function Dashboard() {
    const { user, isSiteAdmin } = useAuth();

    const { data: stats, isLoading } = useQuery({
        queryKey: ["stats"],
        queryFn: () => tenantApi.getStats(),
    });

    return (
        <div className="px-4 sm:px-0 flex flex-col gap-4 min-h-0 flex-1">
            <PageHeader
                title="Dashboard"
                subtitle={`Welcome back, ${user?.fullName}`}
                icon={<DashboardIcon fontSize="small" color="primary" />}
            />
            <PageContent>
                {isLoading ? (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            py: 6,
                        }}
                    >
                        <CircularProgress color="primary" size={48} />
                    </Box>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
                        {isSiteAdmin() && (
                            <>
                                <StatCard
                                    title="Total Tenants"
                                    value={stats?.totalTenants || 0}
                                    icon={<BusinessIcon />}
                                    to="/tenants"
                                />
                                <StatCard
                                    title="Active Tenants"
                                    value={stats?.activeTenants || 0}
                                    icon={<CheckCircleIcon />}
                                    to="/tenants?status=active"
                                />
                                <StatCard
                                    title="Suspended Tenants"
                                    value={stats?.suspendedTenants || 0}
                                    icon={<BlockIcon />}
                                    to="/tenants?status=suspended"
                                />
                            </>
                        )}
                        <StatCard
                            title="Total Users"
                            value={stats?.totalUsers || 0}
                            icon={<PeopleIcon />}
                            to="/users"
                        />
                        <StatCard
                            title="Active Users"
                            value={stats?.activeUsers || 0}
                            icon={<PersonIcon />}
                            to="/users?status=active"
                        />
                        {!isSiteAdmin() && (
                            <>
                                <StatCard
                                    title="Inactive Users"
                                    value={stats?.inactiveUsers || 0}
                                    icon={<PersonOffIcon />}
                                    to="/users?status=inactive"
                                />
                                <StatCard
                                    title="Suspended Users"
                                    value={stats?.suspendedUsers || 0}
                                    icon={<BlockIcon />}
                                    to="/users?status=suspended"
                                />
                            </>
                        )}
                    </div>
                )}
            </PageContent>
        </div>
    );
}

function StatCard({ title, value, icon, to }) {
    const navigate = useNavigate();
    const handleClick = () => to && navigate(to);

    return (
        <Box
            component={to ? "button" : "div"}
            onClick={to ? handleClick : undefined}
            sx={{
                width: "100%",
                textAlign: "left",
                p: 0,
                font: "inherit",
                cursor: to ? "pointer" : "default",
                backgroundColor: "background.paper",
                overflow: "hidden",
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                boxShadow: (theme) =>
                    theme.palette.mode === "light"
                        ? "0 2px 8px rgba(0,0,0,0.06)"
                        : "0 2px 8px rgba(0,0,0,0.25)",
                transition: "box-shadow 0.2s",
                "&:hover": to
                    ? {
                          boxShadow: (theme) =>
                              theme.palette.mode === "light"
                                  ? "0 4px 12px rgba(0,0,0,0.1)"
                                  : "0 4px 12px rgba(0,0,0,0.35)",
                      }
                    : {},
            }}
        >
            <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                        sx={{
                            flexShrink: 0,
                            width: 48,
                            height: 48,
                            borderRadius: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: (theme) =>
                                alpha(theme.palette.primary.main, 0.12),
                            color: "primary.main",
                            "& svg": { fontSize: 28 },
                        }}
                    >
                        {icon}
                    </Box>
                    <Box sx={{ ml: 2, flex: 1, minWidth: 0 }}>
                        <Box
                            component="dt"
                            sx={{
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                color: "text.secondary",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {title}
                        </Box>
                        <Box
                            component="dd"
                            sx={{
                                fontSize: "1.875rem",
                                fontWeight: 600,
                                color: "text.primary",
                                m: 0,
                            }}
                        >
                            {value}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
