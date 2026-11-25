import { createRemoteJWKSet, jwtVerify } from "jose";
import { handleUserRequest } from "../../../../cloudflare/worker/users.js";
import {
    OAUTH_AUDIENCE,
    appendSessionCookie,
    clearCookie,
    cookieNames,
    issueSession,
    readCookies,
    verifyJwt,
} from "../../../../cloudflare/worker/session.js";

const GOOGLE_KEYS = createRemoteJWKSet(
    new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

function loginUrl(env, request, status) {
    const url = new URL(env.APP_URL || "/", request.url);
    url.searchParams.set("authError", status);
    return url.toString();
}

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const cookies = readCookies(request);
    const names = cookieNames(request);
    const statePayload = await verifyJwt(
        env,
        cookies[names.oauth],
        OAUTH_AUDIENCE,
    );
    const clearHeaders = new Headers();
    clearCookie(clearHeaders, names.oauth, request);

    if (url.searchParams.has("error")) {
        return new Response(null, {
            status: 302,
            headers: new Headers([
                ...clearHeaders,
                ["Location", loginUrl(env, request, "cancelled")],
            ]),
        });
    }
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (
        !env.GOOGLE_CLIENT_ID ||
        !env.GOOGLE_CLIENT_SECRET ||
        !statePayload ||
        typeof statePayload.state !== "string" ||
        typeof statePayload.nonce !== "string" ||
        statePayload.state !== state ||
        !code
    ) {
        clearHeaders.set("Location", loginUrl(env, request, "invalid_state"));
        return new Response(null, { status: 302, headers: clearHeaders });
    }

    let stage = "google_token_exchange";
    try {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: env.GOOGLE_CLIENT_ID,
                client_secret: env.GOOGLE_CLIENT_SECRET,
                redirect_uri: env.GOOGLE_REDIRECT_URI ||
                    new URL("/auth/google/callback", request.url).toString(),
                grant_type: "authorization_code",
            }),
        });
        const tokenResult = await tokenResponse.json();
        if (!tokenResponse.ok || typeof tokenResult.id_token !== "string") {
            const error = new Error("Google code exchange failed.");
            error.status = tokenResponse.status;
            throw error;
        }

        stage = "google_id_token_verification";
        const { payload } = await jwtVerify(tokenResult.id_token, GOOGLE_KEYS, {
            algorithms: ["RS256"],
            issuer: ["accounts.google.com", "https://accounts.google.com"],
            audience: env.GOOGLE_CLIENT_ID,
        });
        if (
            payload.nonce !== statePayload.nonce ||
            typeof payload.email !== "string" ||
            payload.email_verified !== true ||
            typeof payload.sub !== "string"
        ) throw new Error("Google identity claims failed validation.");

        stage = "account_upsert";
        const upsertRequest = new Request(
            new URL("/internal/users/google", request.url),
            {
                method: "POST",
                headers: {
                    Authorization: "Bearer pages-function-internal",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: payload.email,
                    name: payload.name || payload.email,
                    picture: payload.picture || "",
                    google_sub: payload.sub,
                }),
            },
        );
        const upsertResponse = await handleUserRequest(upsertRequest, {
            ...env,
            LEARNWISE_API_SECRET: "pages-function-internal",
        });
        const upsertResult = await upsertResponse.json();
        if (!upsertResponse.ok || !upsertResult.user) {
            const error = new Error(upsertResult.error || "Account could not be saved.");
            error.status = upsertResponse.status;
            throw error;
        }
        const record = upsertResult.user;
        if (record.status !== "active" || record.role === "pending") {
            clearHeaders.set("Location", loginUrl(env, request, "account_disabled"));
            return new Response(null, { status: 302, headers: clearHeaders });
        }

        stage = "session_creation";
        const sessionToken = await issueSession(env, record, false);
        const headers = new Headers({
            Location: env.APP_URL || new URL("/", request.url).toString(),
            "Cache-Control": "no-store",
        });
        clearCookie(headers, names.oauth, request);
        appendSessionCookie(headers, names.session, sessionToken, 60 * 60, request);
        return new Response(null, { status: 302, headers });
    } catch (error) {
        console.error(
            `Pages Google OAuth failed at ${stage} (${error.name || "Error"}${Number.isInteger(error.status) ? `, HTTP ${error.status}` : ""})`,
        );
        clearHeaders.set(
            "Location",
            loginUrl(env, request, "oauth_failed"),
        );
        return new Response(null, { status: 302, headers: clearHeaders });
    }
}
