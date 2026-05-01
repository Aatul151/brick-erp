import * as MuiIcons from "@mui/icons-material";

export function AppDynamicIcon({ name, ...props }) {
    const Icon = MuiIcons[name?.trim()] || MuiIcons.HelpOutline;
    return <Icon {...props} />;
}
