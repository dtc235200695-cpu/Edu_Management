import { handlePublicApiRequest } from "../../../cloudflare/worker/pages-api.js";

export async function onRequest(context) {
    return handlePublicApiRequest(context);
}
