import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useState } from "react";

function stripHtmlTags(html) {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength).trim()}...`;
}

export function CKEditorContentDisplay({ content, maxLength = 100, showViewButton = true }) {
    const [dialogOpen, setDialogOpen] = useState(false);

    if (!content || !String(content).trim()) {
        return (
            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
                No content
            </Typography>
        );
    }

    const plainText = stripHtmlTags(String(content));
    const isLongContent = plainText.length > maxLength;
    const previewText = isLongContent ? truncateText(plainText, maxLength) : plainText;
    const shouldShowButton = showViewButton && (isLongContent || String(content).includes("<"));

    if (shouldShowButton) {
        return (
            <>
                <Button
                    size="small"
                    startIcon={<VisibilityIcon fontSize="small" />}
                    onClick={(e) => {
                        e.stopPropagation();
                        setDialogOpen(true);
                    }}
                >
                    View
                </Button>
                <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        Content
                        <IconButton size="small" onClick={() => setDialogOpen(false)} aria-label="Close">
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Box
                            sx={{ "& img": { maxWidth: "100%" } }}
                            dangerouslySetInnerHTML={{
                                __html: String(content),
                            }}
                        />
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
            {previewText}
        </Typography>
    );
}
