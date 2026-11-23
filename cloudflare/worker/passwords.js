import { invalidRequest, readJson } from "./security.js";

export async function handlePasswordRequest(request, env) {
    const url = new URL(request.url);
    const resetRoute = url.pathname.match(
        /^\/internal\/users\/([^/]+)\/password-reset$/
    );
    const passwordEmailRoute = url.pathname.match(
        /^\/internal\/users\/([^/]+)\/password-email$/
    );
    if (
        !resetRoute &&
        !passwordEmailRoute &&
        url.pathname !== "/internal/password-reset/request" &&
        url.pathname !== "/internal/password-reset/cancel" &&
        url.pathname !== "/internal/users/password"
    ) {
        return null;
    }

    try {
        if (resetRoute && request.method === "POST") {
            const id = decodeURIComponent(resetRoute[1]);
            const body = await readJson(request);
            const { code_hash, password_hash } = body || {};
            if (
                typeof code_hash !== "string" ||
                typeof password_hash !== "string" ||
                !password_hash.startsWith("scrypt$")
            ) {
                return invalidRequest("Invalid password reset data.");
            }

            const now = Math.floor(Date.now() / 1000);
            const token = await env.DB.prepare(`
                SELECT code_hash, expires_at, attempt_count
                FROM password_reset_tokens WHERE user_id = ?
            `).bind(id).first();
            if (!token || token.expires_at <= now || token.attempt_count >= 5) {
                await env.DB.prepare(
                    "DELETE FROM password_reset_tokens WHERE user_id = ?"
                ).bind(id).run();
                return Response.json({ success: false }, { status: 400 });
            }
            if (token.code_hash !== code_hash) {
                await env.DB.prepare(`
                    UPDATE password_reset_tokens
                    SET attempt_count = attempt_count + 1
                    WHERE user_id = ?
                `).bind(id).run();
                return Response.json({ success: false }, { status: 400 });
            }

            const results = await env.DB.batch([
                env.DB.prepare(`
                    UPDATE users
                    SET password_hash = ?, must_change_password = 0,
                        password_email_sent_at = COALESCE(
                            password_email_sent_at, CURRENT_TIMESTAMP
                        ),
                        password_email_claimed_at = NULL,
                        auth_version = auth_version + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                      AND EXISTS (
                        SELECT 1 FROM password_reset_tokens
                        WHERE user_id = ? AND code_hash = ? AND expires_at > ?
                          AND attempt_count < 5
                      )
                `).bind(password_hash, id, id, code_hash, now),
                env.DB.prepare(`
                    DELETE FROM password_reset_tokens
                    WHERE user_id = ? AND code_hash = ?
                `).bind(id, code_hash)
            ]);
            if (results[0].meta.changes !== 1) {
                return Response.json({ success: false }, { status: 400 });
            }
            return Response.json({ success: true });
        }

        if (request.method === "POST" && url.pathname === "/internal/password-reset/request") {
            const body = await readJson(request);
            const { user_id, code_hash, expires_at } = body || {};
            const now = Math.floor(Date.now() / 1000);
            if (
                typeof user_id !== "string" ||
                typeof code_hash !== "string" ||
                !Number.isInteger(expires_at) ||
                expires_at <= now ||
                expires_at > now + 15 * 60
            ) {
                return invalidRequest("Invalid password reset request.");
            }
            const previous = await env.DB.prepare(`
                SELECT created_at FROM password_reset_tokens WHERE user_id = ?
            `).bind(user_id).first();
            if (previous && now - previous.created_at < 60) {
                return Response.json(
                    { error: "Please wait before requesting another code." },
                    { status: 429 }
                );
            }
            await env.DB.prepare(`
                INSERT INTO password_reset_tokens (
                    user_id, code_hash, expires_at, attempt_count, created_at
                ) VALUES (?, ?, ?, 0, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    code_hash = excluded.code_hash,
                    expires_at = excluded.expires_at,
                    attempt_count = 0,
                    created_at = excluded.created_at
            `).bind(user_id, code_hash, expires_at, now).run();
            return Response.json({ success: true });
        }

        if (request.method === "POST" && url.pathname === "/internal/password-reset/cancel") {
            const body = await readJson(request);
            const { user_id, code_hash } = body || {};
            if (typeof user_id !== "string" || typeof code_hash !== "string") {
                return invalidRequest("Invalid password reset cancellation.");
            }
            await env.DB.prepare(`
                DELETE FROM password_reset_tokens
                WHERE user_id = ? AND code_hash = ?
            `).bind(user_id, code_hash).run();
            return Response.json({ success: true });
        }

        if (request.method === "POST" && url.pathname === "/internal/users/password") {
            const body = await readJson(request);
            const { user_id, current_password_hash, password_hash } = body || {};
            if (
                typeof user_id !== "string" ||
                typeof current_password_hash !== "string" ||
                typeof password_hash !== "string" ||
                !password_hash.startsWith("scrypt$")
            ) {
                return invalidRequest("Invalid password change data.");
            }
            const result = await env.DB.prepare(`
                UPDATE users
                SET password_hash = ?, must_change_password = 0,
                    password_email_sent_at = COALESCE(
                        password_email_sent_at, CURRENT_TIMESTAMP
                    ),
                    password_email_claimed_at = NULL,
                    auth_version = auth_version + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND password_hash = ? AND status = 'active'
            `).bind(password_hash, user_id, current_password_hash).run();
            return Response.json({ success: result.meta.changes === 1 });
        }

        if (passwordEmailRoute && request.method === "POST") {
            const id = decodeURIComponent(passwordEmailRoute[1]);
            const body = await readJson(request);
            const { operation, password_hash } = body || {};
            if (!["claim", "sent", "release"].includes(operation)) {
                return invalidRequest("Invalid password email operation.");
            }
            if (operation === "claim") {
                if (
                    typeof password_hash !== "string" ||
                    !password_hash.startsWith("scrypt$")
                ) {
                    return invalidRequest("Invalid temporary password hash.");
                }
                const result = await env.DB.prepare(`
                    UPDATE users
                    SET password_hash = ?, password_email_claimed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND password_email_sent_at IS NULL
                      AND (
                        password_email_claimed_at IS NULL OR
                        password_email_claimed_at < datetime('now', '-5 minutes')
                      )
                `).bind(password_hash, id).run();
                return Response.json({ claimed: result.meta.changes === 1 });
            }
            if (operation === "sent") {
                await env.DB.prepare(`
                    UPDATE users
                    SET password_email_sent_at = CURRENT_TIMESTAMP,
                        password_email_claimed_at = NULL
                    WHERE id = ?
                `).bind(id).run();
            } else {
                await env.DB.prepare(`
                    UPDATE users SET password_email_claimed_at = NULL
                    WHERE id = ? AND password_email_sent_at IS NULL
                `).bind(id).run();
            }
            return Response.json({ success: true });
        }
    } catch (error) {
        console.error("Internal password request failed:", error.name || "Error");
        return Response.json(
            { error: "Unable to complete the password request." },
            { status: 500 }
        );
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
}
