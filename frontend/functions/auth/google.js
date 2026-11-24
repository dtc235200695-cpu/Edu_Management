import {
    OAUTH_AUDIENCE,
    appendSessionCookie,
    cookieNames,
    createJwt,
} from "../../../cloudflare/worker/session.js";

export async function onRequestGet({ request, env }) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        return Response.json(
            { error: "Google sign-in is not configured." },
            { status: 503 },
        );
    }
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    const stateToken = await createJwt(
        env,
        { state, nonce },
        OAUTH_AUDIENCE,
        10 * 60,
    );
    const callbackUrl = env.GOOGLE_REDIRECT_URI ||
        new URL("/auth/google/callback", request.url).toString();
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: callbackUrl,
        response_type: "code",
        scope: "openid email profile",
        access_type: "online",
        prompt: "select_account",
        state,
        nonce,
    }).toString();

    const headers = new Headers({
        Location: authorizationUrl.toString(),
        "Cache-Control": "no-store",
    });
    appendSessionCookie(
        headers,
        cookieNames(request).oauth,
        stateToken,
        10 * 60,
        request,
    );
    return new Response(null, { status: 302, headers });
}
