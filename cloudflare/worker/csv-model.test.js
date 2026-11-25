import assert from "node:assert/strict";
import test from "node:test";
import { createCsvModelInfo, createDemoLabeledCsv } from "./csv-model.js";

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

function makeRiskOnlyCsv() {
    const header = [
        "student_id",
        "attendance_rate",
        "study_hours",
        "assignment_score",
        "quiz_score",
        "completion_rate",
        "previous_score",
        "risk_level",
    ];
    const rows = Array.from({ length: 10 }, (_, index) => [
        `SV-${index + 1}`,
        (0.5 + index * 0.04).toFixed(2),
        String(3 + index * 2),
        String(3 + index * 0.6),
        String(3.2 + index * 0.55),
        (0.45 + index * 0.05).toFixed(2),
        String(3.5 + index * 0.5),
        index < 3 ? "High Risk" : index < 7 ? "Medium" : "Low Risk",
    ].join(","));
    return [header.join(","), ...rows].join("\n");
}

function makeFeaturesOnlyCsv() {
    const header = [
        "student_id",
        "attendance_rate",
        "study_hours",
        "assignment_score",
        "quiz_score",
        "completion_rate",
        "previous_score",
    ];
    const rows = Array.from({ length: 10 }, (_, index) => [
        `SV-${index + 1}`,
        (0.5 + index * 0.04).toFixed(2),
        String(3 + index * 2),
        String(3 + index * 0.6),
        String(3.2 + index * 0.55),
        (0.45 + index * 0.05).toFixed(2),
        String(3.5 + index * 0.5),
    ].join(","));
    return [header.join(","), ...rows].join("\n");
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

test("risk-only CSV returns classification metrics without fabricated regression results", () => {
    const csv = makeRiskOnlyCsv()
        .replace("attendance_rate", "Attendance Rate")
        .replace("risk_level", "Risk Label");
    const metrics = createCsvModelInfo(csv, "risk-only.csv");

    assert.equal(metrics.regression_metrics, null);
    assert.equal(metrics.algorithm_regression, null);
    assert.equal(metrics.algorithm_classification, "Gaussian Naive Bayes");
    assert.equal(metrics.classification_metrics.confusion_matrix.length, 3);
    assert.equal(metrics.dataset_info.record_count, 10);
    assert.deepEqual(metrics.actual_vs_predicted, []);
    assert.match(metrics.metrics_notice, /không có final_score/i);
});

test("unlabeled CSV receives clearly disclosed demo risk labels from its features", () => {
    const metrics = createCsvModelInfo(makeFeaturesOnlyCsv(), "features-only.csv");

    assert.equal(metrics.regression_metrics, null);
    assert.equal(metrics.is_demo, true);
    assert.equal(metrics.model_version, "csv-nb-demo-v1");
    assert.equal(metrics.classification_metrics.confusion_matrix.length, 3);
    assert.deepEqual(metrics.actual_vs_predicted, []);
    assert.match(metrics.demo_notice, /ước tính bằng quy tắc demo/i);
    assert.match(metrics.metrics_notice, /không có ground truth/i);
});

test("demo labels treat percentage-formatted rates and scores consistently", () => {
    const [header, ...rows] = makeFeaturesOnlyCsv().split("\n");
    const headers = header.split(",");
    const percentCsv = [
        header,
        ...rows.map((row) => row.split(",").map((value, index) => {
            if (["attendance_rate", "completion_rate"].includes(headers[index])) {
                return String(Number(value) * 100);
            }
            if (["assignment_score", "quiz_score", "previous_score"].includes(headers[index])) {
                return String(Number(value) * 10);
            }
            return value;
        }).join(",")),
    ].join("\n");
    const labels = (csv) => createDemoLabeledCsv(csv).trim().split("\n").slice(1)
        .map((row) => row.split(",").at(-1));

    assert.deepEqual(labels(percentCsv), labels(makeFeaturesOnlyCsv()));
});

test("demo label generation creates a separate CSV column without changing source fields", () => {
    const source = makeFeaturesOnlyCsv();
    const labeled = createDemoLabeledCsv(source);
    const [header, ...rows] = labeled.trim().split(/\r?\n/);
    const metrics = createCsvModelInfo(labeled, "labeled.csv", {
        generatedRiskLabels: true,
        demoLabeledCopy: true,
    });

    assert.match(header, /,risk_level$/);
    assert.equal(rows.length, 10);
    assert.ok(rows.every((row) => /,(Cao|Trung bình|Thấp)$/.test(row)));
    assert.equal(metrics.demo_labeled_copy, true);
    assert.match(metrics.demo_notice, /không phải nhãn thực/i);
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
