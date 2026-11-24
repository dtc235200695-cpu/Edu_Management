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

async function requestAsAdmin(path, { method = "GET", body } = {}) {
    const env = {
        SESSION_SECRET: "demo-test-session-secret-with-more-than-32-bytes",
        DB: {
            prepare() {
                const statement = {
                    first: async () => user,
                    all: async () => ({ results: [] }),
                    run: async () => ({ meta: { changes: 1 } }),
                };
                return { ...statement, bind: () => statement };
            },
        },
    };
    const token = await issueSession(env, user);
    const request = new Request(`https://eduinsight.pages.dev${path}`, {
        method,
        headers: {
            Cookie: `__Host-learnwise_session=${token}`,
            ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
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

test("authenticated student list is paginated and labeled as synthetic", async () => {
    const response = await requestAsAdmin(
        "/api/students?sort_by=name_asc&page=1&limit=12",
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data_mode, "synthetic_demo");
    assert.equal(body.pagination.total, 60);
    assert.equal(body.students.length, 12);
    assert.ok(body.students.every((student) => student.full_name.includes("DEMO")));
});

test("authenticated student creation accepts only demo IDs and persists the record", async () => {
    const response = await requestAsAdmin("/api/students", {
        method: "POST",
        body: {
            student_id: "DEMO-0061",
            full_name: "Sinh viên DEMO 061",
            class_name: "K24-CNTT01",
            attendance_rate: "0.85",
            study_hours: "12",
            assignment_score: "7.5",
            quiz_score: "7",
            completion_rate: "0.8",
            previous_score: "7",
        },
    });

    assert.equal(response.status, 201);
    assert.equal((await response.json()).data_mode, "synthetic_demo");
});

test("student API rejects non-demo identifiers", async () => {
    const response = await requestAsAdmin("/api/students", {
        method: "POST",
        body: {
            student_id: "SV2026-61",
            full_name: "Sinh viên DEMO 061",
            class_name: "K24-CNTT01",
            attendance_rate: 0.85,
            study_hours: 12,
            assignment_score: 7.5,
            quiz_score: 7,
            completion_rate: 0.8,
            previous_score: 7,
        },
    });

    assert.equal(response.status, 400);
});

test("authenticated prediction API returns an explicitly labeled demo estimate", async () => {
    const response = await requestAsAdmin("/api/predict", {
        method: "POST",
        body: {
            attendance_rate: 0.85,
            study_hours: 12,
            assignment_score: 7.5,
            quiz_score: 7,
            completion_rate: 0.8,
            previous_score: 7.2,
        },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data_mode, "synthetic_demo");
    assert.equal(body.model_version, "demo-heuristic-v1");
    assert.ok(body.predicted_score >= 0 && body.predicted_score <= 10);
});

test("prediction API rejects real student identifiers in demo mode", async () => {
    const response = await requestAsAdmin("/api/predict", {
        method: "POST",
        body: {
            student_id: "SV2026-001",
            attendance_rate: 0.85,
            study_hours: 12,
            assignment_score: 7.5,
            quiz_score: 7,
            completion_rate: 0.8,
            previous_score: 7.2,
        },
    });

    assert.equal(response.status, 400);
});

test("authenticated staff can load explicitly labeled synthetic model metrics", async () => {
    const response = await requestAsAdmin("/api/ml/model-info");
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data_mode, "synthetic_demo");
    assert.equal(body.is_demo, true);
    assert.equal(body.model_name, "EduInsight Synthetic Learning Model");
    assert.equal(body.classification_metrics.confusion_matrix.length, 3);
});

test("learning paths remain unavailable until validated topic results exist", async () => {
    const response = await requestAsAdmin("/api/students/DEMO-0001/learning-path");
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.success, false);
    assert.match(body.error, /chưa khả dụng/i);
});
