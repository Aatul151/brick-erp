import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import { authApi } from "../utils/api/coreapi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem("user");
            const token = localStorage.getItem("accessToken");

            if (storedUser && token) {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                try {
                    const profile = await authApi.getProfile();
                    const updatedUser = {
                        ...parsed,
                        ...profile,
                        tenantThemeSetting:
                            profile.tenantThemeSetting ??
                            parsed.tenantThemeSetting,
                    };
                    setUser(updatedUser);
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                } catch {
                    setUser(parsed);
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (credentials) => {
        const response = await authApi.login(credentials);
        localStorage.setItem("accessToken", response.accessToken);
        localStorage.setItem("refreshToken", response.refreshToken);
        localStorage.setItem("user", JSON.stringify(response.user));
        setUser(response.user);
        return response;
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            setUser(null);
        }
    };

    const hasRole = (roleName) => {
        return user?.roles?.some((r) => r.roleName === roleName) || false;
    };

    const hasPermission = (resourceName, action) => {
        if (!user?.permissions?.length) return false;
        const perms = user.permissions;
        if (perms.some((p) => p.resourceName === "*" && p.action === "*"))
            return true;
        return perms.some(
            (p) => p.resourceName === resourceName && p.action === action,
        );
    };

    const isSiteAdmin = () => hasRole("Site Admin");
    const isClientAdmin = () => hasRole("Client Admin");
    const isClientUser = () => hasRole("Client User");

    const updateUser = (updates) => {
        setUser((prev) => {
            const next = { ...prev, ...updates };
            localStorage.setItem("user", JSON.stringify(next));
            return next;
        });
    };

    /** Current JWT for Authorization header (reads storage at call time). */
    const getAccessToken = useCallback(
        () => localStorage.getItem("accessToken"),
        [],
    );

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                hasRole,
                hasPermission,
                isSiteAdmin,
                isClientAdmin,
                isClientUser,
                updateUser,
                getAccessToken,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
};
