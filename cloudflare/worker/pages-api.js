import { handleStorageRequest } from "./storage.js";
import { handleLearningPathRequest } from "./learning-paths.js";
import { handleUserRequest } from "./users.js";
import { hashPassword, verifyPassword } from "./password-crypto.js";
import {
    createDemoAnalytics,
    createDemoDashboardOverview,
    demoStudentIdForPathId,
    createDemoPrediction,
    createDemoStudentDetails,
    createDemoStudentList,
} from "./demo-data.js";
import {
    appendSessionCookie,
    cookieNames,
    getSession,
    issueSession,
    publicUser,
    readCookies,
} from "./session.js";
import { sendPasswordResetCode, sendTemporaryPassword } from "./email.js";

const RATE_WINDOW_SECONDS = 15 * 60;
const DUMMY_PASSWORD_HASH =
    "scrypt$LhLNfNsyeGRwT9lPhAp30w$pUMou8Xlb1nfTC85UrJaoGB4T17GQRaKAy6EjiaeT9jbl_RsPMtYBmQ11TPAYqyZj-csrd2KCiXCoYX4lf6_oQ";

function json(body, status = 200, headers = {}) {
    return Response.json(body, { status, headers });
}

function errorResponse(error) {
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
        ? error.status
        : 500;
    return json({
        success: false,
        error: status >= 500 ? "Đã xảy ra lỗi máy chủ." : error.message,
    }, status);
}

async function readJson(request) {
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 16 * 1024) {
        const error = new Error("Request body is too large.");
        error.status = 413;
        throw error;
    }
    try {
        const value = await request.json();
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("Invalid JSON object.");
        }
        return value;
    } catch (error) {
        if (error.status) throw error;
        const invalid = new Error("Yêu cầu không hợp lệ.");
        invalid.status = 400;
        throw invalid;
    }
}

function validIdentifier(value) {
    return typeof value === "string" &&
        value.trim().length > 0 &&
        value.trim().length <= 254;
}

