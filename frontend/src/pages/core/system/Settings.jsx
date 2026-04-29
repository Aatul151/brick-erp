import { Box, Typography } from "@mui/material";
import { PageHeader } from "../../../components/common/PageHeader";
import { PageContent } from "../../../components/common/PageContent";
import SettingsIcon from "@mui/icons-material/Settings";

export default function Settings() {
    return (
        <div className="px-4 sm:px-0 flex flex-col gap-4 min-h-0 flex-1">
            <PageHeader
                title="Settings"
                subtitle="Application and account preferences"
                icon={<SettingsIcon fontSize="small" color="primary" />}
            />
            <PageContent>
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 300,
                        py: 6,
                        px: 2,
                    }}
                >
                    <SettingsIcon
                        sx={{ fontSize: 64, color: "action.disabled", mb: 2 }}
                    />
                    <Typography
                        variant="h6"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                    >
                        Coming Soon
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        align="center"
                    >
                        Settings page is under construction. Check back later.
                    </Typography>
                </Box>
            </PageContent>
        </div>
    );
}
