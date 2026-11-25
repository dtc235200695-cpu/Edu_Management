import assert from "node:assert/strict";
import test from "node:test";
import { handleUserRequest } from "./users.js";

function createDb(existingUser = null) {
    let user = existingUser ? { ...existingUser } : null;
    return {
        prepare(sql) {
            return {
                bind(...values) {
                    return {
                        async first() {
                            if (sql.includes("WHERE lower(email) = ? OR google_sub = ?")) {
                                const [email, googleSub] = values;
                                return user && (
                                    user.email.toLowerCase() === email ||
                                    user.google_sub === googleSub
                                ) ? { ...user } : null;
                            }
                            if (sql.includes("FROM users WHERE id = ?")) {
                                return user?.id === values[0] ? { ...user } : null;
                            }
                            throw new Error("Unexpected query.");
                        },
                        async run() {
                            if (sql.includes("INSERT INTO users")) {
                                const [
                                    id, email, name, picture, role, status, googleSub,
                                    passwordHash,
                                    mustChangePassword,
                                ] = values;
                                user = {
                                    id,
                                    email,
                                    name,
                                    picture,
                                    role,
                                    status,
                                    google_sub: googleSub,
                                    password_hash: passwordHash,
                                    student_id: null,
                                    must_change_password: mustChangePassword,
                                    auth_version: 0,
                                    password_email_sent_at: null,
                                };
                                return { meta: { changes: 1 } };
                            }
                            if (sql.includes("SET google_sub = ?, picture = ?")) {
                                const [googleSub, picture, role, status, id] = values;
                                if (user?.id === id) {
                                    Object.assign(user, {
                                        google_sub: googleSub,
                                        picture,
                                        role,
                                        status,
                                    });
                                    return { meta: { changes: 1 } };
                                }
                                return { meta: { changes: 0 } };
                            }
                            if (sql.includes("SET name = ?, updated_at = CURRENT_TIMESTAMP")) {
                                const [name, id] = values;
                                if (user?.id === id && user.status === "active") {
                                    user.name = name;
                                    return { meta: { changes: 1 } };
                                }
                                return { meta: { changes: 0 } };
                            }
                            throw new Error("Unexpected query.");
                        },
                    };
                },
            };
        },
    };
}

async function signInWithGoogle(
    db,
    email,
    adminEmail = "admin@example.test",
    passwordHash = "scrypt$test-hash",
) {
    const request = new Request("https://worker.example/internal/users/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email,
            name: "Test User",
            google_sub: "google-sub-123",
            password_hash: passwordHash,
        }),
    });
    const response = await handleUserRequest(request, {
        DB: db,
        ADMIN_EMAIL: adminEmail,
    });
    return { response, body: await response.json() };
}

test("new Google users are active students", async () => {
    const { response, body } = await signInWithGoogle(
        createDb(),
        "student@example.test",
    );
    assert.equal(response.status, 200);
    assert.equal(body.user.role, "student");
    assert.equal(body.user.status, "active");
});

test("existing pending Google users are activated as students", async () => {
    const db = createDb({
        id: "pending-user",
        email: "student@example.test",
        name: "Existing Display Name",
        role: "pending",
        status: "pending",
        google_sub: null,
    });
    const { response, body } = await signInWithGoogle(db, "student@example.test");
    assert.equal(response.status, 200);
    assert.equal(body.user.role, "student");
    assert.equal(body.user.status, "active");
    assert.equal(body.user.name, "Existing Display Name");
});

test("users can update their own profile name without changing account permissions", async () => {
    const db = createDb({
        id: "profile-user",
        email: "student@example.test",
        name: "Old Name",
        role: "student",
        status: "active",
        student_id: "SV001",
    });
    const request = new Request("https://worker.example/internal/users/profile-user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
    });
    const response = await handleUserRequest(request, { DB: db });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.user.name, "New Name");
    assert.equal(body.user.role, "student");
    assert.equal(body.user.student_id, "SV001");
});

test("Google sign-in does not reactivate suspended accounts", async () => {
    const db = createDb({
        id: "suspended-user",
        email: "student@example.test",
        name: "Test User",
        role: "student",
        status: "suspended",
        google_sub: "google-sub-123",
    });
    const { response, body } = await signInWithGoogle(db, "student@example.test");
    assert.equal(response.status, 200);
    assert.equal(body.user.role, "student");
    assert.equal(body.user.status, "suspended");
});

test("configured administrator keeps the admin role", async () => {
    const { response, body } = await signInWithGoogle(
        createDb(),
        "admin@example.test",
    );
    assert.equal(response.status, 200);
    assert.equal(body.user.role, "admin");
    assert.equal(body.user.status, "active");
});

test("Google-only accounts do not require a generated temporary password", async () => {
    const { response, body } = await signInWithGoogle(
        createDb(),
        "student@example.test",
        "admin@example.test",
        null,
    );
    assert.equal(response.status, 200);
    assert.equal(body.user.role, "student");
    assert.equal(body.user.status, "active");
    assert.equal(body.user.password_hash, null);
    assert.equal(body.user.must_change_password, 0);
});
