import assert from "node:assert/strict";
import test from "node:test";
import {
    createDemoAnalytics,
    createDemoDashboardOverview,
} from "./demo-data.js";

test("demo dashboard returns deterministic synthetic aggregates", () => {
    const first = createDemoDashboardOverview();
    const second = createDemoDashboardOverview();

    assert.deepEqual(first, second);
    assert.equal(first.data_mode, "synthetic_demo");
    assert.equal(first.total_students, 60);
    assert.equal(first.total_courses, 4);
    assert.equal(first.risk_distribution.reduce((sum, item) => sum + item.count, 0), 60);
    assert.ok(first.students_needing_support.every((student) =>
        student.student_id.startsWith("DEMO-") &&
        student.full_name.includes("DEMO"),
    ));
});

test("demo dashboard filters by class and course", () => {
    const filtered = createDemoDashboardOverview({
        className: "K20",
        courseId: "DEMO-CS101",
    });

    assert.equal(filtered.total_students, 12);
    assert.equal(filtered.total_courses, 1);
    assert.ok(filtered.students_needing_support.every((student) =>
        student.class_name.startsWith("K20-"),
    ));
});

test("demo analytics exposes only generated demo records", () => {
    const analytics = createDemoAnalytics();

    assert.equal(analytics.data_mode, "synthetic_demo");
    assert.equal(analytics.study_hours_correlation.length, 240);
    assert.equal(analytics.attendance_correlation.length, 240);
    assert.equal(analytics.course_scores.length, 4);
});
