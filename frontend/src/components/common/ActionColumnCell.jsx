import { Fragment, useState } from "react";
import { Box, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, useTheme, alpha } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PaletteIcon from "@mui/icons-material/Palette";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useAuth } from "../../contexts/AuthContext";

/**
 * ActionColumnCell - Renders table action column with edit/delete icons at root + rest in context menu
 *
 * @param {Object} params - DataGrid renderCell params (params.row, params.api, etc.)
 * @param {Array|Function} actions - Action configs or getActions(row) => actions[]
 *   Each action: { id, label, icon?, onClick(row), showAtRoot?, disabled?, variant?, dividerBefore?, resource?, action? }
 *   - id 'edit' | 'delete' → showAtRoot defaults to true
 *   - showAtRoot: true → force icon at root level (override default)
 *   - disabled: boolean | (row) => boolean
 *   - resource, action: for permission check; if both provided, action shown only when hasPermission(resource, action)
 */
export function ActionColumnCell({ params, actions = [], getActions }) {
    const theme = useTheme();
    const { hasPermission } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);
    const row = params?.row;
    const actionsList = typeof getActions === "function" ? getActions(row) : actions;

    const isDisabled = (action) => {
        if (!action.disabled) return false;
        return typeof action.disabled === "function" ? action.disabled(row) : action.disabled;
    };

    const filteredActions = actionsList.filter((a) => !a.resource || !a.action || hasPermission(a.resource, a.action));

    const rootActions = filteredActions.filter((a) => {
        const atRoot = a.showAtRoot ?? (a.id === "edit" || a.id === "delete");
        return atRoot && !isDisabled(a);
    });

    const menuActions = filteredActions.filter((a) => {
        const atRoot = a.showAtRoot ?? (a.id === "edit" || a.id === "delete");
        return !atRoot && !isDisabled(a);
    });

    const handleClick = (e, action) => {
        e.stopPropagation();
        action.onClick?.(row);
        setAnchorEl(null);
    };

    const getIcon = (action) => {
        if (action.icon) return action.icon;
        if (action.id === "edit") return <EditIcon fontSize="small" />;
        if (action.id === "delete") return <DeleteIcon fontSize="small" />;
        if (action.id === "setupTheme") return <PaletteIcon fontSize="small" />;
        if (action.id === "suspend") return <BlockIcon fontSize="small" />;
        if (action.id === "activate") return <CheckCircleIcon fontSize="small" />;
        return null;
    };

    const getTooltip = (action) => {
        if (action.id === "edit") return "Edit";
        if (action.id === "delete") return "Delete";
        return action.label;
    };

    const getColor = (action) => {
        if (action.variant === "danger") return "error.main";
        if (action.variant === "success") return "success.main";
        if (action.id === "edit" || action.id === "setupTheme") return "primary.main";
        return "primary.main";
    };

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.25,
                "& .MuiIconButton-root": {
                    padding: 0.5,
                    "&:hover": {
                        backgroundColor: alpha(theme.palette.action.hover, 0.1),
                    },
                },
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {rootActions.map((action) => (
                <Tooltip key={action.id} title={getTooltip(action)} placement="bottom" arrow>
                    <span>
                        <IconButton size="small" onClick={(e) => handleClick(e, action)} sx={{ color: getColor(action) }}>
                            {getIcon(action)}
                        </IconButton>
                    </span>
                </Tooltip>
            ))}
            {menuActions.length > 0 && (
                <>
                    <Tooltip title="More actions" placement="bottom" arrow>
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                setAnchorEl(e.currentTarget);
                            }}
                            sx={{ color: "primary.main" }}
                        >
                            <MoreVertIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                        anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                        }}
                        transformOrigin={{
                            vertical: "top",
                            horizontal: "right",
                        }}
                        onClick={(e) => e.stopPropagation()}
                        PaperProps={{
                            sx: {
                                mt: 1.5,
                                minWidth: 130,
                                py: 0.25,
                                borderRadius: 1,
                                boxShadow: theme.palette.mode === "dark" ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.12)",
                                border: `1px solid ${theme.palette.divider}`,
                                "& .MuiMenuItem-root": {
                                    borderRadius: 0.5,
                                },
                            },
                        }}
                    >
                        {menuActions.map((action) => {
                            const icon = getIcon(action);
                            return (
                                <Fragment key={action.id}>
                                    {action.dividerBefore && (
                                        <Box
                                            sx={{
                                                borderTop: `1px solid ${theme.palette.divider}`,
                                                mx: 1,
                                                my: 0.125,
                                            }}
                                        />
                                    )}
                                    <MenuItem
                                        onClick={(e) => handleClick(e, action)}
                                        sx={{
                                            fontSize: "0.8125rem",
                                            py: 0.5,
                                            px: 1,
                                            mx: 0.25,
                                            color: action.variant === "danger" ? "error.main" : "text.primary",
                                            "&:hover": {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                            },
                                        }}
                                    >
                                        {icon && (
                                            <ListItemIcon
                                                sx={{
                                                    minWidth: 36,
                                                    color: "inherit",
                                                }}
                                            >
                                                {icon}
                                            </ListItemIcon>
                                        )}
                                        <ListItemText
                                            primary={action.label}
                                            primaryTypographyProps={{
                                                fontSize: "inherit",
                                            }}
                                        />
                                    </MenuItem>
                                </Fragment>
                            );
                        })}
                    </Menu>
                </>
            )}
        </Box>
    );
}
