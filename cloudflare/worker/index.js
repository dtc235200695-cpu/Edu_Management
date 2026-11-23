import { handleHealthRequest } from "./health.js";
import { handlePasswordRequest } from "./passwords.js";
import { handleStorageRequest } from "./storage.js";
import { handleUserRequest } from "./users.js";
import { isAuthorized, unauthorized } from "./security.js";

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname.startsWith("/internal/") && !isAuthorized(request, env)) {
            return unauthorized();
        }

        const response =
            await handleHealthRequest(request, env) ||
            await handleUserRequest(request, env) ||
            await handlePasswordRequest(request, env) ||
            await handleStorageRequest(request, env);
        return response || Response.json({ error: "Not found" }, { status: 404 });
    }
};
