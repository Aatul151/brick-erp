import ProtectedRoute from "./ProtectedRoute";
import Layout from "./layout/Layout";

/**
 * Single wrapper for ProtectedRoute + Layout.
 * Use as parent for all protected pages to avoid duplication.
 * Optionally wraps children with permission-specific ProtectedRoute.
 */
export default function ProtectedLayout({ children, permission, roles = [] }) {
    return (
        <ProtectedRoute>
            <Layout>
                {permission ? (
                    <ProtectedRoute permission={permission} roles={roles}>
                        {children}
                    </ProtectedRoute>
                ) : (
                    children
                )}
            </Layout>
        </ProtectedRoute>
    );
}
