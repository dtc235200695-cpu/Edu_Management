import { clearAuthCookies } from "../../../cloudflare/worker/session.js";

export function onRequestPost({ request }) {
    const headers = new Headers();
    clearAuthCookies(headers, request);
    return new Response(null, { status: 204, headers });
}
