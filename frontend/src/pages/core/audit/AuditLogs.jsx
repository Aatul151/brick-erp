import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditApi } from "../../../utils/api/coreapi";
import { formatDate } from "../../../utils/dateFormat";
import { PageHeader } from "../../../components/common/PageHeader";
import { PageContent } from "../../../components/common/PageContent";
import { AppDataTable } from "../../../components/common/AppDataTable";
import { StatusLabel } from "../../../components/common/StatusLabel";
import HistoryIcon from "@mui/icons-material/History";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";

const getDefaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
    };
};

export default function AuditLogs() {
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10,
    });
    const [filters, setFilters] = useState({
        action: "",
        resourceType: "",
        ...getDefaultDateRange(),
    });

    const { data, isLoading } = useQuery({
        queryKey: ["auditLogs", filters, paginationModel],
        queryFn: () =>
            auditApi.getAll({
                ...filters,
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
            }),
    });

    const columns = [
        {
            field: "timestamp",
            headerName: "Timestamp",
            width: 170,
            valueGetter: (_, row) =>
                formatDate(row.timestamp, "DD MMM YYYY hh:mm:ss A"),
        },
        {
            field: "userName",
            headerName: "User",
            width: 120,
            valueGetter: (_, row) => row.userName || "System",
        },
        {
            field: "userEmail",
            headerName: "Email",
            width: 180,
            valueGetter: (_, row) => row.userEmail || "-",
        },
        {
            field: "tenantName",
            headerName: "Tenant",
            width: 120,
            valueGetter: (_, row) => row.tenantName || "System",
        },
        {
            field: "action",
            headerName: "Action",
            width: 140,
            renderCell: (params) => (
                <StatusLabel value={params.row.action} variant="action" />
            ),
        },
        {
            field: "resourceType",
            headerName: "Resource",
            width: 110,
            valueGetter: (_, row) => row.resourceType || "-",
        },
        {
            field: "ipAddress",
            headerName: "IP Address",
            width: 120,
            valueGetter: (_, row) => row.ipAddress || "-",
        },
    ];

    return (
        <div className="px-4 sm:px-0 flex flex-col gap-4 min-h-0 flex-1">
            <PageHeader
                title="Audit Logs"
                subtitle="View and filter system activity logs"
                icon={<HistoryIcon fontSize="small" color="primary" />}
            />
            <PageContent>
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select
                        label="Action"
                        value={filters.action}
                        onChange={(e) =>
                            setFilters({ ...filters, action: e.target.value })
                        }
                        options={[
                            { value: "", label: "All Actions" },
                            { value: "LOGIN_SUCCESS", label: "Login Success" },
                            { value: "LOGIN_FAILED", label: "Login Failed" },
                            { value: "LOGOUT", label: "Logout" },
                            { value: "USER_CREATED", label: "User Created" },
                            { value: "USER_UPDATED", label: "User Updated" },
                            { value: "USER_DELETED", label: "User Deleted" },
                            {
                                value: "TENANT_CREATED",
                                label: "Tenant Created",
                            },
                            {
                                value: "TENANT_UPDATED",
                                label: "Tenant Updated",
                            },
                            {
                                value: "TENANT_SUSPENDED",
                                label: "Tenant Suspended",
                            },
                            {
                                value: "TENANT_ACTIVATED",
                                label: "Tenant Activated",
                            },
                        ]}
                    />
                    <Select
                        label="Resource Type"
                        value={filters.resourceType}
                        onChange={(e) =>
                            setFilters({
                                ...filters,
                                resourceType: e.target.value,
                            })
                        }
                        options={[
                            { value: "", label: "All Resources" },
                            { value: "auth", label: "Authentication" },
                            { value: "user", label: "User" },
                            { value: "tenant", label: "Tenant" },
                            { value: "role", label: "Role" },
                            { value: "permission", label: "Permission" },
                        ]}
                    />
                    <Input
                        label="Start Date"
                        type="date"
                        value={filters.startDate}
                        onChange={(e) =>
                            setFilters({
                                ...filters,
                                startDate: e.target.value,
                            })
                        }
                    />
                    <Input
                        label="End Date"
                        type="date"
                        value={filters.endDate}
                        onChange={(e) =>
                            setFilters({ ...filters, endDate: e.target.value })
                        }
                    />
                </div>

                <AppDataTable
                    rows={data?.logs || []}
                    columns={columns}
                    getRowId={(row) =>
                        row.id ??
                        `${row.timestamp}-${row.userEmail}-${row.action}`
                    }
                    loading={isLoading}
                    height={500}
                    serverPagination={!!data?.pagination}
                    rowCount={data?.pagination?.total ?? 0}
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                />
            </PageContent>
        </div>
    );
}
