import { useState, cloneElement } from "react";
import { Popover, Box, Typography } from "@mui/material";

/**
 * Click trigger opens a MUI Popover (saas-core AppPopover pattern).
 */
export function AppPopover({
    trigger,
    children,
    title,
    maxWidth = 300,
    maxHeight = 400,
    padding = 1.5,
    paperSx,
    contentSx,
    stopPropagation = true,
    onOpen,
    onClose,
    anchorOrigin = { vertical: "bottom", horizontal: "left" },
    transformOrigin = { vertical: "top", horizontal: "left" },
    ...popoverProps
}) {
    const [anchorEl, setAnchorEl] = useState(null);

    const handleOpen = (event) => {
        if (stopPropagation) {
            event.stopPropagation();
        }
        setAnchorEl(event.currentTarget);
        onOpen?.();
    };

    const handleClose = () => {
        setAnchorEl(null);
        onClose?.();
    };

    const open = Boolean(anchorEl);

    const triggerElement = cloneElement(trigger, {
        onClick: handleOpen,
    });

    return (
        <>
            {triggerElement}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={anchorOrigin}
                transformOrigin={transformOrigin}
                onClick={(e) => {
                    if (stopPropagation) {
                        e.stopPropagation();
                    }
                }}
                PaperProps={{
                    onClick: (e) => {
                        if (stopPropagation) {
                            e.stopPropagation();
                        }
                    },
                    sx: {
                        maxWidth,
                        maxHeight,
                        overflow: "auto",
                        ...paperSx,
                    },
                }}
                {...popoverProps}
            >
                <Box sx={{ p: padding, ...contentSx }}>
                    {title ? (
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            {title}
                        </Typography>
                    ) : null}
                    {children}
                </Box>
            </Popover>
        </>
    );
}
