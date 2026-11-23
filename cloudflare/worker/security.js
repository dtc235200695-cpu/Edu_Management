const DEFAULT_ADMIN_EMAIL = "hoanghai69205@gmail.com";

export function isAuthorized(request, env) {
    return Boolean(
        env.LEARNWISE_API_SECRET &&
        request.headers.get("Authorization") === `Bearer ${env.LEARNWISE_API_SECRET}`
    );
}

export function unauthorized() {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function adminEmail(env) {
    return (env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
}

export async function readJson(request) {
    try {
        return await request.json();
    } catch {
        return null;
    }
}

export function invalidRequest(message) {
    return Response.json({ error: message }, { status: 400 });
}

export function validStudentId(studentId) {
    return typeof studentId === "string" && /^[A-Za-z0-9._-]{3,30}$/.test(studentId);
}
