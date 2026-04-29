import MuiButton from "@mui/material/Button";

const variantMap = {
    primary: { color: "primary", variant: "contained" },
    secondary: { color: "secondary", variant: "outlined" },
    danger: { color: "error", variant: "contained" },
    success: { color: "success", variant: "contained" },
};

const sizeMap = { sm: "small", md: "medium", lg: "large" };

export default function Button({ children, variant = "primary", size = "md", disabled = false, type = "button", onClick, className = "", ...rest }) {
    const { color, variant: muiVariant } = variantMap[variant] || variantMap.primary;
    return (
        <MuiButton
            type={type}
            onClick={onClick}
            disabled={disabled}
            color={color}
            variant={muiVariant}
            size={sizeMap[size] || "medium"}
            className={className}
            sx={{ textTransform: "none", fontWeight: 600 }}
            {...rest}
        >
            {children}
        </MuiButton>
    );
}
