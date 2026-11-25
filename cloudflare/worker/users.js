import { adminEmail, invalidRequest, readJson, validStudentId } from "./security.js";

const USER_COLUMNS = `
    id, email, name, picture, role, student_id, password_hash, status,
    google_sub, must_change_password, auth_version, password_email_sent_at,
    created_at, updated_at
`;

function validRole(role) {
    return ["student", "lecturer", "admin", "pending"].includes(role);
}

function validStatus(status) {
    return ["active", "pending", "suspended"].includes(status);
}

function validEmail(email) {
    return typeof email === "string" &&
        email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validName(name) {
    return typeof name === "string" &&
        name.trim().length > 0 &&
        name.trim().length <= 120 &&
        !/[\r\n]/.test(name);
}

async function findUser(env, identifier) {
    return env.DB.prepare(`
        SELECT ${USER_COLUMNS}
        FROM users
        WHERE lower(email) = lower(?)
           OR upper(student_id) = upper(?)
           OR id = ?
        LIMIT 1
    `).bind(identifier, identifier, identifier).first();
}

export async function handleUserRequest(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/internal/users/") &&
        url.pathname !== "/internal/users") {
        return null;
    }

    try {
        if (request.method === "GET" && url.pathname === "/internal/users/lookup") {
            const identifier = url.searchParams.get("identifier")?.trim();
            if (!identifier || identifier.length > 254) {
                return invalidRequest("A valid user identifier is required.");
            }
            return Response.json({ user: await findUser(env, identifier) || null });
        }

        if (request.method === "GET" && url.pathname === "/internal/users") {
            const result = await env.DB.prepare(`
                SELECT id, email, name, picture, role, student_id, status,
                       must_change_password, created_at, updated_at
                FROM users ORDER BY created_at DESC LIMIT 500
            `).all();
            return Response.json({ users: result.results || [] });
        }

        if (request.method === "POST" && url.pathname === "/internal/users/google") {
            const body = await readJson(request);
            const {
                email,
                name,
                picture = "",
                google_sub,
                password_hash = null,
            } = body || {};
            if (
                !validEmail(email) ||
                !validName(name) ||
                typeof picture !== "string" ||
                typeof google_sub !== "string" ||
                !google_sub ||
                (
                    password_hash !== null &&
                    (
                        typeof password_hash !== "string" ||
                        !password_hash.startsWith("scrypt$")
                    )
                )
            ) {
                return invalidRequest("Invalid Google account data.");
            }

            const normalizedEmail = email.trim().toLowerCase();
            let user = await env.DB.prepare(`
                SELECT ${USER_COLUMNS}
                FROM users
                WHERE lower(email) = ? OR google_sub = ?
                LIMIT 1
            `).bind(normalizedEmail, google_sub).first();
            let created = false;

            if (!user) {
                const isAdmin = normalizedEmail === adminEmail(env);
                const id = crypto.randomUUID();
                const result = await env.DB.prepare(`
                    INSERT INTO users (
                        id, email, name, picture, role, status, google_sub,
                        password_hash, must_change_password
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(email) DO NOTHING
                `).bind(
                    id,
                    normalizedEmail,
                    name.trim(),
                    picture,
                    isAdmin ? "admin" : "student",
                    "active",
                    google_sub,
                    password_hash,
                    password_hash ? 1 : 0
                ).run();
                created = result.meta.changes === 1;
                user = await env.DB.prepare(`
                    SELECT ${USER_COLUMNS}
                    FROM users
                    WHERE lower(email) = ? OR google_sub = ?
                    LIMIT 1
                `).bind(normalizedEmail, google_sub).first();
            }

            if (
                !user ||
                user.email.toLowerCase() !== normalizedEmail ||
                (user.google_sub && user.google_sub !== google_sub)
            ) {
                return Response.json(
                    { error: "This Google account is already linked to another user." },
                    { status: 409 }
                );
            }

            const isAdmin = normalizedEmail === adminEmail(env);
            const role = isAdmin
                ? "admin"
                : user.role === "pending"
                    ? "student"
                    : user.role;
            const status = isAdmin
                ? "active"
                : user.status === "pending" &&
                      (user.role === "pending" || user.role === "student")
                    ? "active"
                    : user.status;
            await env.DB.prepare(`
                UPDATE users
                SET google_sub = ?, picture = ?,
                    role = ?, status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND (google_sub IS NULL OR google_sub = ?)
            `).bind(
                google_sub,
                picture,
                role,
                status,
                user.id,
                google_sub
            ).run();
            user = await env.DB.prepare(`
                SELECT ${USER_COLUMNS} FROM users WHERE id = ?
            `).bind(user.id).first();
            return Response.json({ created, user });
        }

        const profileRoute = url.pathname.match(/^\/internal\/users\/([^/]+)\/profile$/);
        if (profileRoute && request.method === "PATCH") {
            const id = decodeURIComponent(profileRoute[1]);
            const { name } = await readJson(request);
            if (!validName(name)) {
                return invalidRequest("A valid profile name is required.");
            }
            const result = await env.DB.prepare(`
                UPDATE users
                SET name = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'active'
            `).bind(name.trim(), id).run();
            if (result.meta.changes !== 1) {
                return Response.json({ error: "User not found or inactive." }, { status: 404 });
            }
            const user = await env.DB.prepare(`
                SELECT id, email, name, picture, role, student_id,
                       status, must_change_password
                FROM users WHERE id = ?
            `).bind(id).first();
            return Response.json({ user });
        }

        if (request.method === "POST" && url.pathname === "/internal/users") {
            const body = await readJson(request);
            const {
                id, email, name, role, student_id = null, password_hash,
            } = body || {};
            if (
                typeof id !== "string" ||
                !validEmail(email) ||
                !validName(name) ||
                !["student", "lecturer"].includes(role) ||
                (role === "student" && !validStudentId(student_id)) ||
                (student_id !== null && !validStudentId(student_id)) ||
                typeof password_hash !== "string" ||
                !password_hash.startsWith("scrypt$") ||
                email.trim().toLowerCase() === adminEmail(env)
            ) {
                return invalidRequest("Invalid user account data.");
            }

            await env.DB.prepare(`
                INSERT INTO users (
                    id, email, name, role, student_id, password_hash,
                    status, must_change_password
                ) VALUES (?, ?, ?, ?, ?, ?, 'active', 1)
            `).bind(
                id,
                email.trim().toLowerCase(),
                name.trim(),
                role,
                student_id,
                password_hash
            ).run();
            const user = await env.DB.prepare(`
                SELECT id, email, name, role, student_id, status,
                       must_change_password, created_at, updated_at
                FROM users WHERE id = ?
            `).bind(id).first();
            return Response.json({ user }, { status: 201 });
        }

        const userRoute = url.pathname.match(/^\/internal\/users\/([^/]+)$/);
        if (userRoute && request.method === "PATCH") {
            const id = decodeURIComponent(userRoute[1]);
            const body = await readJson(request);
            const { role, status, student_id = null } = body || {};
            if (
                !validRole(role) ||
                !validStatus(status) ||
                (status === "active" && role === "pending") ||
                (role === "pending" && status !== "pending") ||
                (role === "student" && !validStudentId(student_id)) ||
                (role !== "student" && student_id !== null) ||
                (student_id !== null && !validStudentId(student_id))
            ) {
                return invalidRequest("Invalid role, status, or student ID.");
            }

            const existing = await env.DB.prepare(
                "SELECT id, email FROM users WHERE id = ?"
            ).bind(id).first();
            if (!existing) {
                return Response.json({ error: "User not found." }, { status: 404 });
            }
            if (
                existing.email.toLowerCase() === adminEmail(env) &&
                (role !== "admin" || status !== "active")
            ) {
                return Response.json(
                    { error: "The primary administrator cannot be demoted or suspended." },
                    { status: 403 }
                );
            }

            await env.DB.prepare(`
                UPDATE users
                SET role = ?, status = ?, student_id = ?,
                    auth_version = auth_version + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(role, status, student_id, id).run();
            const user = await env.DB.prepare(`
                SELECT id, email, name, role, student_id, status,
                       must_change_password, created_at, updated_at
                FROM users WHERE id = ?
            `).bind(id).first();
            return Response.json({ user });
        }
    } catch (error) {
        if (error.message?.includes("UNIQUE constraint failed")) {
            return Response.json(
                { error: "Email address or student ID is already in use." },
                { status: 409 }
            );
        }
        console.error("Internal user request failed:", error.name || "Error");
        return Response.json(
            { error: "Unable to complete the user request." },
            { status: 500 }
        );
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
}
