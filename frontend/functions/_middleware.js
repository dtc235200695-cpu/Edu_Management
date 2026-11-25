const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function onRequest({ request, next }) {
    const url = new URL(request.url);
    if (
        !SAFE_METHODS.has(request.method) &&
        (url.pathname.startsWith("/api/") || url.pathname === "/auth/logout") &&
        request.headers.get("Origin") !== url.origin
    ) {
        return Response.json(
            { success: false, error: "Nguồn yêu cầu không hợp lệ." },
            { status: 403 },
        );
    }

    const response = await next();
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    headers.set(
        "Content-Security-Policy",
        [
            "default-src 'self'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
            "form-action 'self' https://accounts.google.com",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' https: data:",
            "font-src 'self' https://fonts.gstatic.com data:",
            "connect-src 'self'",
        ].join("; "),
    );
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}
