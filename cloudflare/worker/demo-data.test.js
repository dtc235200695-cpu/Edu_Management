import assert from "node:assert/strict";
import test from "node:test";
import {
    createDemoAnalytics,
    createDemoDashboardOverview,
    createDemoStudentDetails,
    createDemoStudentList,
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

test("demo list and dashboard include persistent demo student entries", () => {
    const additionalStudent = {
        student_id: "DEMO-0061",
        full_name: "Sinh viên DEMO 061",
        class_name: "K24-CNTT01",
        attendance_rate: 0.85,
        study_hours: 12,
        assignment_score: 7.5,
        quiz_score: 7,
        completion_rate: 0.8,
        previous_score: 7,
        created_at: "2026-11-24 10:00:00",
    };

    const list = createDemoStudentList([additionalStudent]);
    const overview = createDemoDashboardOverview({}, [additionalStudent]);
    const details = createDemoStudentDetails("DEMO-0061", [additionalStudent]);

    assert.equal(list.length, 61);
    assert.equal(list.find((student) => student.student_id === "DEMO-0061").is_seed_data, false);
    assert.equal(overview.total_students, 61);
    assert.equal(details.student.student_id, "DEMO-0061");
    assert.equal(details.learning_records.length, 4);
});
