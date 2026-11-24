import assert from "node:assert/strict";
import test from "node:test";
import worker from "./index.js";
import { handleLearningPathRequest } from "./learning-paths.js";

function createEnv() {
    const statuses = new Map();
    const demoStudents = [];
    return {
        statuses,
        LEARNWISE_API_SECRET: "learning-path-test-secret",
        DB: {
            prepare(query) {
                let values = [];
                return {
                    bind(...args) {
                        values = args;
                        return this;
                    },
                    async all() {
                        if (query.includes("FROM demo_students")) {
                            return { results: demoStudents };
                        }
                        if (query.includes("FROM demo_learning_path_status")) {
                            return {
                                results: Array.from(statuses.values()).filter(
                                    (status) => status.student_id === values[0],
                                ),
                            };
                        }
                        throw new Error("Unexpected query.");
                    },
                    async run() {
                        statuses.set(`${values[0]}:${values[1]}`, {
                            student_id: values[0],
                            path_id: values[1],
                            status: values[2],
                        });
                        return { meta: { changes: 1 } };
                    },
                };
            },
        },
    };
}

function internalRequest(path, { method = "GET", body, authorized = true } = {}) {
    return new Request(`https://worker.example${path}`, {
        method,
        headers: {
            ...(authorized ? { Authorization: "Bearer learning-path-test-secret" } : {}),
            ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
}

test("demo learning-path endpoint requires the backend secret", async () => {
    const response = await handleLearningPathRequest(
        internalRequest("/internal/learning-path/students/DEMO-0001", { authorized: false }),
        createEnv(),
    );

    assert.equal(response.status, 401);
});

test("demo learning-path status persists and is returned on reload", async () => {
    const env = createEnv();
    const updateResponse = await handleLearningPathRequest(
        internalRequest("/internal/learning-path/11", {
            method: "PATCH",
            body: { status: "Đã hoàn thành" },
        }),
        env,
    );
    const getResponse = await handleLearningPathRequest(
        internalRequest("/internal/learning-path/students/DEMO-0001"),
        env,
    );
    const body = await getResponse.json();

    assert.equal(updateResponse.status, 200);
    assert.equal(getResponse.status, 200);
    assert.equal(body.data_mode, "synthetic_demo");
    assert.equal(body.learning_path[0].status, "Đã hoàn thành");
});

test("Worker routes authorized demo learning-path requests", async () => {
    const env = createEnv();
    const response = await worker.fetch(
        internalRequest("/internal/learning-path/students/DEMO-0001"),
        env,
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data_mode, "synthetic_demo");
    assert.equal(body.learning_path.length, 4);
});

test("demo learning-path endpoint rejects invalid and missing paths", async () => {
    const env = createEnv();
    const invalidUpdate = await handleLearningPathRequest(
        internalRequest("/internal/learning-path/19", {
            method: "PATCH",
            body: { status: "Đã hoàn thành" },
        }),
        env,
    );
    const missingStudent = await handleLearningPathRequest(
        internalRequest("/internal/learning-path/students/DEMO-9999"),
        env,
    );

    assert.equal(invalidUpdate.status, 400);
    assert.equal(missingStudent.status, 404);
});
