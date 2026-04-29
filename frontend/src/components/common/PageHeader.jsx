import { useState } from "react";
import {
    Box,
    Typography,
    IconButton,
    Divider,
    alpha,
    Tooltip,
    ButtonGroup,
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

/**
 * @typedef {Object} PageHeaderAction
 * @property {string} label - Tooltip text (shown on hover)
 * @property {React.ReactNode} icon - Icon to display (required)
 * @property {function} onClick - Click handler
 * @property {string} resource - Resource/module name for permission check (e.g. 'users', 'tenants')
 * @property {string} action - Action type for permission check (e.g. 'create')
 * @property {boolean} [primary] - If true/undefined, show as button; if false, show in More menu
 * @property {string} [tooltip] - Tooltip text override (default: label)
 * @property {string} [variant] - 'contained' | 'outlined' (default: 'outlined', use 'contained' for Add record)
 * @property {string} [color] - 'primary' | 'secondary' | 'error' | 'inherit'
 * @property {boolean} [disabled] - Disabled state
 * @property {string} [id] - Unique key (default: label)
 */

/**
 * PageHeader - A reusable header component for pages
 *
 * @param {string} title - The page title
 * @param {string} [subtitle] - Optional description below the title
 * @param {React.ReactNode} [icon] - Optional icon (ReactNode)
 * @param {string} [fallbackIcon] - Icon component when icon not provided
 * @param {PageHeaderAction[]|React.ReactNode} [actions] - Action array or custom JSX
 * @param {string} [backTo] - Path for back button (e.g. '/tenants')
 * @param {string} [backLabel] - Accessible label for back button
 * @param {boolean} [showDivider] - Show bottom divider (default false)
 * @param {object} [sx] - Optional MUI sx prop for additional styling
 */
export function PageHeader({
    title,
    subtitle,
    icon,
    fallbackIcon: FallbackIcon = DescriptionIcon,
    actions,
    backTo,
    backLabel = "Go back",
    showDivider = false,
    sx,
}) {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [menuAnchor, setMenuAnchor] = useState(null);

    const renderedActions = (() => {
        if (!actions) return null;
        if (Array.isArray(actions) && actions.length === 0) return null;
        if (Array.isArray(actions)) {
            const filteredActions = actions.filter(
                (a) =>
                    !a.resource ||
                    !a.action ||
                    hasPermission(a.resource, a.action),
            );
            if (filteredActions.length === 0) return null;

            const primaryActions = filteredActions.filter(
                (a) => a.primary !== false,
            );
            const menuActions = filteredActions.filter(
                (a) => a.primary === false,
            );

            const hasAnyActions =
                primaryActions.length > 0 || menuActions.length > 0;
            if (!hasAnyActions) return null;

            return (
                <>
                    <ButtonGroup
                        sx={{
                            "& .MuiButtonGroup-grouped": {
                                borderColor: "divider",
                                minHeight: 30,
                                py: 1,
                            },
                        }}
                    >
                        {primaryActions.map((action) => {
                            const {
                                label,
                                icon: actionIcon,
                                onClick,
                                tooltip,
                                variant = "outlined",
                                color = "primary",
                                disabled,
                                id,
                            } = action;
                            const key = id ?? label;
                            const tooltipText = tooltip ?? label;
                            return (
                                <Tooltip
                                    key={key}
                                    title={tooltipText}
                                    placement="bottom"
                                    arrow
                                >
                                    <Button
                                        size="medium"
                                        color={color}
                                        variant={variant}
                                        onClick={onClick}
                                        disabled={disabled}
                                        aria-label={tooltipText}
                                        sx={{
                                            minWidth: 0,
                                            px: 1.5,
                                            minHeight: 40,
                                            py: 1.25,
                                        }}
                                    >
                                        {actionIcon}
                                    </Button>
                                </Tooltip>
                            );
                        })}
                        {menuActions.length > 0 && (
                            <Tooltip
                                title="More actions"
                                placement="bottom"
                                arrow
                            >
                                <Button
                                    size="medium"
                                    variant="outlined"
                                    color="primary"
                                    onClick={(e) =>
                                        setMenuAnchor(e.currentTarget)
                                    }
                                    aria-label="More actions"
                                    sx={{
                                        minWidth: 0,
                                        px: 1.5,
                                        minHeight: 40,
                                        py: 1.25,
                                    }}
                                >
                                    <MoreVertIcon fontSize="small" />
                                </Button>
                            </Tooltip>
                        )}
                    </ButtonGroup>
                    {menuActions.length > 0 && (
                        <Menu
                            anchorEl={menuAnchor}
                            open={!!menuAnchor}
                            onClose={() => setMenuAnchor(null)}
                            anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "right",
                            }}
                            transformOrigin={{
                                vertical: "top",
                                horizontal: "right",
                            }}
                            slotProps={{ paper: { sx: { minWidth: 180 } } }}
                        >
                            {menuActions.map((action, index) => {
                                const {
                                    label,
                                    icon: actionIcon,
                                    onClick,
                                    disabled,
                                    id,
                                } = action;
                                const key = id ?? label;
                                return (
                                    <MenuItem
                                        sx={{
                                            fontSize: "0.8125rem",
                                            py: 0.5,
                                            px: 1,
                                            color: "text.primary",
                                            "&:hover": {
                                                backgroundColor: (theme) =>
                                                    alpha(
                                                        theme.palette.primary
                                                            .main,
                                                        0.08,
                                                    ),
                                            },
                                            borderTop: (theme) =>
                                                index > 0
                                                    ? `1px solid ${theme.palette.divider}`
                                                    : "none",
                                        }}
                                        key={key}
                                        onClick={() => {
                                            onClick?.();
                                            setMenuAnchor(null);
                                        }}
                                        disabled={disabled}
                                    >
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            {actionIcon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={label}
                                            primaryTypographyProps={{
                                                fontSize: "inherit",
                                            }}
                                        />
                                    </MenuItem>
                                );
                            })}
                        </Menu>
                    )}
                </>
            );
        }
        return actions;
    })();

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                mb: 1,
                backgroundColor: "background.paper",
                padding: 2,
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                flexShrink: 0,
                overflow: "hidden",
                ...sx,
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    {backTo && (
                        <IconButton
                            size="small"
                            onClick={() => navigate(backTo)}
                            aria-label={backLabel}
                            sx={{
                                color: "primary.main",
                                "&:hover": {
                                    backgroundColor: (theme) =>
                                        alpha(theme.palette.primary.main, 0.08),
                                },
                            }}
                        >
                            <ArrowBackIcon fontSize="small" />
                        </IconButton>
                    )}
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: (theme) =>
                                alpha(theme.palette.primary.main, 0.12),
                            color: "primary.main",
                            flexShrink: 0,
                        }}
                    >
                        {icon ? (
                            icon
                        ) : (
                            <FallbackIcon fontSize="small" color="primary" />
                        )}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            component="h1"
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                fontSize: "1.25rem",
                                lineHeight: 1.3,
                            }}
                        >
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.25, fontSize: "0.875rem" }}
                            >
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </Box>
                {renderedActions && (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "row",
                            gap: 1.5,
                            flexWrap: "wrap",
                            flexShrink: 0,
                        }}
                    >
                        {renderedActions}
                    </Box>
                )}
            </Box>
            {showDivider && <Divider sx={{ mt: 1 }} />}
        </Box>
    );
}