function validPassword(value) {
    return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

function validEmail(value) {
    return typeof value === "string" &&
        value.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validName(value) {
    return typeof value === "string" &&
        value.trim().length > 0 &&
        value.trim().length <= 120 &&
        !/[\r\n]/.test(value);
}

function validStudentId(value) {
    return typeof value === "string" && /^[A-Za-z0-9._-]{3,30}$/.test(value);
}

function positiveInteger(value, fallback, maximum) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0
        ? Math.min(parsed, maximum)
        : fallback;
}

function finiteNumber(value) {
    if (
        (typeof value !== "number" && typeof value !== "string") ||
        (typeof value === "string" && value.trim() === "")
    ) return Number.NaN;
    return Number(value);
}

function demoStudentInput(body) {
    const studentId = typeof body.student_id === "string"
        ? body.student_id.trim().toUpperCase()
        : "";
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const className = typeof body.class_name === "string" ? body.class_name.trim() : "";
    const numbers = [
        "attendance_rate",
        "study_hours",
        "assignment_score",
        "quiz_score",
        "completion_rate",
        "previous_score",
    ];
    const values = Object.fromEntries(numbers.map((key) => [key, finiteNumber(body[key])]));
    if (
        !/^DEMO-[A-Z0-9_-]{1,25}$/.test(studentId) ||
        !validName(fullName) ||
        !/^Sinh viên DEMO \d{3,}$/i.test(fullName) ||
        !validName(className) ||
        !Number.isFinite(values.attendance_rate) ||
        values.attendance_rate < 0 ||
        values.attendance_rate > 1 ||
        !Number.isFinite(values.study_hours) ||
        values.study_hours < 0 ||
        values.study_hours > 40 ||
        !Number.isFinite(values.completion_rate) ||
        values.completion_rate < 0 ||
        values.completion_rate > 1 ||
        ["assignment_score", "quiz_score", "previous_score"].some(
            (key) => !Number.isFinite(values[key]) || values[key] < 0 || values[key] > 10,
        )
    ) return null;

    return { student_id: studentId, full_name: fullName, class_name: className, ...values };
}

async function getDemoStudents(env) {
    const result = await env.DB.prepare(`
        SELECT student_id, full_name, class_name, attendance_rate, study_hours,
               assignment_score, quiz_score, completion_rate, previous_score,
               created_at
        FROM demo_students
        ORDER BY created_at DESC
        LIMIT 500
    `).all();
    return result.results || [];
}

async function getDemoRecords(env) {
    let result;
    try {
        result = await env.DB.prepare(`
            SELECT student_id, full_name, class_name, course_id, course_name,
                   attendance_rate, study_hours, assignment_score, quiz_score,
                   completion_rate, previous_score, final_score, predicted_score,
                   risk_level, is_seed_data, created_at
            FROM demo_course_records
            ORDER BY student_id, course_id
        `).all();
    } catch (error) {
        if (error.message?.includes("demo_course_records")) {
            const migrationError = new Error(
                "D1 chưa có dữ liệu điểm DEMO. Hãy áp dụng migration 0006_seed_demo_scores_and_learning_paths.sql.",
            );
            migrationError.status = 503;
            throw migrationError;
        }
        throw error;
    }
    const records = result.results || [];
    if (records.length < 240) {
        const error = new Error(
            "D1 chưa có đủ dữ liệu điểm DEMO. Hãy áp dụng migration 0006_seed_demo_scores_and_learning_paths.sql.",
        );
        error.status = 503;
        throw error;
    }
    return records;
}

function filterDemoStudents(students, url) {
    const search = (url.searchParams.get("search") || "").trim().toLocaleLowerCase("vi");
    const cohort = url.searchParams.get("cohort") || "";
    const faculty = url.searchParams.get("faculty") || "";
    const riskLevel = url.searchParams.get("risk_level") || "";
    const className = url.searchParams.get("class_name") || "";
    const sortBy = url.searchParams.get("sort_by") || "newest";
    if (search.length > 120 || !["newest", "id_asc", "name_asc"].includes(sortBy)) {
        return null;
    }

    const filtered = students.filter((student) => (
        (!search ||
            student.student_id.toLocaleLowerCase("vi").includes(search) ||
            student.full_name.toLocaleLowerCase("vi").includes(search) ||
            student.class_name.toLocaleLowerCase("vi").includes(search)) &&
        (!cohort || student.class_name.startsWith(cohort)) &&
        (!faculty || student.class_name.includes(faculty)) &&
        (!className ||
            student.class_name === className ||
            student.class_name.startsWith(`${className}-`) ||
            student.class_name.split("-").includes(className)) &&
        (!riskLevel || student.risk_level === riskLevel)
    ));
    filtered.sort((left, right) => {
        if (sortBy === "id_asc") return left.student_id.localeCompare(right.student_id);
        if (sortBy === "name_asc") return left.full_name.localeCompare(right.full_name, "vi");
        return String(right.created_at || "").localeCompare(String(left.created_at || ""));
    });
    return filtered;
}

function predictionInput(body) {
    const keys = [
        "attendance_rate",
        "study_hours",
        "assignment_score",
        "quiz_score",
        "completion_rate",
        "previous_score",
    ];
    const values = Object.fromEntries(keys.map((key) => [key, finiteNumber(body[key])]));
    if (
        (body.student_id !== undefined &&
            (typeof body.student_id !== "string" ||
                !/^DEMO-[A-Z0-9_-]{1,25}$/i.test(body.student_id))) ||
        !Number.isFinite(values.attendance_rate) ||
        values.attendance_rate < 0 ||
        values.attendance_rate > 1 ||
        !Number.isFinite(values.study_hours) ||
        values.study_hours < 0 ||
        values.study_hours > 40 ||
        !Number.isFinite(values.completion_rate) ||
        values.completion_rate < 0 ||
        values.completion_rate > 1 ||
        ["assignment_score", "quiz_score", "previous_score"].some(
            (key) => !Number.isFinite(values[key]) || values[key] < 0 || values[key] > 10,
        )
    ) return null;
    return values;
}

async function rateLimit(env, request, scope, limit) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const bytes = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${scope}:${ip}`),
    );
    const key = Array.from(new Uint8Array(bytes), (byte) =>
        byte.toString(16).padStart(2, "0"),
    ).join("");
    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / RATE_WINDOW_SECONDS) * RATE_WINDOW_SECONDS;
    await env.DB.prepare(`
        INSERT INTO auth_rate_limits (key, window_start, request_count)
        VALUES (?, ?, 1)
        ON CONFLICT(key) DO UPDATE SET
            request_count = CASE
                WHEN auth_rate_limits.window_start = excluded.window_start
                THEN auth_rate_limits.request_count + 1
                ELSE 1
            END,
            window_start = excluded.window_start
    `).bind(key, windowStart).run();
    const row = await env.DB.prepare(
        "SELECT request_count FROM auth_rate_limits WHERE key = ?",
    ).bind(key).first();
    if (row.request_count > limit) {
        const error = new Error("Quá nhiều yêu cầu. Hãy thử lại sau 15 phút.");
        error.status = 429;
        throw error;
    }
}

function randomCode() {
    const values = new Uint32Array(1);
    const ceiling = Math.floor(0x100000000 / 1_000_000) * 1_000_000;
    do {
        crypto.getRandomValues(values);
    } while (values[0] >= ceiling);
    return String(values[0] % 1_000_000).padStart(6, "0");
}

async function hashResetCode(env, userId, code) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(env.SESSION_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(`${userId}:${code}`),
    );
    return Array.from(new Uint8Array(signature), (byte) =>
        byte.toString(16).padStart(2, "0"),
    ).join("");
}

async function getUserByIdentifier(env, identifier) {
    return env.DB.prepare(`
        SELECT id, email, name, picture, role, student_id, password_hash,
               status, google_sub, must_change_password, auth_version,
               password_email_sent_at
        FROM users
        WHERE lower(email) = lower(?)
           OR upper(student_id) = upper(?)
           OR id = ?
        LIMIT 1
    `).bind(identifier, identifier, identifier).first();
}

async function requireRole(request, env, roles, { allowMustChangePassword = false } = {}) {
    const session = await getSession(request, env);
    if (!session) {
        const error = new Error("Vui lòng đăng nhập để tiếp tục.");
        error.status = 401;
        throw error;
    }
    if (session.user.mustChangePassword && !allowMustChangePassword) {
        const error = new Error("Bạn cần đổi mật khẩu tạm thời trước khi tiếp tục.");
        error.status = 403;
        throw error;
    }
    if (!roles.includes(session.user.role)) {
        const error = new Error("Bạn không có quyền thực hiện thao tác này.");
        error.status = 403;
        throw error;
    }
    return session;
}

function adminUser(record) {
    return {
        id: record.id,
        email: record.email,
        name: record.name,
        role: record.role,
        studentId: record.student_id || "",
        status: record.status,
        mustChangePassword: Boolean(record.must_change_password),
        createdAt: record.created_at,
    };
}

async function invokeStorage(path, request, env, method, body, extraHeaders = {}) {
    const headers = new Headers({
        Authorization: "Bearer pages-function-internal",
        ...extraHeaders,
    });
    const storageRequest = new Request(new URL(path, request.url), {
        method,
        headers,
        body,
    });
    return handleStorageRequest(storageRequest, {
        ...env,
        LEARNWISE_API_SECRET: "pages-function-internal",
    });
}

function invokeLearningPath(path, request, env, method, body) {
    const headers = new Headers({
        Authorization: "Bearer pages-function-internal",
    });
    const init = { method, headers };
    if (body !== undefined) {
        headers.set("Content-Type", "application/json");
        init.body = JSON.stringify(body);
    }
    return handleLearningPathRequest(
        new Request(new URL(path, request.url), init),
        { ...env, LEARNWISE_API_SECRET: "pages-function-internal" },
    );
}

async function handleLogin(request, env) {
    await rateLimit(env, request, "login", 10);
    const { identifier, password } = await readJson(request);
    if (!validIdentifier(identifier) || typeof password !== "string" || password.length > 128) {
        return json({ success: false, error: "Thông tin đăng nhập không hợp lệ." }, 400);
    }
    const record = await getUserByIdentifier(env, identifier.trim());
    const storedHash = record?.password_hash || DUMMY_PASSWORD_HASH;
    if (!await verifyPassword(password, storedHash)) {
        return json({
            success: false,
            error: "Mã sinh viên/email hoặc mật khẩu không chính xác.",
        }, 401);
    }
    if (!record || !record.password_hash) {
        return json({
            success: false,
            error: "Mã sinh viên/email hoặc mật khẩu không chính xác.",
        }, 401);
    }
    if (record.status === "pending" || record.role === "pending") {
        return json({
            success: false,
            code: "ACCOUNT_PENDING",
            error: "Tài khoản đang chờ quản trị viên duyệt và cấp vai trò.",
        }, 403);
    }
    if (record.status !== "active") {
        return json({ success: false, error: "Tài khoản đã bị tạm khóa." }, 403);
    }
    const mustChangePassword = Boolean(record.must_change_password);
    const token = await issueSession(env, record, mustChangePassword);
    const headers = new Headers({ "Cache-Control": "no-store" });
    appendSessionCookie(
        headers,
        cookieNames(request).session,
        token,
        60 * 60,
        request,
    );
    return json({
        success: true,
        user: publicUser(record, mustChangePassword),
    }, 200, headers);
}

async function handleForgotPassword(request, env) {
    await rateLimit(env, request, "password-reset", 5);
    if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
        return json({
            success: false,
            error: "Chức năng email chưa được cấu hình cho production.",
        }, 503);
    }
    const { identifier } = await readJson(request);
    if (!validIdentifier(identifier)) {
        return json({
            success: false,
            error: "Vui lòng nhập email hoặc mã sinh viên hợp lệ.",
        }, 400);
    }
    if (!/^Sinh viên DEMO \d{3,}$/i.test(body.full_name.trim())) {
        return json({
            success: false,
            error: "Tên trong chế độ DEMO phải theo dạng “Sinh viên DEMO 061”.",
        }, 400);
    }
    const record = await getUserByIdentifier(env, identifier.trim());
    if (!record || record.status === "suspended") {
        return json({
            success: true,
            message: "Nếu tài khoản tồn tại và đang hoạt động, mã xác nhận sẽ được gửi qua email.",
        });
    }
    const code = randomCode();
    const codeHash = await hashResetCode(env, record.id, code);
    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;
    await env.DB.prepare(`
        INSERT INTO password_reset_tokens (user_id, code_hash, expires_at, attempt_count, created_at)
        VALUES (?, ?, ?, 0, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            code_hash = excluded.code_hash,
            expires_at = excluded.expires_at,
            attempt_count = 0,
            created_at = excluded.created_at
    `).bind(record.id, codeHash, expiresAt, Math.floor(Date.now() / 1000)).run();
    try {
        await sendPasswordResetCode(env, record.email, record.name, code);
    } catch (error) {
        await env.DB.prepare(
            "DELETE FROM password_reset_tokens WHERE user_id = ? AND code_hash = ?",
        ).bind(record.id, codeHash).run();
        throw error;
    }
    return json({
        success: true,
        message: "Nếu tài khoản tồn tại và đang hoạt động, mã xác nhận sẽ được gửi qua email.",
    });
}

async function handleResetPassword(request, env) {
    await rateLimit(env, request, "password-reset-verify", 10);
    const { identifier, code, newPassword } = await readJson(request);
    if (
        !validIdentifier(identifier) ||
        typeof code !== "string" ||
        !/^\d{6}$/.test(code) ||
        !validPassword(newPassword)
    ) {
        return json({
            success: false,
            error: "Vui lòng kiểm tra mã xác nhận và mật khẩu (tối thiểu 8 ký tự).",
        }, 400);
    }
    const record = await getUserByIdentifier(env, identifier.trim());
    if (!record || record.status === "suspended") {
        return json({ success: false, error: "Mã xác nhận không hợp lệ hoặc đã hết hạn." }, 400);
    }
    const token = await env.DB.prepare(`
        SELECT code_hash, expires_at, attempt_count
        FROM password_reset_tokens WHERE user_id = ?
    `).bind(record.id).first();
    const expectedHash = await hashResetCode(env, record.id, code);
    if (
        !token ||
        token.expires_at <= Math.floor(Date.now() / 1000) ||
        token.attempt_count >= 5
    ) {
        if (token) {
            await env.DB.prepare(
                "DELETE FROM password_reset_tokens WHERE user_id = ?",
            ).bind(record.id).run();
        }
        return json({ success: false, error: "Mã xác nhận không hợp lệ hoặc đã hết hạn." }, 400);
    }
    if (token.code_hash !== expectedHash) {
        await env.DB.prepare(`
            UPDATE password_reset_tokens
            SET attempt_count = attempt_count + 1
            WHERE user_id = ?
        `).bind(record.id).run();
        return json({ success: false, error: "Mã xác nhận không hợp lệ hoặc đã hết hạn." }, 400);
    }
    const passwordHash = await hashPassword(newPassword);
    const result = await env.DB.batch([
        env.DB.prepare(`
            UPDATE users
            SET password_hash = ?, must_change_password = 0,
                password_email_sent_at = COALESCE(password_email_sent_at, CURRENT_TIMESTAMP),
                password_email_claimed_at = NULL,
                auth_version = auth_version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'active'
        `).bind(passwordHash, record.id),
        env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").bind(record.id),
    ]);
    if (!result[0].meta.changes) {
        return json({ success: false, error: "Tài khoản không còn hoạt động." }, 403);
    }
    const headers = new Headers();
    appendSessionCookie(headers, cookieNames(request).session, "", 0, request);
    return json({
        success: true,
        message: "Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
    }, 200, headers);
}

async function handleChangePassword(request, env) {
    const session = await requireRole(
        request,
        env,
        ["student", "lecturer", "admin"],
        { allowMustChangePassword: true },
    );
    const { currentPassword, newPassword } = await readJson(request);
    const record = session.record;
    if (
        typeof currentPassword !== "string" ||
        currentPassword.length > 128 ||
        !validPassword(newPassword)
    ) {
        return json({ success: false, error: "Mật khẩu mới phải có ít nhất 8 ký tự." }, 400);
    }
    if (!record.password_hash || !await verifyPassword(currentPassword, record.password_hash)) {
        return json({ success: false, error: "Mật khẩu hiện tại không chính xác." }, 400);
    }
    const result = await env.DB.prepare(`
        UPDATE users
        SET password_hash = ?, must_change_password = 0,
            password_email_sent_at = COALESCE(password_email_sent_at, CURRENT_TIMESTAMP),
            password_email_claimed_at = NULL,
            auth_version = auth_version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND password_hash = ? AND status = 'active'
    `).bind(await hashPassword(newPassword), record.id, record.password_hash).run();
    if (result.meta.changes !== 1) {
        return json({
            success: false,
            error: "Mật khẩu tài khoản đã thay đổi. Vui lòng đăng nhập lại.",
        }, 409);
    }
    const updated = await getUserByIdentifier(env, record.id);
    const token = await issueSession(env, updated);
    const headers = new Headers();
    appendSessionCookie(
        headers,
        cookieNames(request).session,
        token,
        60 * 60,
        request,
    );
    return json({ success: true, user: publicUser(updated) }, 200, headers);
}

async function handleAdmin(request, env, url, method, userId) {
    const session = await requireRole(request, env, ["admin"]);
    if (method === "GET" && url.pathname === "/api/admin/users") {
        const result = await env.DB.prepare(`
            SELECT id, email, name, role, student_id, status,
                   must_change_password, created_at
            FROM users ORDER BY created_at DESC LIMIT 500
        `).all();
        return json({ success: true, users: (result.results || []).map(adminUser) }, 200, {
            "Cache-Control": "no-store",
        });
    }
    if (method === "POST" && url.pathname === "/api/admin/users") {
        if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
            return json({
                success: false,
                error: "Chưa cấu hình email gửi mật khẩu cho production.",
            }, 503);
        }
        const { email, name, role, studentId } = await readJson(request);
        if (
            !validEmail(email) ||
            !validName(name) ||
            !["student", "lecturer"].includes(role) ||
            (role === "student" && !validStudentId(studentId))
        ) {
            return json({ success: false, error: "Thông tin tài khoản không hợp lệ." }, 400);
        }
        const temporaryPassword = Array.from(
            crypto.getRandomValues(new Uint8Array(24)),
            (byte) => byte.toString(16).padStart(2, "0"),
        ).join("");
        const result = await handleUserRequest(
            new Request(new URL("/internal/users", request.url), {
                method: "POST",
                headers: {
                    Authorization: "Bearer pages-function-internal",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: crypto.randomUUID(),
                    email: email.trim().toLowerCase(),
                    name: name.trim(),
                    role,
                    student_id: role === "student" ? studentId.trim() : null,
                    password_hash: await hashPassword(temporaryPassword),
                }),
            }),
            {
                ...env,
                LEARNWISE_API_SECRET: "pages-function-internal",
            },
        );
        const body = await result.json();
        if (!result.ok) {
            const error = new Error(body.error || "Unable to create account.");
            error.status = result.status;
            throw error;
        }
        try {
            await sendTemporaryPassword(env, body.user.email, body.user.name, temporaryPassword);
            await env.DB.prepare(`
                UPDATE users
                SET password_email_sent_at = CURRENT_TIMESTAMP,
                    password_email_claimed_at = NULL
                WHERE id = ?
            `).bind(body.user.id).run();
        } catch {
            await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(body.user.id).run();
            throw new Error("Không thể gửi mật khẩu; tài khoản chưa được tạo.");
        }
        return json({
            success: true,
            user: adminUser(body.user),
            emailSent: true,
        }, 201);
    }
    if (method === "PATCH" && userId) {
        if (userId === session.user.id) {
            return json({
                success: false,
                error: "Không thể tự thay đổi quyền hoặc trạng thái tài khoản đang đăng nhập.",
            }, 403);
        }
        const { role, status, studentId } = await readJson(request);
        const studentIdValue = role === "student" ? studentId || null : null;
        const result = await handleUserRequest(
            new Request(new URL(`/internal/users/${encodeURIComponent(userId)}`, request.url), {
                method: "PATCH",
                headers: {
                    Authorization: "Bearer pages-function-internal",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    role,
                    status,
                    student_id: studentIdValue,
                }),
            }),
            {
                ...env,
                LEARNWISE_API_SECRET: "pages-function-internal",
            },
        );
        const body = await result.json();
        return json(
            result.ok
                ? { success: true, user: adminUser(body.user) }
                : { success: false, error: body.error || "Unable to update account." },
            result.status,
        );
    }
    return null;
}

async function handleRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    if (method === "GET" && path === "/api/app-config") {
        const validSessionSecret =
            typeof env.SESSION_SECRET === "string" &&
            new TextEncoder().encode(env.SESSION_SECRET).byteLength >= 32;
        const missingSettings = [
            ["GOOGLE_CLIENT_ID", env.GOOGLE_CLIENT_ID],
            ["GOOGLE_CLIENT_SECRET", env.GOOGLE_CLIENT_SECRET],
            ["SESSION_SECRET", validSessionSecret],
            ["GOOGLE_REDIRECT_URI", env.GOOGLE_REDIRECT_URI],
        ].filter(([, value]) => !value).map(([name]) => name);
        return json({
            googleEnabled: missingSettings.length === 0,
            missingSettings,
            mailEnabled: Boolean(env.RESEND_API_KEY && env.MAIL_FROM),
        });
    }
    if (method === "GET" && path === "/api/me") {
        const session = await getSession(request, env);
        const headers = new Headers({ "Cache-Control": "no-store" });
        if (!session && readCookies(request)[cookieNames(request).session]) {
            appendSessionCookie(
                headers,
                cookieNames(request).session,
                "",
                0,
                request,
            );
        }
        return json({ user: session?.user || null }, 200, headers);
    }
    if (method === "POST" && path === "/api/auth/login") {
        return handleLogin(request, env);
    }
    if (method === "POST" && path === "/api/auth/forgot-password") {
        return handleForgotPassword(request, env);
    }
    if (method === "POST" && path === "/api/auth/reset-password") {
        return handleResetPassword(request, env);
    }
    if (method === "POST" && path === "/api/auth/change-password") {
        return handleChangePassword(request, env);
    }
    if (
        path === "/api/admin/users" ||
        /^\/api\/admin\/users\/[^/]+$/.test(path)
    ) {
        const userId = path.match(/^\/api\/admin\/users\/([^/]+)$/)?.[1];
        const response = await handleAdmin(request, env, url, method, userId);
        if (response) return response;
    }
    if (method === "GET" && path === "/api/profile") {
        const session = await requireRole(request, env, ["student", "lecturer", "admin"]);
        return json({ user: session.user }, 200, { "Cache-Control": "no-store" });
    }
    if (method === "PATCH" && path === "/api/profile") {
        const session = await requireRole(request, env, ["student", "lecturer", "admin"]);
        const { name } = await readJson(request);
        if (!validName(name)) {
            return json({
                success: false,
                error: "Họ tên phải có từ 1 đến 120 ký tự.",
            }, 400);
        }
        const result = await env.DB.prepare(`
            UPDATE users
            SET name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'active'
        `).bind(name.trim(), session.record.id).run();
        if (result.meta?.changes !== 1) {
            return json({
                success: false,
                error: "Không tìm thấy tài khoản đang hoạt động.",
            }, 404);
        }
        const record = await getUserByIdentifier(env, session.record.id);
        return json({
            success: true,
            user: publicUser(record),
        }, 200, { "Cache-Control": "no-store" });
    }
    if (method === "GET" && path === "/api/cloudflare/health") {
        await requireRole(request, env, ["admin"]);
        const [result] = await Promise.all([
            env.DB.prepare("SELECT 1 AS connected").first(),
            env.STORAGE.list({ limit: 1 }),
        ]);
        return json({
            success: true,
            database: "connected",
            storage: "connected",
            result,
        });
    }
    if (method === "POST" && path === "/api/data/import") {
        await requireRole(request, env, ["admin", "lecturer"]);
        const size = Number(request.headers.get("Content-Length") || 0);
        if (size > 10 * 1024 * 1024) {
            return json({ success: false, error: "CSV file exceeds the 10 MB limit." }, 413);
        }
        const body = await request.arrayBuffer();
        if (!body.byteLength || body.byteLength > 10 * 1024 * 1024) {
            return json({ success: false, error: "CSV file is empty or exceeds the 10 MB limit." }, 400);
        }
        const response = await invokeStorage(
            "/internal/storage/objects",
            request,
            env,
            "POST",
            body,
            {
                "Content-Type": request.headers.get("Content-Type") || "",
                "Content-Length": String(body.byteLength),
                "X-File-Name": request.headers.get("X-File-Name") || "",
            },
        );
        const result = await response.json();
        return json(
            response.ok
                ? {
                    success: true,
                    r2_key: result.key,
                    filename: result.filename,
                    size: result.size,
                    uploaded_at: result.uploaded_at,
                }
                : { success: false, error: result.error },
            response.status,
        );
    }
    if (method === "GET" && path === "/api/dashboard/overview") {
        await requireRole(request, env, ["student", "lecturer", "admin"]);
        const [demoStudents, demoRecords] = await Promise.all([
            getDemoStudents(env),
            getDemoRecords(env),
        ]);
        return json(createDemoDashboardOverview({
            className: url.searchParams.get("class_name") || undefined,
            courseId: url.searchParams.get("course_id") || undefined,
        }, demoStudents, demoRecords), 200, { "Cache-Control": "no-store" });
    }
    if (method === "GET" && path === "/api/analytics") {
        await requireRole(request, env, ["student", "lecturer", "admin"]);
        const [demoStudents, demoRecords] = await Promise.all([
            getDemoStudents(env),
            getDemoRecords(env),
        ]);
        return json(createDemoAnalytics(demoStudents, demoRecords), 200, { "Cache-Control": "no-store" });
    }
    if (path === "/api/students" && method === "GET") {
        await requireRole(request, env, ["admin", "lecturer"]);
        const [demoStudents, demoRecords] = await Promise.all([
            getDemoStudents(env),
            getDemoRecords(env),
        ]);
        const students = filterDemoStudents(
            createDemoStudentList(demoStudents, demoRecords),
            url,
        );
        if (!students) {
            return json({
                success: false,
                error: "Bộ lọc sinh viên không hợp lệ.",
            }, 400);
        }
        const page = positiveInteger(url.searchParams.get("page"), 1, 10000);
        const limit = positiveInteger(url.searchParams.get("limit"), 50, 100);
        const total = students.length;
        return json({
            success: true,
            data_mode: "synthetic_demo",
            students: students.slice((page - 1) * limit, page * limit),
            pagination: {
                total_pages: Math.ceil(total / limit),
                total,
            },
        }, 200, { "Cache-Control": "no-store" });
    }
    if (path === "/api/students" && method === "POST") {
        await requireRole(request, env, ["admin", "lecturer"]);
        const student = demoStudentInput(await readJson(request));
        if (!student) {
            return json({
                success: false,
                error: "Chỉ chấp nhận mã DEMO-*, tên “Sinh viên DEMO 061” và các chỉ số hợp lệ.",
            }, 400);
        }
        const seededStudent = await env.DB.prepare(`
            SELECT 1 AS seeded
            FROM demo_course_records
            WHERE student_id = ?
            LIMIT 1
        `).bind(student.student_id).first();
        if (seededStudent) {
            return json({
                success: false,
                error: "Mã sinh viên DEMO này đã tồn tại.",
            }, 409);
        }
        const result = await env.DB.prepare(`
            INSERT INTO demo_students (
                student_id, full_name, class_name, attendance_rate, study_hours,
                assignment_score, quiz_score, completion_rate, previous_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(student_id) DO NOTHING
        `).bind(
            student.student_id,
            student.full_name,
            student.class_name,
            student.attendance_rate,
            student.study_hours,
            student.assignment_score,
            student.quiz_score,
            student.completion_rate,
            student.previous_score,
        ).run();
        if (!result.meta?.changes) {
            return json({
                success: false,
                error: "Mã sinh viên DEMO này đã tồn tại.",
            }, 409);
        }
        return json({ success: true, data_mode: "synthetic_demo" }, 201);
    }
    const studentRoute = path.match(/^\/api\/students\/([^/]+)$/);
    if (studentRoute && method === "GET") {
        await requireRole(request, env, ["admin", "lecturer"]);
        const studentId = decodeURIComponent(studentRoute[1]);
        const [demoStudents, demoRecords] = await Promise.all([
            getDemoStudents(env),
            getDemoRecords(env),
        ]);
        const details = createDemoStudentDetails(studentId, demoStudents, demoRecords);
        return details
            ? json(details, 200, { "Cache-Control": "no-store" })
            : json({ success: false, error: "Không tìm thấy sinh viên DEMO." }, 404);
    }
    if (studentRoute && method === "PUT") {
        await requireRole(request, env, ["admin", "lecturer"]);
        const studentId = decodeURIComponent(studentRoute[1]);
        const body = await readJson(request);
        if (!validName(body.full_name) || !validName(body.class_name)) {
            return json({
                success: false,
                error: "Tên và lớp sinh viên không hợp lệ.",
            }, 400);
        }
        const result = await env.DB.prepare(`
            UPDATE demo_students
            SET full_name = ?, class_name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE student_id = ?
        `).bind(body.full_name.trim(), body.class_name.trim(), studentId).run();
        if (!result.meta?.changes) {
            const isSeed = createDemoStudentDetails(studentId);
            return isSeed
                ? json({
                    success: false,
                    error: "Không thể sửa bản ghi DEMO mẫu được tạo sẵn.",
                }, 403)
                : json({ success: false, error: "Không tìm thấy sinh viên DEMO." }, 404);
        }
        return json({ success: true, data_mode: "synthetic_demo" });
    }
    if (studentRoute && method === "DELETE") {
        await requireRole(request, env, ["admin", "lecturer"]);
        const studentId = decodeURIComponent(studentRoute[1]);
        const result = await env.DB.prepare(
            "DELETE FROM demo_students WHERE student_id = ?",
        ).bind(studentId).run();
        if (!result.meta?.changes) {
            const isSeed = createDemoStudentDetails(studentId);
            return isSeed
                ? json({
                    success: false,
                    error: "Không thể xóa bản ghi DEMO mẫu được tạo sẵn.",
                }, 403)
                : json({ success: false, error: "Không tìm thấy sinh viên DEMO." }, 404);
        }
        return json({ success: true, data_mode: "synthetic_demo" });
    }
    if (method === "POST" && path === "/api/predict") {
        await requireRole(request, env, ["student", "lecturer", "admin"]);
        const input = predictionInput(await readJson(request));
        if (!input) {
            return json({
                success: false,
                error: "Chỉ nhận mã tham chiếu DEMO-* và các chỉ số dự đoán hợp lệ.",
            }, 400);
        }
        return json(createDemoPrediction(input), 200, { "Cache-Control": "no-store" });
    }
    if (method === "POST" && path === "/api/data/generate-demo-labels") {
        await requireRole(request, env, ["admin", "lecturer"]);
        const body = await readJson(request);
        if (typeof body.key !== "string" || !body.key) {
            return json({ success: false, error: "Hãy chọn một file CSV trong R2." }, 400);
        }
        const response = await invokeStorage(
            `/internal/storage/generate-demo-labels?key=${encodeURIComponent(body.key)}`,
            request,
            env,
            "POST",
        );
        return json(await response.json(), response.status, { "Cache-Control": "no-store" });
    }
    if (method === "GET" && path === "/api/data/import-history") {
        await requireRole(request, env, ["admin", "lecturer"]);
        const response = await invokeStorage(
            "/internal/storage/objects",
            request,
            env,
            "GET",
        );
        const result = await response.json();
        return json({
            success: true,
            history: (result.objects || []).map((object) => ({
                import_id: object.key,
                filename: object.filename,
                total_records: null,
                valid_records: null,
                invalid_records: null,
                r2_key: object.key,
                size: object.size,
                created_at: object.uploaded_at,
            })),
        }, 200, { "Cache-Control": "no-store" });
    }
    const learningPathRoute = path.match(/^\/api\/students\/([^/]+)\/learning-path$/);
    if (method === "GET" && learningPathRoute) {
        const session = await requireRole(request, env, ["student", "lecturer", "admin"]);
        let studentId;
        try {
            studentId = decodeURIComponent(learningPathRoute[1]);
        } catch {
            return json({ success: false, error: "Mã sinh viên không hợp lệ." }, 400);
        }
        if (session.user.role === "student" && session.user.studentId !== studentId) {
            return json({ success: false, error: "Bạn chỉ được xem lộ trình của mình." }, 403);
        }
        return invokeLearningPath(
            `/internal/learning-path/students/${encodeURIComponent(studentId)}`,
            request,
            env,
            "GET",
        );
    }
    const updateLearningPathRoute = path.match(/^\/api\/learning-path\/(\d+)$/);
    if (method === "PATCH" && updateLearningPathRoute) {
        const session = await requireRole(request, env, ["student", "lecturer", "admin"]);
        const pathId = Number(updateLearningPathRoute[1]);
        const studentId = demoStudentIdForPathId(pathId);
        if (!studentId) {
            return json({ success: false, error: "Mã lộ trình không hợp lệ." }, 400);
        }
        if (session.user.role === "student" && session.user.studentId !== studentId) {
            return json({ success: false, error: "Bạn chỉ được cập nhật lộ trình của mình." }, 403);
        }
        const body = await readJson(request);
        return invokeLearningPath(
            `/internal/learning-path/${pathId}`,
            request,
            env,
            "PATCH",
            body,
        );
    }
    if (method === "GET" && path === "/api/ml/model-info") {
        await requireRole(request, env, ["admin", "lecturer"]);
        const key = new URL(request.url).searchParams.get("key");
        if (!key) {
            return json({ success: false, error: "Hãy chọn một file CSV trong R2." }, 400);
        }
        const response = await invokeStorage(
            `/internal/storage/model-info?key=${encodeURIComponent(key || "")}`,
            request,
            env,
            "GET",
        );
        return json(await response.json(), response.status, { "Cache-Control": "no-store" });
    }
    if (path.startsWith("/api/learning-path") || /\/learning-path$/.test(path)) {
        await requireRole(request, env, ["student", "lecturer", "admin"]);
        return json({
            success: false,
            error: "Lộ trình học tập chưa khả dụng vì dữ liệu kết quả theo chủ đề chưa được tích hợp và xác thực.",
        }, 503);
    }
    if (path.startsWith("/api/")) {
        return json({ success: false, error: "API endpoint not found." }, 404);
    }
    return null;
}

export async function handlePublicApiRequest(context) {
    try {
        return await handleRequest(context);
    } catch (error) {
        console.error("Pages API request failed:", error.name || "Error");
        return errorResponse(error);
    }
}
