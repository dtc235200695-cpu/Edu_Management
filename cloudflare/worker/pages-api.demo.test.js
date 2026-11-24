import assert from "node:assert/strict";
import test from "node:test";
import { handlePublicApiRequest } from "./pages-api.js";
import { issueSession } from "./session.js";

const user = {
    id: "demo-test-admin",
    email: "demo-admin@example.test",
    name: "Demo Admin",
    picture: "",
    role: "admin",
    student_id: null,
    password_hash: null,
    status: "active",
    auth_version: 1,
    must_change_password: 0,
};

async function requestAsAdmin(path) {
    const env = {
        SESSION_SECRET: "demo-test-session-secret-with-more-than-32-bytes",
        DB: {
            prepare() {
                return {
                    bind() {
                        return { first: async () => user };
                    },
                };
            },
        },
    };
    const token = await issueSession(env, user);
    const request = new Request(`https://eduinsight.pages.dev${path}`, {
        headers: { Cookie: `__Host-learnwise_session=${token}` },
    });
    return handlePublicApiRequest({ request, env });
}

test("authenticated dashboard API returns labeled synthetic data", async () => {
    const response = await requestAsAdmin("/api/dashboard/overview?class_name=K20");
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data_mode, "synthetic_demo");
    assert.equal(body.total_students, 12);
});

test("authenticated analytics API returns labeled synthetic data", async () => {
    const response = await requestAsAdmin("/api/analytics");
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data_mode, "synthetic_demo");
    assert.equal(body.study_hours_correlation.length, 240);
});
