export function isSiteAdmin(req) {
    return req.user?.roles?.some((r) => r.roleName === "Site Admin");
}
