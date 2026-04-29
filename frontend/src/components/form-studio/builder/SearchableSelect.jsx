import { useState } from "react";
import {
    TextField,
    MenuItem,
    ListSubheader,
    Box,
    CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { filterOptions } from "../../../utils/form-studio/selectSearchUtils";

export function SearchableSelect({
    label,
    value,
    onChange,
    options = [],
    disabled = false,
    helperText,
    placeholder = "Search options...",
    loading = false,
    loadingText = "Loading...",
    emptyText = "No options available",
    margin = "none",
    fullWidth = true,
    size = "small",
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectOpen, setSelectOpen] = useState(false);
    const filteredOptions = filterOptions(options, searchTerm);

    return (
        <TextField
            select
            label={label}
            fullWidth={fullWidth}
            size={size}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            margin={margin}
            disabled={disabled}
            helperText={helperText}
            SelectProps={{
                open: selectOpen,
                onOpen: () => setSelectOpen(true),
                onClose: () => {
                    setSelectOpen(false);
                    setSearchTerm("");
                },
                MenuProps: {
                    PaperProps: { sx: { maxHeight: 400 } },
                    disableAutoFocusItem: true,
                },
            }}
        >
            {!loading && options.length > 0 && (
                <ListSubheader
                    sx={{
                        position: "sticky",
                        top: 0,
                        backgroundColor: "background.paper",
                        zIndex: 1,
                        p: 1,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <TextField
                        fullWidth
                        size="small"
                        placeholder={placeholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        InputProps={{
                            startAdornment: (
                                <SearchIcon
                                    fontSize="small"
                                    sx={{ mr: 0.5, color: "text.secondary" }}
                                />
                            ),
                        }}
                    />
                </ListSubheader>
            )}
            {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <CircularProgress size={24} />
                    <Box component="span" sx={{ ml: 1, alignSelf: "center" }}>
                        {loadingText}
                    </Box>
                </Box>
            )}
            {!loading && filteredOptions.length === 0 && (
                <MenuItem disabled value="">
                    {emptyText}
                </MenuItem>
            )}
            {!loading &&
                filteredOptions.map((opt) => {
                    const v = typeof opt === "string" ? opt : opt.value;
                    const lab = typeof opt === "string" ? opt : opt.label;
                    return (
                        <MenuItem key={v} value={v}>
                            {lab}
                        </MenuItem>
                    );
                })}
        </TextField>
    );
}
