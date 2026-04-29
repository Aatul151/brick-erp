const API_URL = import.meta.env.VITE_API_URL || "";

/**
 * Resolve stored file URL to an absolute URL for fetch().
 */
export function getFileUrl(fileUrl) {
    if (!fileUrl) return "";
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
        return fileUrl;
    }
    const base = API_URL.replace(/\/$/, "");
    const path = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
    return `${base}${path}`;
}

/**
 * GET file endpoint with Bearer token (same contract as api.js).
 * @param {string} fileUrl - Stored or absolute URL
 * @param {string | null | undefined} accessToken - Pass from AuthContext.getAccessToken(); falls back to localStorage if omitted
 */
export async function authorizedFileFetch(fileUrl, accessToken) {
    const url = getFileUrl(fileUrl);
    const token = accessToken !== undefined ? accessToken : localStorage.getItem("accessToken");
    const res = await fetch(url, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    if (res.status === 403) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        throw new Error("Unauthorized");
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || res.statusText || "Request failed");
    }
    return res;
}

/**
 * Download a file using authenticated fetch + blob (plain links cannot send Authorization).
 * @param {string | null | undefined} accessToken - Pass from AuthContext.getAccessToken(); falls back to localStorage if omitted
 */
export async function downloadFile(fileUrl, fileName, onError, accessToken) {
    try {
        const res = await authorizedFileFetch(fileUrl, accessToken);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = fileName || "download";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
    } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
    }
}
