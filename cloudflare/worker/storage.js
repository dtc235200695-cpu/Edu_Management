import { isAuthorized, invalidRequest, unauthorized } from "./security.js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 120;

export async function handleStorageRequest(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/internal/storage/objects") return null;
    if (!isAuthorized(request, env)) return unauthorized();

    if (request.method === "POST") {
        const contentType = request.headers.get("Content-Type") || "";
        const rawFilename = request.headers.get("X-File-Name") || "";
        let decodedFilename = rawFilename;
        try {
            decodedFilename = decodeURIComponent(rawFilename);
        } catch {
            return invalidRequest("Filename encoding is invalid.");
        }
        const filename = decodedFilename
            .replace(/[\\/]/g, "_")
            .replace(/[^\w.-]/g, "_")
            .slice(0, MAX_FILENAME_LENGTH);
        const declaredSize = Number(request.headers.get("Content-Length") || 0);

        if (!filename || !filename.toLowerCase().endsWith(".csv")) {
            return invalidRequest("A valid CSV filename is required.");
        }
        if (!contentType.toLowerCase().startsWith("text/csv")) {
            return Response.json(
                { error: "Only CSV uploads are supported." },
                { status: 415 }
            );
        }
        if (declaredSize > MAX_UPLOAD_BYTES) {
            return Response.json(
                { error: "CSV file exceeds the 10 MB limit." },
                { status: 413 }
            );
        }

        try {
            const body = await request.arrayBuffer();
            if (body.byteLength === 0 || body.byteLength > MAX_UPLOAD_BYTES) {
                return Response.json(
                    { error: "CSV file is empty or exceeds the 10 MB limit." },
                    { status: body.byteLength > MAX_UPLOAD_BYTES ? 413 : 400 }
                );
            }

            const uploadedAt = new Date().toISOString();
            const date = uploadedAt.slice(0, 10).replace(/-/g, "/");
            const key = `imports/${date}/${crypto.randomUUID()}-${filename}`;
            await env.STORAGE.put(key, body, {
                httpMetadata: { contentType: "text/csv; charset=utf-8" },
                customMetadata: { filename, uploadedAt }
            });
            return Response.json(
                {
                    success: true,
                    key,
                    filename,
                    size: body.byteLength,
                    uploaded_at: uploadedAt
                },
                { status: 201 }
            );
        } catch (error) {
            console.error("R2 upload failed:", error.name || "Error");
            return Response.json(
                { error: "Unable to store CSV in Cloudflare R2." },
                { status: 500 }
            );
        }
    }

    if (request.method === "GET") {
        try {
            const listing = await env.STORAGE.list({
                prefix: "imports/",
                limit: 100
            });
            return Response.json({
                success: true,
                objects: listing.objects.map((object) => ({
                    key: object.key,
                    filename: object.customMetadata?.filename || object.key.split("/").pop(),
                    size: object.size,
                    uploaded_at: object.customMetadata?.uploadedAt || object.uploaded.toISOString()
                })),
                truncated: listing.truncated
            });
        } catch (error) {
            console.error("R2 listing failed:", error.name || "Error");
            return Response.json(
                { error: "Unable to list Cloudflare R2 objects." },
                { status: 500 }
            );
        }
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
}
