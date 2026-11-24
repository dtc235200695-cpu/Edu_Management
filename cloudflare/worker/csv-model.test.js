import assert from "node:assert/strict";
import test from "node:test";
import { createCsvModelInfo } from "./csv-model.js";

function makeCsv(reverseScores = false) {
    const header = [
        "student_id",
        "full_name",
        "attendance_rate",
        "study_hours",
        "assignment_score",
        "quiz_score",
        "completion_rate",
        "previous_score",
        "final_score",
    ];
    const rows = Array.from({ length: 10 }, (_, index) => {
        const score = reverseScores ? 9 - index * 0.5 : 4 + index * 0.5;
        return [
            `SV-${index + 1}`,
            `"Student, ${index + 1}"`,
            (0.5 + index * 0.04).toFixed(2),
            String(3 + index * 2),
            String(3 + index * 0.6),
            String(3.2 + index * 0.55),
            (0.45 + index * 0.05).toFixed(2),
            String(3.5 + index * 0.5),
            score.toFixed(1),
        ].join(",");
    });
    return [header.join(","), ...rows].join("\r\n");
}

test("CSV model metrics are computed for the selected dataset and test split", () => {
    const metrics = createCsvModelInfo(makeCsv(), "scores-a.csv");
    const repeatedMetrics = createCsvModelInfo(makeCsv(), "scores-a.csv");

    assert.equal(metrics.success, true);
    assert.equal(metrics.model_name, "EduInsight CSV Model - scores-a.csv");
    assert.equal(metrics.data_mode, "uploaded_csv");
    assert.equal(metrics.dataset_info.record_count, 10);
    assert.equal(metrics.actual_vs_predicted.length, 2);
    assert.equal(metrics.dataset_info.train_test_split, "8/2");
    assert.deepEqual(metrics.actual_vs_predicted, repeatedMetrics.actual_vs_predicted);
    assert.equal(metrics.classification_metrics.confusion_matrix.length, 3);
    assert.ok(Object.values(metrics.feature_importances).some((value) => value > 0));
});

test("CSV model metrics change when the selected CSV's target values change", () => {
    const first = createCsvModelInfo(makeCsv(), "scores-a.csv");
    const second = createCsvModelInfo(makeCsv(true), "scores-b.csv");

    assert.notDeepEqual(first.actual_vs_predicted, second.actual_vs_predicted);
});

test("CSV model rejects missing columns, invalid values, and undersized datasets", () => {
    assert.throws(
        () => createCsvModelInfo("attendance_rate,study_hours\n0.8,10", "bad.csv"),
        /thiếu cột bắt buộc/i,
    );
    assert.throws(
        () => createCsvModelInfo(
            `${makeCsv().split("\r\n")[0]}\r\nSV-1,"broken,0.8,10,7,7,0.8,7,7`,
            "bad.csv",
        ),
        /chưa đóng dấu ngoặc kép/i,
    );
    assert.throws(
        () => createCsvModelInfo(makeCsv().split("\r\n").slice(0, 5).join("\r\n"), "small.csv"),
        /ít nhất 5 dòng/i,
    );
    assert.throws(
        () => createCsvModelInfo(
            makeCsv().replace("0.50,3,3,3.2,0.45,3.5,4.0", "0.50,,3,3.2,0.45,3.5,4.0"),
            "empty-value.csv",
        ),
        /study_hours không hợp lệ/i,
    );
});
