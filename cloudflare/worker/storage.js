import { isAuthorized, invalidRequest, unauthorized } from "./security.js";
import { createCsvModelInfo } from "./csv-model.js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 120;

export async function handleStorageRequest(request, env) {
    const url = new URL(request.url);
    if (
        url.pathname !== "/internal/storage/objects" &&
        url.pathname !== "/internal/storage/model-info"
    ) return null;
    if (!isAuthorized(request, env)) return unauthorized();

    if (url.pathname === "/internal/storage/model-info") {
        if (request.method !== "GET") {
            return Response.json({ error: "Method not allowed" }, { status: 405 });
        }
        const key = url.searchParams.get("key");
        if (
            !key ||
            key.length > 512 ||
            !key.startsWith("imports/") ||
            !key.toLowerCase().endsWith(".csv") ||
            key.includes("\\") ||
            key.split("/").some((part) => part === "..")
        ) {
            return invalidRequest("A valid R2 import key is required.");
        }

        try {
            const object = await env.STORAGE.get(key);
            if (!object) {
                return Response.json(
                    { success: false, error: "Không tìm thấy file CSV đã chọn trong R2." },
                    { status: 404 },
                );
            }
            if (object.size > MAX_UPLOAD_BYTES) {
                return Response.json(
                    { success: false, error: "CSV vượt quá giới hạn 10 MB." },
                    { status: 413 },
                );
            }
            const modelInfo = createCsvModelInfo(
                await object.text(),
                object.customMetadata?.filename || key.split("/").pop(),
            );
            return Response.json(modelInfo, {
                headers: { "Cache-Control": "no-store" },
            });
        } catch (error) {
            if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
                return Response.json(
                    { success: false, error: error.message },
                    { status: error.status },
                );
            }
            console.error("R2 model evaluation failed:", error.name || "Error");
            return Response.json(
                { success: false, error: "Không thể đọc hoặc đánh giá file CSV đã chọn." },
                { status: 500 },
            );
        }
    }

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
