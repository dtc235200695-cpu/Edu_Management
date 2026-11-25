import { errors, jwtVerify, SignJWT } from "jose";

export const SESSION_AUDIENCE = "learnwise-session";
export const OAUTH_AUDIENCE = "learnwise-oauth-state";
const ISSUER = "learnwise-api";
const SESSION_SECONDS = 60 * 60;
const encoder = new TextEncoder();

export function readCookies(request) {
    return Object.fromEntries(
        (request.headers.get("Cookie") || "")
            .split(";")
            .map((part) => {
                const separator = part.indexOf("=");
                return separator > 0
                    ? [part.slice(0, separator).trim(), part.slice(separator + 1).trim()]
                    : ["", ""];
            })
            .filter(([name]) => name),
    );
}

export function cookieNames(request) {
    const secure = new URL(request.url).protocol === "https:";
    return {
        secure,
        session: secure ? "__Host-learnwise_session" : "learnwise_session",
        oauth: secure ? "__Host-learnwise_oauth" : "learnwise_oauth",
    };
}

export function appendSessionCookie(headers, name, value, maxAge, request) {
    const secure = new URL(request.url).protocol === "https:";
    headers.append(
        "Set-Cookie",
        `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`,
    );
}

export function clearCookie(headers, name, request) {
    appendSessionCookie(headers, name, "", 0, request);
}

export function clearAuthCookies(headers, request) {
    const names = cookieNames(request);
    clearCookie(headers, names.session, request);
    clearCookie(headers, names.oauth, request);
}

function keyFor(env) {
    if (typeof env.SESSION_SECRET !== "string" || encoder.encode(env.SESSION_SECRET).length < 32) {
        throw new Error("SESSION_SECRET must contain at least 32 bytes.");
    }
    return encoder.encode(env.SESSION_SECRET);
}

export async function createJwt(env, payload, audience, lifetimeSeconds, subject) {
    const token = new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(ISSUER)
        .setAudience(audience)
        .setIssuedAt()
        .setJti(crypto.randomUUID())
        .setExpirationTime(`${lifetimeSeconds}s`);
    if (subject) token.setSubject(subject);
    return token.sign(keyFor(env));
}

export async function verifyJwt(env, token, audience) {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, keyFor(env), {
            algorithms: ["HS256"],
            audience,
            issuer: ISSUER,
        });
        if (
            typeof payload.exp !== "number" ||
            typeof payload.iat !== "number" ||
            typeof payload.jti !== "string"
        ) return null;
        return payload;
    } catch (error) {
        if (error instanceof errors.JOSEError) return null;
        throw error;
    }
}

export function publicUser(record, mustChangePassword = false) {
    const roleDetails = {
        admin: {
            roleTitle: "Quản trị viên",
            roleBadge: "Quản trị viên",
            department: "Quản trị hệ thống",
        },
        lecturer: {
            roleTitle: "Giảng viên",
            roleBadge: "Giảng viên",
            department: "Đào tạo",
        },
        student: {
            roleTitle: "Sinh viên",
            roleBadge: "Sinh viên",
            department: "Sinh viên",
        },
    }[record.role];
    if (!roleDetails) return null;
    return {
        id: record.id,
        email: record.email,
        name: record.name,
        picture: record.picture || "",
        role: record.role,
        ...roleDetails,
        avatarText: record.name.trim().split(/\s+/).slice(-2)
            .map((part) => part[0] || "").join("").toUpperCase(),
        studentId: record.student_id || undefined,
        mustChangePassword,
    };
}

export async function getSession(request, env) {
    const names = cookieNames(request);
    const payload = await verifyJwt(
        env,
        readCookies(request)[names.session],
        SESSION_AUDIENCE,
    );
    if (
        !payload ||
        typeof payload.sub !== "string" ||
        typeof payload.authVersion !== "number"
    ) return null;

    const record = await env.DB.prepare(`
        SELECT id, email, name, picture, role, student_id, password_hash,
               status, auth_version, must_change_password
        FROM users WHERE id = ?
    `).bind(payload.sub).first();
    if (
        !record ||
        record.status !== "active" ||
        record.auth_version !== payload.authVersion
    ) return null;
    const user = publicUser(record, payload.mustChangePassword === true);
    return user ? { user, record } : null;
}

export async function issueSession(env, record, mustChangePassword = false) {
    const token = await createJwt(
        env,
        {
            email: record.email,
            name: record.name,
            picture: record.picture || "",
            authVersion: record.auth_version,
            mustChangePassword,
        },
        SESSION_AUDIENCE,
        SESSION_SECONDS,
        record.id,
    );
    return token;
}
