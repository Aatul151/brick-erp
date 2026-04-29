import { createContext, useContext, useState } from "react";

const BreadcrumbContext = createContext(null);

export function BreadcrumbProvider({ children }) {
    const [customCrumbs, setCustomCrumbs] = useState(null);

    const setBreadcrumb = (crumbs) => {
        setCustomCrumbs(crumbs);
    };

    const clearBreadcrumb = () => {
        setCustomCrumbs(null);
    };

    return <BreadcrumbContext.Provider value={{ customCrumbs, setBreadcrumb, clearBreadcrumb }}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumb() {
    const ctx = useContext(BreadcrumbContext);
    return (
        ctx || {
            customCrumbs: null,
            setBreadcrumb: () => {},
            clearBreadcrumb: () => {},
        }
    );
}
