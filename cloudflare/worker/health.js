export async function handleHealthRequest(request, env) {
    const url = new URL(request.url);
    if (request.method !== "GET" || url.pathname !== "/health") return null;

    try {
        const [result] = await Promise.all([
            env.DB.prepare("SELECT 1 AS connected").first(),
            env.STORAGE.list({ limit: 1 })
        ]);
        return Response.json({
            success: true,
            database: "connected",
            result,
            storage: "connected"
        });
    } catch {
        return Response.json(
            { success: false, error: "Cloudflare D1 or R2 connection failed" },
            { status: 500 }
        );
    }
}
