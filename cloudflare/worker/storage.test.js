import assert from "node:assert/strict";
import test from "node:test";
import { handleStorageRequest } from "./storage.js";

const csv = [
    "attendance_rate,study_hours,assignment_score,quiz_score,completion_rate,previous_score,final_score",
    "0.5,4,4,4,0.5,4,4",
    "0.6,6,5,5,0.6,5,5",
    "0.7,8,6,6,0.7,6,6",
    "0.8,10,7,7,0.8,7,7",
    "0.9,12,8,8,0.9,8,8",
].join("\n");
const validKey = "imports/2026/01/01/example-scores.csv";

function request(key, authorized = true) {
    const url = new URL("https://worker.example/internal/storage/model-info");
    if (key !== undefined) url.searchParams.set("key", key);
    return new Request(url, {
        headers: authorized ? { Authorization: "Bearer storage-test-secret" } : {},
    });
}

function environment(get) {
    return {
        LEARNWISE_API_SECRET: "storage-test-secret",
        STORAGE: { get },
    };
}

test("internal model-info returns only metrics for the selected private R2 object", async () => {
    const response = await handleStorageRequest(
        request(validKey),
        environment(async (key) => ({
            size: Buffer.byteLength(csv),
            customMetadata: { filename: "scores.csv" },
            text: async () => {
                assert.equal(key, validKey);
                return csv;
            },
        })),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.dataset_info.name, "scores.csv");
    assert.equal(body.dataset_info.record_count, 5);
    assert.equal("student_id" in body, false);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("internal model-info requires authorization and restricts keys to imports", async () => {
    const unauthorizedResponse = await handleStorageRequest(
        request(validKey, false),
        environment(async () => {
            throw new Error("storage must not be accessed");
        }),
    );
    const invalidKeyResponse = await handleStorageRequest(
        request("../private.csv"),
        environment(async () => {
            throw new Error("storage must not be accessed");
        }),
    );

    assert.equal(unauthorizedResponse.status, 401);
    assert.equal(invalidKeyResponse.status, 400);
});

test("internal model-info reports a missing R2 object", async () => {
    const response = await handleStorageRequest(
        request(validKey),
        environment(async () => null),
    );

    assert.equal(response.status, 404);
});

test("internal model-info rejects methods other than GET", async () => {
    const response = await handleStorageRequest(
        new Request(`https://worker.example/internal/storage/model-info?key=${validKey}`, {
            method: "POST",
            headers: { Authorization: "Bearer storage-test-secret" },
        }),
        environment(async () => {
            throw new Error("storage must not be accessed");
        }),
    );

    assert.equal(response.status, 405);
});
